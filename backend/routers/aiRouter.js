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
  updateDatabaseTablesAfterDrop,
  syncDatabaseTables,
  cleanupOrphanedDatabases,
} = require("../services/sqliteToMysqlService");
const { buildDatabaseFromData } = require("../services/databaseBuilderService");

const router = express.Router();

// Helper function to generate sample data from description
async function generateSampleDataFromDescription(description) {
  const { chat } = require("../services/aiService");
  
  const completion = await chat(`Based on this description: "${description}", generate realistic sample data in JSON format. 
    Create 3-5 sample records that would be typical for this type of data. 
    Return ONLY a JSON array of objects, no explanations.`, []);
  
  try {
    return JSON.parse(completion);
  } catch (error) {
    // Fallback to generic sample data
    return [
      { id: 1, name: "Sample Item 1", description: "Generated from description", created_at: new Date().toISOString() },
      { id: 2, name: "Sample Item 2", description: "Generated from description", created_at: new Date().toISOString() },
      { id: 3, name: "Sample Item 3", description: "Generated from description", created_at: new Date().toISOString() }
    ];
  }
}

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
    if (lowerSql.includes('truncate') || (lowerSql.includes('delete from') && !lowerSql.includes('where'))) {
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
          // Use the extracted schema name as the table name, or fallback to a generic name
          const tableName = requestedSchemaName || 'sample_data';
          createTableSQL = `CREATE TABLE ${tableName} (
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

    // Handle DROP TABLE operations
    if (lowerSql.includes('drop table')) {
      if (!dbId) {
        return res.status(400).json({ 
          success: false, 
          message: "Please select a database to drop tables from.",
          intent: intent
        });
      }

      try {
        console.log('🗑️ Processing DROP TABLE operation');
        
        // Extract table name from DROP TABLE statement
        const dropMatch = lowerSql.match(/drop\s+table\s+(?:if\s+exists\s+)?[`"]?(\w+)[`"]?/i);
        if (!dropMatch) {
          return res.status(400).json({ 
            success: false, 
            message: "Could not identify table name in DROP TABLE statement.",
            sql,
            intent: intent
          });
        }
        
        const tableName = dropMatch[1];
        console.log(`🗑️ Dropping table: ${tableName}`);
        
        // Execute the DROP TABLE query
        const rows = await executeQueryOnUserDb(dbId, uid, sql);
        
        // Update database_tables to remove the dropped table
        await updateDatabaseTablesAfterDrop(dbId, uid, tableName);
        
        // Sync all tables to ensure consistency
        await syncDatabaseTables(dbId, uid);
        
        // Generate explanation
        const explanation = `✅ Table "${tableName}" has been successfully dropped from the database.`;
        const chatExplanation = await chat(`I just dropped the table "${tableName}" from the database. Explain what this means and what the user should know about this operation.`, []);
        
        console.log(`✅ Table ${tableName} dropped successfully`);

        // Save prompt history
        try { await queryService.createQuery(Number(uid) || 1, message); } catch (_) {}

        return res.json({ 
          success: true, 
          sql, 
          explanation: explanation,
          chatExplanation: chatExplanation,
          isDualResponse: true,
          tableDropped: true,
          droppedTableName: tableName,
          intent: intent
        });
      } catch (err) {
        console.error("❌ DROP TABLE error:", err);
        return res.status(500).json({ 
          success: false, 
          message: `Failed to drop table: ${err.message}`,
          sql,
          intent: intent
        });
      }
    }

    // Handle database building from data
    if (intent.intent === "build_database") {
      try {
        console.log('🏗️ Processing database building request');
        
        // Extract data from message (look for data patterns)
        const dataMatch = message.match(/(?:data|json|csv|build|create).*?:\s*([\s\S]+)/i);
        const data = dataMatch ? dataMatch[1].trim() : message;
        
        // Try to detect if user provided actual data or just description
        const hasStructuredData = data.includes('{') || data.includes('[') || data.includes(',') || data.includes('\n');
        
        if (!hasStructuredData) {
          // User just described what they want, generate sample data
          const sampleData = await generateSampleDataFromDescription(data);
          const result = await buildDatabaseFromData(sampleData, data, uid, 'json', 'sqlite');
          
          if (result.success) {
            return res.json({
              success: true,
              explanation: `🎉 I've created a database called "${result.schema.databaseName}" based on your description! The database includes ${result.schema.tables.length} tables with sample data.`,
              schema: result.schema,
              sqlDDL: result.sqlDDL,
              database: result.database,
              dbId: result.database.dbPath ? result.database.filename : result.database.dbName,
              schemaCreated: true,
              intent: intent
            });
          } else {
            return res.status(500).json({ success: false, message: result.error });
          }
        } else {
          // User provided actual data
          const result = await buildDatabaseFromData(data, message, uid, 'auto', 'sqlite');
          
          if (result.success) {
            return res.json({
              success: true,
              explanation: `🎉 I've analyzed your data and created a database called "${result.schema.databaseName}"! The database includes ${result.schema.tables.length} tables with your data properly structured.`,
              schema: result.schema,
              sqlDDL: result.sqlDDL,
              database: result.database,
              dbId: result.database.dbPath ? result.database.filename : result.database.dbName,
              schemaCreated: true,
              intent: intent
            });
          } else {
            return res.status(500).json({ success: false, message: result.error });
          }
        }
      } catch (err) {
        console.error('❌ Database building error:', err);
        return res.status(500).json({ success: false, message: `Failed to build database: ${err.message}` });
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
