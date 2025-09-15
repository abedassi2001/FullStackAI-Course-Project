// backend/controllers/chatController.js
const { requireAuth } = require("../middlewares/authMiddleware");
const { generateSQL, explainResults, chat } = require("../services/aiService");
const { detectIntent } = require("../services/intentRouter");
const {
  getDatabaseSchema,
  executeQueryOnUserDb,
  updateDatabaseTablesAfterDrop,
  syncDatabaseTables,
} = require("../services/sqliteToMysqlService");
const chatService = require("../services/chatService");

function getUid(req) {
  return req.user?.id || req.user?._id || null;
}

// Create a new chat
exports.createChat = async (req, res) => {
  try {
    const uid = getUid(req);
    if (!uid) return res.status(401).json({ success: false, error: "Unauthorized" });

    const newChat = await chatService.createChat(uid, "New Chat");
    res.json({ success: true, chat: newChat });
  } catch (err) {
    console.error("Create chat error:", err);
    res.status(500).json({ success: false, error: "Failed to create chat" });
  }
};

// Get all chats for a user
exports.getChats = async (req, res) => {
  try {
    const uid = getUid(req);
    if (!uid) return res.status(401).json({ success: false, error: "Unauthorized" });

    const chats = await chatService.getChats(uid);
    res.json({ success: true, chats });
  } catch (err) {
    console.error("Get chats error:", err);
    res.status(500).json({ success: false, error: "Failed to get chats" });
  }
};

// Get chat messages
exports.getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const uid = getUid(req);
    if (!uid) return res.status(401).json({ success: false, error: "Unauthorized" });

    const messages = await chatService.getMessages(chatId, uid);
    res.json({ success: true, messages });
  } catch (err) {
    console.error("Get chat messages error:", err);
    res.status(500).json({ success: false, error: "Failed to get chat messages" });
  }
};

// Send message to chat
exports.sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { message, dbId } = req.body;
    const uid = getUid(req);
    
    if (!uid) return res.status(401).json({ success: false, error: "Unauthorized" });
    if (!message) return res.status(400).json({ success: false, error: "Message is required" });

    console.log(`🔄 Processing message for chat ${chatId}, user: ${uid}, dbId: ${dbId}`);

    // Save user message to database
    await chatService.addMessage(chatId, uid, 'user', message);

    // Set database selection if provided
    if (dbId) {
      await chatService.setDatabaseSelection(chatId, uid, dbId);
    }

    // Use AI to intelligently detect intent
    const intent = await detectIntent(message, !!dbId);
    console.log(`🎯 Detected intent:`, intent);

    // Handle general chat
    if (intent.intent === "general_chat") {
      try {
        console.log('💬 Processing general conversation');
        const reply = await chat(message, []);
        
        // Save assistant message to database
        await chatService.addMessage(chatId, uid, 'assistant', reply, null, null, {
          isGeneralQuestion: true,
          intent: intent.intent
        });
        
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

        // Save assistant message to database
        await chatService.addMessage(chatId, uid, 'assistant', explanation, sql, null, {
          isDualResponse: true,
          chatExplanation: chatExplanation,
          tableDropped: true,
          droppedTableName: tableName,
          intent: intent.intent
        });

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

    // Handle database queries
    if (intent.intent === "database_query") {
      const rows = await executeQueryOnUserDb(dbId, uid, sql);
      const columns = rows.length ? Object.keys(rows[0]) : [];
      
      // Generate dual response: SQL execution + ChatGPT explanation
      const sqlExplanation = `✅ SQL executed successfully! Found ${rows.length} rows.`;
      const chatExplanation = await chat(`I just executed this SQL query: ${sql}. The results show ${rows.length} rows. Explain what this query does and what the results mean.`, []);
      
      console.log(`✅ Query executed successfully: ${rows.length} rows returned`);

      // Save assistant message to database
      await chatService.addMessage(chatId, uid, 'assistant', sqlExplanation, sql, {
        columns,
        rows,
        chatExplanation,
        isDualResponse: true
      }, {
        intent: intent.intent
      });

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
    console.error("❌ Send message error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Delete a chat
exports.deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const uid = getUid(req);
    if (!uid) return res.status(401).json({ success: false, error: "Unauthorized" });

    const deleted = await chatService.deleteChat(chatId, uid);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Chat not found" });
    }

    res.json({ success: true, message: "Chat deleted successfully" });
  } catch (err) {
    console.error("Delete chat error:", err);
    res.status(500).json({ success: false, error: "Failed to delete chat" });
  }
};
