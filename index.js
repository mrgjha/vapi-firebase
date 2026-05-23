const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const firestore = admin.firestore();
const rtdb = admin.database();

// ── Query Firestore ──────────────────────────────
app.post("/query-firestore", async (req, res) => {
  const { collection, field, value } = req.body;
  try {
    const snapshot = await firestore
      .collection(collection)
      .where(field, "==", value)
      .limit(5)
      .get();

    if (snapshot.empty) {
      return res.json({ result: `No records found.` });
    }
    const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.json({ result: records });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Query Realtime Database ──────────────────────
app.post("/query-rtdb", async (req, res) => {
  const { path } = req.body;
  try {
    const snapshot = await rtdb.ref(path).once("value");
    if (!snapshot.exists()) {
      return res.json({ result: `No data found at path: ${path}` });
    }
    return res.json({ result: snapshot.val() });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Health Check ─────────────────────────────────
app.get("/", (req, res) => res.send("VAPI Firebase API is running ✅"));

app.listen(3000, () => console.log("🚀 Server running on port 3000"));