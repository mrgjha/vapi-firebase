const express = require("express");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 10000;

/* =========================================
   Middleware
========================================= */

app.use(express.json());

/* =========================================
   Root Route
========================================= */

app.get("/", (req, res) => {

  res.send("🚀 Vapi Voice Agent Server Running");
});

/* =========================================
   Minimal Debug Route
========================================= */

app.post("/queryFirestore", async (req, res) => {

  console.log("\n====================================");
  console.log("🔥 QUERY FIRESTORE HIT");
  console.log("====================================");

  console.log("📦 Request Body:");

  console.log(JSON.stringify(req.body, null, 2));

  return res.json({
    speech: "Hello Gyanendra. Voice agent connection is successful."
  });
});

/* =========================================
   Start Server
========================================= */

app.listen(PORT, () => {

  console.log(`🚀 Server running on port ${PORT}`);
});