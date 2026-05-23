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
   Request Logger
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
   Firebase Config
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

  res.send("🚀 Vapi Firestore Server Running");
});

/* =========================================
   Query Firestore Route
========================================= */

app.post("/queryFirestore", async (req, res) => {

  try {

    console.log("\n====================================");
    console.log("🔥 QUERY FIRESTORE HIT");
    console.log("====================================");

    console.log("📦 Request Body:");

    console.log(JSON.stringify(req.body, null, 2));

    /* =====================================
       Extract Tool Call ID
    ===================================== */

    const toolCallId =
      req.body.message.toolCallList[0].id;

    /* =====================================
       Extract User Value
    ===================================== */

    let value = "";

    const args =
      req.body.message.toolCallList[0]
        .function.arguments;

    console.log("🛠 Tool Arguments:", args);

    if (typeof args === "string") {

      const parsed = JSON.parse(args);

      value = parsed.value || "";
    }

    else if (typeof args === "object") {

      value = args.value || "";
    }

    console.log("📝 Original Value:", value);

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
       Empty Validation
    ===================================== */

    if (!searchValue) {

      return res.json({
        results: [
          {
            toolCallId: toolCallId,
            result:
              "Sorry, I could not understand the contact name."
          }
        ]
      });
    }

    /* =====================================
       Firestore Query
    ===================================== */

    console.log("🔎 Starting Firestore Query...");

    const snapshot = await db
      .collection("contacts")
      .where("name_lower", "==", searchValue)
      .get();

    console.log("📄 Documents Found:", snapshot.size);

    /* =====================================
       No Match
    ===================================== */

    if (snapshot.empty) {

      console.log("❌ No Matching Contact Found");

      return res.json({
        results: [
          {
            toolCallId: toolCallId,
            result:
              "Sorry, I could not find that contact."
          }
        ]
      });
    }

    /* =====================================
       Found Match
    ===================================== */

    const doc = snapshot.docs[0];

    console.log("🆔 Document ID:", doc.id);

    const data = doc.data();

    console.log("✅ Firestore Data:", data);

    const finalSpeech =
      `Found contact. ${data.name}'s phone number is ${data.phone}`;

    console.log("🚀 Final Speech:");

    console.log(finalSpeech);

    /* =====================================
       FINAL VAPI RESPONSE
    ===================================== */

    return res.json({
      results: [
        {
          toolCallId: toolCallId,
          result: finalSpeech
        }
      ]
    });

  } catch (error) {

    console.error("\n====================================");
    console.error("🔥 FIRESTORE ERROR");
    console.error("====================================");

    console.error(error);

    const toolCallId =
      req.body?.message?.toolCallList?.[0]?.id;

    return res.json({
      results: [
        {
          toolCallId: toolCallId || "unknown",
          result:
            "Sorry, something went wrong while searching the contact."
        }
      ]
    });
  }
});

/* =========================================
   Start Server
========================================= */

app.listen(PORT, () => {

  console.log(`🚀 Server running on port ${PORT}`);
});