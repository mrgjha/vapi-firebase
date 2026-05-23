const express = require("express");
const admin = require("firebase-admin");
const util = require("util");

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

    console.log(
      util.inspect(req.body, {
        depth: null,
        colors: true,
      })
    );

    /* =====================================
       Extract User Message
    ===================================== */

    let value = "";

    /* =====================================
       Direct Value
    ===================================== */

    if (typeof req.body.value === "string") {

      value = req.body.value;
    }

    /* =====================================
       Direct Transcript
    ===================================== */

    else if (typeof req.body.transcript === "string") {

      value = req.body.transcript;
    }

    /* =====================================
       Last User Message
    ===================================== */

    else if (typeof req.body.lastUserMessage === "string") {

      value = req.body.lastUserMessage;
    }

    /* =====================================
       VAPI TOOL CALL FORMAT
    ===================================== */

    else if (
      req.body.message &&
      req.body.message.toolCallList &&
      req.body.message.toolCallList[0] &&
      req.body.message.toolCallList[0].function &&
      req.body.message.toolCallList[0].function.arguments
    ) {

      const args =
        req.body.message.toolCallList[0].function.arguments;

      console.log("🛠 Tool Arguments:", args);

      /* ===================================
         If Arguments is STRING
      =================================== */

      if (typeof args === "string") {

        try {

          const parsed = JSON.parse(args);

          value = parsed.value || "";

        } catch (err) {

          console.log("❌ JSON parse failed");
        }
      }

      /* ===================================
         If Arguments is OBJECT
      =================================== */

      else if (typeof args === "object") {

        value = args.value || "";
      }
    }

    console.log("📝 Original Value:", value);

    /* =====================================
       DEBUG RESPONSE TEST
    ===================================== */

    return res.json({
      speech: "Hello Gyanendra. Voice agent connection is successful."
    });

    /* =====================================
       Clean Search Value
    ===================================== */

    const searchValue = String(value)
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .replace(
        /\b(phone|number|contact|mobile|call|find|give|tell|me|can|you|please|show|get|search|for)\b/g,
        ""
      )
      .trim()
      .split(" ")[0];

    console.log("🔍 Final Search Value:", searchValue);

    /* =====================================
       Validation
    ===================================== */

    if (!searchValue) {

      console.log("❌ Empty Search Value");

      return res.json({
        speech: "Sorry, I could not understand the contact name."
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
        speech: "Sorry, I could not find that contact."
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
      speech: `Found contact. ${data.name}'s phone number is ${data.phone}`
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
      speech: "Sorry, something went wrong while searching the contact."
    });
  }
});

/* =========================================
   Start Server
========================================= */

app.listen(PORT, () => {

  console.log(`🚀 Server running on port ${PORT}`);
});