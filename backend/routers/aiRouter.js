// backend/routers/aiRouter.js
const express = require("express");
const fs = require("fs");
const { requireAuth } = require("../middlewares/authMiddleware");
const { generateSQL, explainResults, chat, extractSchemaName } = require("../services/aiService");
const { detectIntent } = require("../services/intentRouter");
const queryService = require("../services/queryService");
const { getRealtimeSuggestions } = require("../services/querySuggestionsService");
const {
  getDatabaseSchema,
  executeQueryOnUserDb,
} = require("../services/sqliteToMysqlService");

const router = express.Router();

router.post("/chat", requireAuth, async (req, res) => {
  try {
    const { message, dbId } = req.body || {};
    if (!message) return res.status(400).json({ success: false, message: "message is required" });

    const uid = req.user?.id || req.user?._id;
    if (!uid) return res.status(401).json({ success: false, message: "Unauthorized" });

    console.log(`🔄 Processing AI chat request for user: ${uid}, dbId: ${dbId}, message: ${message}`);

    // Use AI to intelligently detect intent
    const intent = await detectIntent(message, !!dbId);
    console.log(`🎯 Detected intent:`, intent);

    // Handle general chat
    if (intent.intent === "general_chat") {
      try {
        console.log('💬 Processing general conversation');
        const reply = await chat(message, []);
        return res.json({ 
          success: true, 
          explanation: reply,
          isGeneralQuestion: true,
          intent: intent
        });
      } catch (err) {
        console.error('❌ General chat error:', err);
        return res.status(500).json({ success: false, message: err.message });
      }
    }

    // Handle database queries
    if (intent.intent === "database_query") {
      if (!dbId) {
        return res.status(400).json({ 
          success: false, 
          message: "Please select a database to query your data.",
          intent: intent
        });
      }
    }

    // Get database schema information for database queries
    let schemaText = "";
    if (dbId && intent.intent === "database_query") {
      const schemaInfo = await getDatabaseSchema(dbId, uid);
      if (!schemaInfo) {
        return res.status(404).json({ success: false, message: "Database not found for this user" });
      }

      // Create detailed schema description for AI
      schemaText = schemaInfo.tables.map(table => {
        const columns = table.columns ? table.columns.map(col => `${col.name} (${col.type})`).join(', ') : 'columns not available';
        return `Table: ${table.name} - ${table.rowCount} rows\n  Columns: ${columns}`;
      }).join('\n\n');

      console.log(`📊 Database schema:`, schemaText);
    } else if (intent.intent === "create_schema" || intent.intent === "create_table") {
      console.log(`📊 Creating new schema/table`);
      schemaText = "No existing schema - this is a new database creation request.";
    }

    // Generate SQL query based on intent
    const sql = (await generateSQL(message, schemaText, uid)).trim();
    console.log(`🔍 Generated SQL:`, sql);

    // Check if it's a dangerous operation
    const lowerSql = sql.toLowerCase().trim();
    if (lowerSql.includes('drop table') || lowerSql.includes('truncate') || lowerSql.includes('delete from') && !lowerSql.includes('where')) {
      return res.status(400).json({
        success: false,
        message: "Dangerous operations are not allowed. Use WHERE clauses for DELETE operations.",
        sql,
        intent: intent
      });
    }

    // Handle CREATE operations (both create_schema and create_table)
    if (intent.intent === "create_schema" || intent.intent === "create_table" || lowerSql.startsWith('create table')) {
      // Handle CREATE operations
      try {
        console.log('🔧 Processing CREATE operation:', intent.intent);
        console.log('🔍 Generated SQL:', sql);
        
        // Extract schema name from user request
        const requestedSchemaName = await extractSchemaName(message);
        console.log('🔍 Extracted schema name:', requestedSchemaName);
        
        // If the AI didn't generate a CREATE TABLE, generate one based on the request
        let createTableSQL = sql;
        if (!lowerSql.startsWith('create table')) {
          console.log('🔧 AI did not generate CREATE TABLE, generating fallback...');
          // Generate a simple CREATE TABLE for a random database (SQLite compatible)
          createTableSQL = `CREATE TABLE sample_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            description TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          )`;
        }
        
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
          
          // Convert MySQL CREATE TABLE to SQLite compatible
          let sqliteSQL = createTableSQL
            .replace(/AUTO_INCREMENT/gi, 'AUTOINCREMENT')
            .replace(/INT\b/gi, 'INTEGER')
            .replace(/VARCHAR\(\d+\)/gi, 'TEXT')
            .replace(/DATETIME/gi, 'TEXT')
            .replace(/DEFAULT CURRENT_TIMESTAMP/gi, 'DEFAULT CURRENT_TIMESTAMP')
            .replace(/PRIMARY KEY AUTOINCREMENT/gi, 'PRIMARY KEY AUTOINCREMENT')
            .replace(/,\s*AUTOINCREMENT/gi, ' AUTOINCREMENT');
          
          // Fix common SQLite syntax issues
          sqliteSQL = sqliteSQL
            .replace(/INTEGER AUTOINCREMENT PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
            .replace(/INT AUTOINCREMENT PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
            .replace(/AUTOINCREMENT\s+PRIMARY KEY/gi, 'PRIMARY KEY AUTOINCREMENT');
          
          console.log('🔧 Final SQLite SQL:', sqliteSQL);
          
          // Execute the schema creation
          await new Promise((resolve, reject) => {
            sqliteDb.exec(sqliteSQL, (err) => {
              if (err) {
                console.error('❌ SQLite execution error:', err);
                reject(err);
              } else {
                console.log('✅ SQLite schema created successfully');
                resolve();
              }
            });
          });

          // Read the created database as buffer
          const buffer = fs.readFileSync(tmpPath);
          
          // Convert to MySQL using existing service
          const { convertSqliteToMysql } = require("../services/sqliteToMysqlService");
          const result = await convertSqliteToMysql(uid, `generated_schema_${Date.now()}.db`, buffer, requestedSchemaName);
          
          // Generate dual response: SQL execution + ChatGPT explanation
          const schemaName = result.mysqlSchemaName;
          const sqlExplanation = ` SQL executed successfully! I've created a new table in schema "${schemaName}" based on your request.`;
          const chatExplanation = await chat(`I just created a table with this SQL: ${createTableSQL} in schema "${schemaName}". Explain what this table does and how it can be used.`, []);
          
          console.log(`Table created successfully: ${result.dbId} with schema name: ${schemaName}`);

          return res.json({ 
            success: true, 
            sql: createTableSQL,
            explanation: sqlExplanation,
            chatExplanation: chatExplanation,
            dbId: result.dbId,
            schemaName: schemaName,
            operationType: 'CREATE_TABLE',
            schemaCreated: true,
            isDualResponse: true,
            intent: intent
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
        console.error("❌ CREATE TABLE error:", err);
        return res.status(500).json({ success: false, message: `Failed to create table: ${err.message}` });
      }
    }

    // Handle database queries
    if (intent.intent === "database_query") {
      const rows = await executeQueryOnUserDb(dbId, uid, sql);
      const columns = rows.length ? Object.keys(rows[0]) : [];
      
      // Generate dual response: SQL execution + ChatGPT explanation
      const sqlExplanation = `✅ SQL executed successfully! Found ${rows.length} rows.`;
      const chatExplanation = await chat(`I just executed this SQL query: ${sql}. The results show ${rows.length} rows. Explain what this query does and what the results mean.`, []);
      
      console.log(`✅ Query executed successfully: ${rows.length} rows returned`);

      // Save prompt history (for suggestions)
      try { await queryService.createQuery(Number(uid) || 1, message); } catch (_) {}

      return res.json({ 
        success: true, 
        sql, 
        columns, 
        rows, 
        explanation: sqlExplanation,
        chatExplanation: chatExplanation,
        isDualResponse: true,
        intent: intent
      });
    }

    // If we reach here, it's an unexpected intent
    console.log('❌ Unexpected intent:', intent);
    return res.status(400).json({ 
      success: false, 
      message: "I'm not sure how to handle that request. Please try rephrasing your message.",
      intent: intent
    });
  } catch (err) {
    console.error("❌ AI/DB error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /ai/suggestions - Get real-time query suggestions
router.get("/suggestions", requireAuth, async (req, res) => {
  try {
    const { q: query = '', dbId } = req.query;
    const uid = req.user?.id || req.user?._id;
    
    if (!uid) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    
    let schemaInfo = null;
    
    // Get database schema if dbId is provided
    if (dbId) {
      try {
        schemaInfo = await getDatabaseSchema(dbId, uid);
      } catch (err) {
        console.log('Could not fetch schema for suggestions:', err.message);
      }
    }
    
    // Get suggestions
    const suggestions = await getRealtimeSuggestions(query, uid, schemaInfo);
    
    res.json({
      success: true,
      suggestions,
      query: query,
      dbId: dbId || null
    });
    
  } catch (err) {
    console.error("❌ Suggestions error:", err);
    res.status(500).json({ success: false, message: "Failed to get suggestions" });
  }
});

module.exports = router;
