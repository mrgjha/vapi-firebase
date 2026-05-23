const express = require("express");
const admin = require("firebase-admin");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 10000;

/* =========================================
   Middleware
========================================= */

app.use(express.json());

/* =========================================
   Global Request Logger
========================================= */

app.use((req, res, next) => {

  console.log("\n====================================");
  console.log("📥 Incoming Request");
  console.log("====================================");

  console.log("METHOD:", req.method);
  console.log("URL:", req.url);
  console.log("TIME:", new Date().toISOString());

  next();
});

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

if (!admin.apps.length) {

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("🔥 Firebase Connected");
}

const db = admin.firestore();

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
    console.log("📦 RAW BODY");
    console.log("====================================");

    console.log(JSON.stringify(req.body, null, 2));

    /* =====================================
       Extract User Message
    ===================================== */

    let value = "";

    // Standard formats
    if (req.body.value) {

      value = req.body.value;
    }

    else if (req.body.message) {

      value = req.body.message;
    }

    else if (req.body.transcript) {

      value = req.body.transcript;
    }

    else if (req.body.lastUserMessage) {

      value = req.body.lastUserMessage;
    }

    /* =====================================
       VAPI TOOL CALL FORMAT
    ===================================== */

    else if (
      req.body.message &&
      req.body.message.toolCallList &&
      req.body.message.toolCallList[0] &&
      req.body.message.toolCallList[0].arguments &&
      req.body.message.toolCallList[0].arguments.value
    ) {

      value =
        req.body.message.toolCallList[0].arguments.value;
    }

    console.log("📝 Original Value:", value);

    /* =====================================
       Clean Search Value
    ===================================== */

    const searchValue = value
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .replace(
        /\b(phone|number|contact|mobile|call|find|give|tell|me|can|you|please|show|get|search|for)\b/g,
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

    console.log("🚀 Final API Response:");

    console.log(JSON.stringify(finalResponse, null, 2));

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