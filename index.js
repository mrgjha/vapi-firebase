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

    const snapshot = await db.collection("contacts").get();

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

    console.log("📥 Request Body:", req.body);

    let value = req.body.value || "";

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

    console.log("🔍 Searching for:", searchValue);

    /* =====================================
       Validation
    ===================================== */

    if (!searchValue) {

      return res.status(400).json({
        success: false,
        message: "Missing search value",
      });
    }

    let snapshot;

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

      snapshot = await db.collection("contacts").get();

      const contacts = [];

      snapshot.forEach((doc) => {

        contacts.push({
          id: doc.id,
          ...doc.data(),
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

    snapshot = await db
      .collection("contacts")
      .where("name_lower", "==", searchValue)
      .get();

    console.log("📄 Documents Found:", snapshot.size);

    /* =====================================
       No Results
    ===================================== */

    if (snapshot.empty) {

      return res.json({
        success: false,
        message: "No matching document found",
      });
    }

    /* =====================================
       Extract First Result
    ===================================== */

    const doc = snapshot.docs[0];
    const data = doc.data();

    /* =====================================
       Flat JSON Response
    ===================================== */

    return res.json({
      success: true,
      name: data.name || "",
      phone: data.phone || "",
      name_lower: data.name_lower || "",
    });

  } catch (error) {

    console.error("❌ Query Error:", error);

    res.status(500).json({
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