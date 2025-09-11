// backend/routers/aiRouter.js
const express = require("express");
const fs = require("fs");
const { requireAuth } = require("../middlewares/authMiddleware");
const { generateSQL, explainResults, chat } = require("../services/aiService");
const queryService = require("../services/queryService");
const {
  getDatabaseSchema,
  executeQueryOnUserDb,
} = require("../services/sqliteToMysqlService");

const router = express.Router();

router.post("/chat", requireAuth, async (req, res) => {
  try {
    const { message, dbId } = req.body || {};
    if (!message) return res.status(400).json({ success: false, message: "message is required" });

    const uid = req.user?.id || req.user?._id;   // <— accept both
    if (!uid) return res.status(401).json({ success: false, message: "Unauthorized" });

    if (!dbId) return res.status(400).json({ success: false, message: "dbId is required" });

    console.log(`🔄 Processing AI chat request for user: ${uid}, dbId: ${dbId}`);

    // Get database schema information
    const schemaInfo = await getDatabaseSchema(dbId, uid);
    if (!schemaInfo) {
      return res.status(404).json({ success: false, message: "Database not found for this user" });
    }

    // Create detailed schema description for AI
    const schemaText = schemaInfo.tables.map(table => {
      const columns = table.columns ? table.columns.map(col => `${col.name} (${col.type})`).join(', ') : 'columns not available';
      return `Table: ${table.name} - ${table.rowCount} rows\n  Columns: ${columns}`;
    }).join('\n\n');

    console.log(`📊 Database schema:`, schemaText);

    // Generate SQL query
    const sql = (await generateSQL(message, schemaText, uid)).trim();
    console.log(`🔍 Generated SQL:`, sql);

    // Check if it's a dangerous operation and determine operation type
    const lowerSql = sql.toLowerCase().trim();
    if (lowerSql.includes('drop table') || lowerSql.includes('truncate') || lowerSql.includes('delete from') && !lowerSql.includes('where')) {
      return res.status(400).json({
        success: false,
        message: "Dangerous operations are not allowed. Use WHERE clauses for DELETE operations.",
        sql,
      });
    }

    // Execute query on MySQL database
    const rows = await executeQueryOnUserDb(dbId, uid, sql);
    const columns = rows.length ? Object.keys(rows[0]) : [];
    
    // Determine operation type for better explanation
    let operationType = 'SELECT';
    if (lowerSql.startsWith('insert')) operationType = 'INSERT';
    else if (lowerSql.startsWith('update')) operationType = 'UPDATE';
    else if (lowerSql.startsWith('delete')) operationType = 'DELETE';
    
    const explanation = await explainResults(message, sql, rows, operationType);

    console.log(`✅ Query executed successfully: ${rows.length} rows returned`);

    // Save prompt history (for suggestions)
    try { await queryService.createQuery(Number(uid) || 1, message); } catch (_) {}

    return res.json({ success: true, sql, columns, rows, explanation });
  } catch (err) {
    console.error("❌ AI/DB error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

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

module.exports = router;
