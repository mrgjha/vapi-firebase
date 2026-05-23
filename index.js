const express = require("express");
const admin = require("firebase-admin");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================================
   Middleware
========================================= */

app.use(express.json());

/* =========================================
   Firebase Configuration
========================================= */

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined,
};

/* =========================================
   Initialize Firebase
========================================= */

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

console.log("🔥 Firebase Connected");

/* =========================================
   Home Route
========================================= */

app.get("/", (req, res) => {
  res.send("🚀 Firestore API Running");
});

/* =========================================
   Firestore Test Route
========================================= */

app.get("/test-firestore", async (req, res) => {

  try {

    console.log("🧪 Testing Firestore Connection...");

    const snapshot = await db.collection("contacts").get();

    console.log("✅ Firestore Connected");
    console.log("📄 Total Documents:", snapshot.size);

    res.json({
      success: true,
      totalDocuments: snapshot.size,
    });

  } catch (error) {

    console.error("❌ Firestore Test Error:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/* =========================================
   Query Firestore Route
========================================= */

app.post("/queryFirestore", async (req, res) => {

  try {

    console.log("====================================");
    console.log("📥 Incoming Request");
    console.log("====================================");

    console.log("📦 Raw Body:", req.body);

    let value = req.body.value || "";

    console.log("📝 Original Value:", value);

    /* =====================================
       Clean Search Value
    ===================================== */

    const searchValue = value
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .replace(
        /\b(phone|number|contact|mobile|call|find|give|tell|me|can|you|please|show|get)\b/g,
        ""
      )
      .trim();

    console.log("🔍 Final Search Value:", searchValue);

    /* =====================================
       Validation
    ===================================== */

    if (!searchValue) {

      console.log("❌ Empty Search Value");

      return res.status(400).json({
        success: false,
        message: "Missing search value",
      });
    }

    /* =====================================
       Show All Contacts
    ===================================== */

    if (
      searchValue === "__all__" ||
      searchValue === "all" ||
      searchValue === "show all" ||
      searchValue === "all contacts" ||
      searchValue === "show database"
    ) {

      console.log("📚 Fetching ALL contacts");

      const snapshot = await db.collection("contacts").get();

      console.log("📄 Total Contacts Found:", snapshot.size);

      const contacts = [];

      snapshot.forEach((doc) => {

        const data = doc.data();

        console.log("👤 Contact:", data);

        contacts.push({
          id: doc.id,
          ...data,
        });
      });

      return res.json({
        success: true,
        contacts,
      });
    }

    /* =====================================
       Search Single Contact
    ===================================== */

    console.log("🔎 Starting Firestore Query...");

    const snapshot = await db
      .collection("contacts")
      .where("name_lower", "==", searchValue)
      .get();

    console.log("📄 Documents Found:", snapshot.size);

    /* =====================================
       No Results
    ===================================== */

    if (snapshot.empty) {

      console.log("❌ No Matching Contact Found");

      return res.json({
        success: false,
        message: "No matching document found",
      });
    }

    /* =====================================
       Extract First Result
    ===================================== */

    const doc = snapshot.docs[0];

    console.log("🆔 Document ID:", doc.id);

    const data = doc.data();

    console.log("✅ Firestore Data:", data);

    /* =====================================
       Final Response
    ===================================== */

    const finalResponse = {
      success: true,
      name: data.name || "",
      phone: data.phone || "",
      name_lower: data.name_lower || "",
    };

    console.log("🚀 Final API Response:", finalResponse);

    return res.json(finalResponse);

  } catch (error) {

    console.error("====================================");
    console.error("🔥 FIRESTORE ERROR");
    console.error("====================================");

    console.error(error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/* =========================================
   Start Server
========================================= */

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});