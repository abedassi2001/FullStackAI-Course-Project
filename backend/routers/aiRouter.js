// backend/routers/aiRouter.js
const express = require("express");
const fs = require("fs");
const { requireAuth } = require("../middlewares/authMiddleware");
const { generateSQL, explainResults, chat } = require("../services/aiService");
const queryService = require("../services/queryService");
const {
  fetchDbBufferFromMySQL,
  bufferToTempSqlite,
  runSQL,
  getSchema,
} = require("../services/fileDBService");

const router = express.Router();

router.post("/chat", requireAuth, async (req, res) => {
  try {
    const { message, dbId } = req.body || {};
    if (!message) return res.status(400).json({ success: false, message: "message is required" });

    const uid = req.user?.id || req.user?._id;   // <— accept both
    if (!uid) return res.status(401).json({ success: false, message: "Unauthorized" });

    if (!dbId) return res.status(400).json({ success: false, message: "dbId is required" });

    const row = await fetchDbBufferFromMySQL(dbId, uid);
    if (!row) return res.status(404).json({ success: false, message: "DB not found for this user" });

    const dbPath = bufferToTempSqlite(row.file, row.filename);

    const schemaText = await getSchema(dbPath);
    const sql = (await generateSQL(message, schemaText)).trim();

    if (!sql.toLowerCase().startsWith("select")) {
      return res.status(400).json({
        success: false,
        message: "Only SELECT statements are allowed.",
        sql,
      });
    }

    const rows = await runSQL(dbPath, sql);
    const columns = rows.length ? Object.keys(rows[0]) : [];
    const explanation = await explainResults(message, sql, rows);

    // Save prompt history (for suggestions)
    try { await queryService.createQuery(Number(uid) || 1, message); } catch (_) {}

    // cleanup temp file
    try { fs.unlinkSync(dbPath); } catch (_) {}

    return res.json({ success: true, sql, columns, rows, explanation });
  } catch (err) {
    console.error("❌ AI/DB error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

// General conversation endpoint
router.post("/talk", requireAuth, async (req, res) => {
  try {
    const { message, history } = req.body || {};
    if (!message) return res.status(400).json({ success: false, message: "message is required" });
    const reply = await chat(message, Array.isArray(history) ? history : []);
    return res.json({ success: true, reply });
  } catch (err) {
    console.error("❌ AI talk error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});
