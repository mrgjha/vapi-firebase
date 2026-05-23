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
   Firebase Admin Configuration
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
   Firestore Connection Test
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
   Query Firestore
========================================= */

app.post("/queryFirestore", async (req, res) => {

  try {

    console.log("📥 Request Body:", req.body);

    const { value } = req.body;

    /* Validation */

    if (!value) {
      return res.status(400).json({
        success: false,
        message: "Missing value",
      });
    }

    /* Convert to lowercase */

    const searchValue = value.toLowerCase().trim();

    console.log("🔍 Searching for:", searchValue);

    /* Query Firestore */

    const snapshot = await db
      .collection("contacts")
      .where("name_lower", "==", searchValue)
      .get();

    console.log("📄 Documents Found:", snapshot.size);

    /* No Results */

    if (snapshot.empty) {

      return res.json({
        success: false,
        message: "No matching document found",
      });
    }

    /* Extract Documents */

    const results = [];

    snapshot.forEach((doc) => {

      results.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    /* Success Response */

    res.json({
      success: true,
      count: results.length,
      data: results,
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