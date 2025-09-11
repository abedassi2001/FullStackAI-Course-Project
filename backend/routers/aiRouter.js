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

// Create schema from description
router.post("/create-schema", requireAuth, async (req, res) => {
  try {
    console.log('📥 Schema creation request received:', req.body);
    const { description } = req.body || {};
    if (!description) return res.status(400).json({ success: false, message: "description is required" });

    const uid = req.user?.id || req.user?._id;
    if (!uid) return res.status(401).json({ success: false, message: "Unauthorized" });

    console.log(`🔄 Creating schema from description for user: ${uid}`);
    console.log(`📝 Description: ${description}`);

    // Generate schema using AI
    const schemaPrompt = `Create a database schema based on this description: "${description}". 
    Return only SQL CREATE TABLE statements, one per table. Use SQLite-compatible syntax:
    - Use INTEGER for IDs with PRIMARY KEY
    - Use TEXT for strings
    - Use REAL for numbers
    - Use DATETIME for dates
    - Do NOT include FOREIGN KEY constraints (we'll handle relationships separately)
    - Do NOT include CREATE DATABASE statements
    - Each table should have an id INTEGER PRIMARY KEY AUTOINCREMENT column
    - Use AUTOINCREMENT (not AUTO_INCREMENT) for SQLite compatibility`;
    
    const schemaSQL = await generateSQL(schemaPrompt, "", uid);
    console.log(`🔍 Generated schema SQL: ${schemaSQL}`);
    
    // Remove any CREATE DATABASE statements as SQLite doesn't support them
    const cleanedSQL = schemaSQL.replace(/CREATE DATABASE\s+\w+;?\s*/gi, '');
    console.log(`🧹 Cleaned schema SQL: ${cleanedSQL}`);

    // Create a temporary SQLite database with the generated schema
    const sqlite3 = require("sqlite3").verbose();
    const fs = require("fs");
    const path = require("path");
    const os = require("os");
    const crypto = require("crypto");
    
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const tmpPath = path.join(os.tmpdir(), `temp_schema_${uniqueId}_${Date.now()}.db`);
    let sqliteDb;
    
    try {
      sqliteDb = new sqlite3.Database(tmpPath);
      
      // Execute the schema creation
      await new Promise((resolve, reject) => {
        sqliteDb.exec(cleanedSQL, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Read the created database as buffer
      const buffer = fs.readFileSync(tmpPath);
      
      // Convert to MySQL using existing service
      const { convertSqliteToMysql } = require("../services/sqliteToMysqlService");
      const result = await convertSqliteToMysql(uid, `generated_schema_${Date.now()}.db`, buffer);
      
      const message = `✅ Schema created successfully! I've generated a database with the following structure based on your description: "${description}". The database has been saved and is now available for querying.`;
      
      console.log(`✅ Schema created successfully: ${result.dbId}`);

      return res.json({ 
        success: true, 
        message,
        dbId: result.dbId,
        schema: schemaSQL
      });
    } finally {
      // Cleanup
      if (sqliteDb) {
        sqliteDb.close((err) => {
          if (err) console.error("Error closing SQLite database:", err);
        });
      }
      
      // Wait a bit before trying to delete the file
      setTimeout(() => {
        try {
          if (fs.existsSync(tmpPath)) {
            fs.unlinkSync(tmpPath);
          }
        } catch (err) {
          console.error("Error deleting temp file:", err);
        }
      }, 100);
    }
  } catch (err) {
    console.error("❌ Schema creation error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
