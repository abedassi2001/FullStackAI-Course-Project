// backend/services/chatService.js
const mysql = require('mysql2/promise');

// Simple UUID generator (fallback if uuid package not available)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// MySQL connection config (same as sqliteToMysqlService)
const MYSQL_HOST = process.env.MYSQL_HOST || "localhost";
const MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306);
const MYSQL_USER = process.env.MYSQL_USER || "root";
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD ?? process.env.MYSQL_PASS ?? "";
const MYSQL_DATABASE = process.env.MYSQL_DATABASE ?? process.env.MYSQL_DB ?? "query";

let pool;

// Initialize MySQL connection
async function initializeMySQL() {
  try {
    if (!pool) {
      pool = mysql.createPool({
        host: MYSQL_HOST,
        port: MYSQL_PORT,
        user: MYSQL_USER,
        password: MYSQL_PASSWORD,
        database: MYSQL_DATABASE,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      console.log("✅ ChatService MySQL connection established");
    }
    return pool;
  } catch (error) {
    console.error("❌ ChatService MySQL connection failed:", error);
    throw error;
  }
}

// Get the MySQL pool
async function getPool() {
  if (!pool) {
    await initializeMySQL();
  }
  return pool;
}

// Ensure chat tables exist
async function ensureChatTables() {
  const pool = await getPool();

  // Create chats table
  const createChatsTable = `
    CREATE TABLE IF NOT EXISTS chats (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      title VARCHAR(255) NOT NULL DEFAULT 'New Chat',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX (user_id),
      INDEX (created_at)
    )
  `;

  // Create messages table
  const createMessagesTable = `
    CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR(36) PRIMARY KEY,
      chat_id VARCHAR(36) NOT NULL,
      role ENUM('user', 'assistant') NOT NULL,
      content TEXT NOT NULL,
      sql_query TEXT NULL,
      query_results JSON NULL,
      metadata JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
      INDEX (chat_id),
      INDEX (created_at)
    )
  `;

  // Create database_selections table
  const createDatabaseSelectionsTable = `
    CREATE TABLE IF NOT EXISTS database_selections (
      id VARCHAR(36) PRIMARY KEY,
      chat_id VARCHAR(36) NOT NULL,
      database_id INT NOT NULL,
      selected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
      FOREIGN KEY (database_id) REFERENCES user_databases(id) ON DELETE CASCADE,
      INDEX (chat_id),
      INDEX (database_id)
    )
  `;

  await pool.execute(createChatsTable);
  await pool.execute(createMessagesTable);
  await pool.execute(createDatabaseSelectionsTable);
}

// Create a new chat
async function createChat(userId, title = 'New Chat') {
  await ensureChatTables();
  const pool = await getPool();
  
  const chatId = generateUUID();
  const [result] = await pool.execute(
    `INSERT INTO chats (id, user_id, title) VALUES (?, ?, ?)`,
    [chatId, String(userId), title]
  );

  return {
    id: chatId,
    userId: String(userId),
    title,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// Get all chats for a user
async function getChats(userId) {
  await ensureChatTables();
  const pool = await getPool();
  
  const [rows] = await pool.execute(
    `SELECT id, title, created_at, updated_at 
     FROM chats 
     WHERE user_id = ? 
     ORDER BY updated_at DESC`,
    [String(userId)]
  );

  return rows.map(row => ({
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

// Get messages for a chat
async function getMessages(chatId, userId) {
  await ensureChatTables();
  const pool = await getPool();
  
  // Verify chat belongs to user
  const [chatRows] = await pool.execute(
    `SELECT id FROM chats WHERE id = ? AND user_id = ?`,
    [chatId, String(userId)]
  );

  if (chatRows.length === 0) {
    throw new Error('Chat not found or access denied');
  }

  const [rows] = await pool.execute(
    `SELECT id, role, content, sql_query, query_results, metadata, created_at
     FROM messages 
     WHERE chat_id = ? 
     ORDER BY created_at ASC`,
    [chatId]
  );

  return rows.map(row => {
    let queryResults = null;
    let metadata = null;
    
    // Safely parse query_results
    if (row.query_results) {
      try {
        queryResults = typeof row.query_results === 'string' ? JSON.parse(row.query_results) : row.query_results;
      } catch (e) {
        console.error('Error parsing query_results:', e);
        queryResults = null;
      }
    }
    
    // Safely parse metadata
    if (row.metadata) {
      try {
        metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
      } catch (e) {
        console.error('Error parsing metadata:', e);
        metadata = null;
      }
    }
    
    return {
      id: row.id,
      role: row.role,
      content: row.content,
      sql: row.sql_query,
      queryResults,
      metadata,
      createdAt: row.created_at
    };
  });
}

// Add message to chat
async function addMessage(chatId, userId, role, content, sqlQuery = null, queryResults = null, metadata = null) {
  await ensureChatTables();
  const pool = await getPool();
  
  // Verify chat belongs to user
  const [chatRows] = await pool.execute(
    `SELECT id FROM chats WHERE id = ? AND user_id = ?`,
    [chatId, String(userId)]
  );

  if (chatRows.length === 0) {
    throw new Error('Chat not found or access denied');
  }

  const messageId = generateUUID();
  await pool.execute(
    `INSERT INTO messages (id, chat_id, role, content, sql_query, query_results, metadata) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      messageId,
      chatId,
      role,
      content,
      sqlQuery,
      queryResults ? JSON.stringify(queryResults) : null,
      metadata ? JSON.stringify(metadata) : null
    ]
  );

  // Update chat's updated_at timestamp
  await pool.execute(
    `UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [chatId]
  );

  return {
    id: messageId,
    chatId,
    role,
    content,
    sql: sqlQuery,
    queryResults,
    metadata,
    createdAt: new Date()
  };
}

// Update chat title
async function updateChatTitle(chatId, userId, title) {
  await ensureChatTables();
  const pool = await getPool();
  
  // Verify chat belongs to user
  const [chatRows] = await pool.execute(
    `SELECT id FROM chats WHERE id = ? AND user_id = ?`,
    [chatId, String(userId)]
  );

  if (chatRows.length === 0) {
    throw new Error('Chat not found or access denied');
  }

  await pool.execute(
    `UPDATE chats SET title = ? WHERE id = ?`,
    [title, chatId]
  );

  return { success: true };
}


// Delete chat
async function deleteChat(chatId, userId) {
  await ensureChatTables();
  const pool = await getPool();
  
  const [result] = await pool.execute(
    `DELETE FROM chats WHERE id = ? AND user_id = ?`,
    [chatId, String(userId)]
  );

  return result.affectedRows > 0;
}

// Set database selection for chat
async function setDatabaseSelection(chatId, userId, databaseId) {
  await ensureChatTables();
  const pool = await getPool();
  
  // Verify chat belongs to user
  const [chatRows] = await pool.execute(
    `SELECT id FROM chats WHERE id = ? AND user_id = ?`,
    [chatId, String(userId)]
  );

  if (chatRows.length === 0) {
    throw new Error('Chat not found or access denied');
  }

  // Remove existing selection
  await pool.execute(
    `DELETE FROM database_selections WHERE chat_id = ?`,
    [chatId]
  );

  // Add new selection
  const selectionId = generateUUID();
  await pool.execute(
    `INSERT INTO database_selections (id, chat_id, database_id) VALUES (?, ?, ?)`,
    [selectionId, chatId, databaseId]
  );

  return true;
}

// Get database selection for chat
async function getDatabaseSelection(chatId, userId) {
  await ensureChatTables();
  const pool = await getPool();
  
  // Verify chat belongs to user
  const [chatRows] = await pool.execute(
    `SELECT id FROM chats WHERE id = ? AND user_id = ?`,
    [chatId, String(userId)]
  );

  if (chatRows.length === 0) {
    throw new Error('Chat not found or access denied');
  }

  const [rows] = await pool.execute(
    `SELECT database_id FROM database_selections WHERE chat_id = ? ORDER BY selected_at DESC LIMIT 1`,
    [chatId]
  );

  return rows.length > 0 ? rows[0].database_id : null;
}

module.exports = {
  createChat,
  getChats,
  getMessages,
  addMessage,
  updateChatTitle,
  deleteChat,
  setDatabaseSelection,
  getDatabaseSelection
};