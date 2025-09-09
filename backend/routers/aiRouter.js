const express = require("express");
const path = require("path");
const upload = require("../middlewares/upload"); // multer config
const { generateSQL, runSQL, explainResults } = require("../services/aiService");

const router = express.Router();

// POST /ai/chat → prompt + db file
router.post("/chat", upload.single("dbfile"), async (req, res) => {
  try {
    const { message } = req.body;
    const dbFilePath = req.file ? req.file.path : null;

    if (!message || !dbFilePath) {
      return res.status(400).json({ success: false, message: "Message and DB file are required" });
    }

    // 1️⃣ Ask AI to convert NL prompt → SQL
    const sql = await generateSQL(message, "Database schema is in SQLite format");

    // 2️⃣ Run the SQL query on uploaded DB
    const rows = await runSQL(dbFilePath, sql);

    // 3️⃣ Ask AI to explain results
    const explanation = await explainResults(message, sql, rows);

    res.json({
      success: true,
      sql,
      rows,
      explanation,
    });
  } catch (err) {
    console.error("❌ AI/DB error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
