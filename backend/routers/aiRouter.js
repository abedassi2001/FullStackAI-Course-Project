// backend/routers/aiRouter.js
const express = require("express");
const upload = require("../middlewares/upload");
const { requireAuth } = require("../middlewares/authMiddleware");
const { generateSQL, explainResults } = require("../services/aiService");
const queryService = require("../services/queryService");
const {
  fetchDbBufferFromMySQL,
  bufferToTempSqlite,
  runSQL,
  getSchema,
} = require("../services/fileDBService");

const router = express.Router();

router.post("/chat", requireAuth, upload.single("dbfile"), async (req, res) => {
  try {
    const { message, dbId } = req.body || {};
    if (!message && !req.file) {
      return res.status(400).json({ success: false, message: "message is required" });
    }

    const uid = req.user?.id || req.user?._id;   // <— accept both
    if (!uid) return res.status(401).json({ success: false, message: "Unauthorized" });

    let dbPath = null;

    if (req.file?.path) {
      dbPath = req.file.path; // ad-hoc upload
    } else {
      if (!dbId) {
        return res.status(400).json({ success: false, message: "dbId or dbfile is required" });
      }
      const row = await fetchDbBufferFromMySQL(dbId, uid);
      if (!row) {
        return res.status(404).json({ success: false, message: "DB not found for this user" });
      }
      dbPath = bufferToTempSqlite(row.file, row.filename);
    }

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

    return res.json({ success: true, sql, columns, rows, explanation });
  } catch (err) {
    console.error("❌ AI/DB error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
