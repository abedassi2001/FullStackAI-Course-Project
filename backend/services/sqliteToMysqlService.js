const mysql = require("mysql2/promise");
const sqlite3 = require("sqlite3").verbose();

// MySQL connection config
const MYSQL_HOST = process.env.MYSQL_HOST || "localhost";
const MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306);
const MYSQL_USER = process.env.MYSQL_USER || "root";
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD ?? process.env.MYSQL_PASS ?? "";
const MYSQL_DATABASE = process.env.MYSQL_DATABASE ?? process.env.MYSQL_DB ?? "query";

let pool;

// Initialize MySQL connection
async function initializeMySQL() {
  try {
    pool = mysql.createPool({
      host: MYSQL_HOST,
      port: MYSQL_PORT,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: true,
    });
    
    // Test the connection
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    
    console.log("✅ MySQL connection established");
    return true;
  } catch (error) {
    console.error("❌ MySQL connection failed:", error.message);
    return false;
  }
}

// Lightweight availability check for controllers to preflight without throwing
async function isMySQLAvailable() {
  // If a pool already exists and schema is ready or can be pinged, consider available
  try {
    if (pool) {
      const conn = await pool.getConnection();
      await conn.ping();
      conn.release();
      return true;
    }
  } catch (_) {
    // fall through to initialize
  }
  return initializeMySQL();
}

// Ensure schema tables exist
let schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return;
  
  if (!pool) {
    const connected = await initializeMySQL();
    if (!connected) {
      throw new Error("MySQL connection failed. Please check your MySQL configuration.");
    }
  }
  
  // Create user_databases table
  const userDatabasesDDL = `
    CREATE TABLE IF NOT EXISTS user_databases (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      filename VARCHAR(255) NOT NULL,
      mysql_schema_name VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX (user_id)
    )
  `;
  
  // Create database_tables table
  const databaseTablesDDL = `
    CREATE TABLE IF NOT EXISTS database_tables (
      id INT AUTO_INCREMENT PRIMARY KEY,
      db_id INT NOT NULL,
      table_name VARCHAR(255) NOT NULL,
      mysql_table_name VARCHAR(255) NOT NULL,
      row_count INT DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (db_id) REFERENCES user_databases(id) ON DELETE CASCADE,
      INDEX (db_id)
    )
  `;
  
  // Execute each CREATE TABLE statement separately
  await pool.execute(userDatabasesDDL);
  await pool.execute(databaseTablesDDL);
  
  schemaReady = true;
}

// Convert SQLite data type to MySQL data type
function convertDataType(sqliteType) {
  if (!sqliteType) return "TEXT";
  
  const type = sqliteType.toUpperCase();
  
  if (type.includes("INTEGER") || type.includes("INT")) {
    return "INT";
  }
  if (type.includes("REAL") || type.includes("FLOAT") || type.includes("DOUBLE")) {
    return "DOUBLE";
  }
  if (type.includes("BLOB")) {
    return "LONGBLOB";
  }
  if (type.includes("VARCHAR") || type.includes("CHAR")) {
    return "TEXT";
  }
  if (type.includes("BOOLEAN") || type.includes("BOOL")) {
    return "BOOLEAN";
  }
  if (type.includes("DATE") || type.includes("TIME")) {
    return "DATETIME";
  }
  
  return "TEXT";
}

// Extract column definitions from SQLite CREATE statement
function parseCreateStatement(createSql) {
  const columns = [];
  
  // Remove CREATE TABLE and table name, get the column definitions
  // Handle both [table] and `table` and table syntax
  const match = createSql.match(/CREATE TABLE\s+[`"\[\]]?\w+[`"\[\]]?\s*\(([\s\S]*)\)/i);
  if (!match) return columns;
  
  let columnDefs = match[1];
  
  // Handle nested parentheses (like in constraints)
  let parenCount = 0;
  let currentColumn = '';
  const columnParts = [];
  
  for (let i = 0; i < columnDefs.length; i++) {
    const char = columnDefs[i];
    if (char === '(') parenCount++;
    else if (char === ')') parenCount--;
    else if (char === ',' && parenCount === 0) {
      columnParts.push(currentColumn.trim());
      currentColumn = '';
      continue;
    }
    currentColumn += char;
  }
  
  if (currentColumn.trim()) {
    columnParts.push(currentColumn.trim());
  }
  
  for (const part of columnParts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    
    // Skip table-level constraints (FOREIGN KEY, CHECK, etc.)
    if (trimmed.toUpperCase().startsWith('FOREIGN KEY') || 
        trimmed.toUpperCase().startsWith('CHECK') ||
        trimmed.toUpperCase().startsWith('UNIQUE') ||
        trimmed.toUpperCase().startsWith('CONSTRAINT')) {
      continue;
    }
    
    // Split by whitespace and get the first two parts (name and type)
    const tokens = trimmed.split(/\s+/).filter(token => token.length > 0);
    if (tokens.length < 2) continue;
    
    const name = tokens[0].replace(/[`"\[\]]/g, '');
    const type = tokens[1].replace(/[`"\[\]]/g, '');
    const isPrimaryKey = trimmed.toUpperCase().includes('PRIMARY KEY');
    const isNotNull = trimmed.toUpperCase().includes('NOT NULL');
    const isAutoIncrement = trimmed.toUpperCase().includes('AUTOINCREMENT');
    
    columns.push({
      name,
      type: convertDataType(type),
      isPrimaryKey,
      isNotNull,
      isAutoIncrement
    });
  }
  
  return columns;
}

// Convert SQLite table to MySQL table
async function convertTableToMySQL(sqliteDb, tableName, mysqlTableName, dbId, schemaName) {
  // Get table schema from SQLite
  const createSql = await new Promise((resolve, reject) => {
    sqliteDb.get(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
      [tableName],
      (err, row) => {
        if (err) return reject(err);
        resolve(row?.sql || '');
      }
    );
  });
  
  if (!createSql) {
    throw new Error(`Table ${tableName} not found in SQLite database`);
  }
  
  // Parse column definitions
  const columns = parseCreateStatement(createSql);
  if (columns.length === 0) {
    console.error(`Failed to parse columns for table ${tableName}`);
    console.error(`CREATE SQL: ${createSql}`);
    throw new Error(`Could not parse columns for table ${tableName}`);
  }
  
  console.log(`Parsed ${columns.length} columns for table ${tableName}:`, columns.map(c => c.name));
  
  // Create MySQL table
  const columnDefs = columns.map(col => {
    let def = `\`${col.name}\` ${col.type}`;
    if (col.isNotNull) def += ' NOT NULL';
    if (col.isPrimaryKey) {
      def += ' PRIMARY KEY';
      if (col.isAutoIncrement || col.type === 'INT') {
        def += ' AUTO_INCREMENT';
      }
    }
    return def;
  }).join(', ');
  
  const createMysqlSql = `CREATE TABLE IF NOT EXISTS \`${schemaName}\`.\`${mysqlTableName}\` (${columnDefs})`;
  
  await pool.execute(createMysqlSql);
  
  // Get all data from SQLite table
  const rows = await new Promise((resolve, reject) => {
    sqliteDb.all(`SELECT * FROM \`${tableName}\``, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
  
  // Insert data into MySQL table
  if (rows.length > 0) {
    const columnNames = columns.map(col => `\`${col.name}\``).join(', ');
    const placeholders = columns.map(() => '?').join(', ');
    const insertSql = `INSERT INTO \`${schemaName}\`.\`${mysqlTableName}\` (${columnNames}) VALUES (${placeholders})`;
    
    for (const row of rows) {
      const values = columns.map(col => row[col.name]);
      await pool.execute(insertSql, values);
    }
  }
  
  // Store table metadata
  await pool.execute(
    `INSERT INTO database_tables (db_id, table_name, mysql_table_name, row_count) VALUES (?, ?, ?, ?)`,
    [dbId, tableName, mysqlTableName, rows.length]
  );
  
  return {
    tableName,
    mysqlTableName,
    rowCount: rows.length,
    columns: columns.map(col => col.name)
  };
}

// Main function to convert SQLite database to MySQL
async function convertSqliteToMysql(userId, filename, sqliteBuffer, customSchemaName = null) {
  await ensureSchema();
  
  // Create unique schema name for this user's database (shorter name)
  let mysqlSchemaName;
  if (customSchemaName) {
    // Use custom schema name if provided, but sanitize it
    mysqlSchemaName = customSchemaName.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 64); // MySQL schema name limit
  } else {
    // Generate default name if no custom name provided
    const timestamp = Date.now().toString().slice(-8); // Last 8 digits
    const baseName = filename.replace(/\.db$/i, '').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 10); // Max 10 chars
    mysqlSchemaName = `u${userId.slice(-6)}_${baseName}_${timestamp}`;
  }
  
  // Create the MySQL schema (database)
  await pool.execute(`CREATE DATABASE IF NOT EXISTS \`${mysqlSchemaName}\``);
  console.log(`✅ Created MySQL schema: ${mysqlSchemaName}`);
  
  // Store database metadata
  const [result] = await pool.execute(
    `INSERT INTO user_databases (user_id, filename, mysql_schema_name) VALUES (?, ?, ?)`,
    [String(userId), filename, mysqlSchemaName]
  );
  
  const dbId = result.insertId;
  
  // Create temporary SQLite database from buffer
  const fs = require("fs");
  const path = require("path");
  const os = require("os");
  
  // Create temporary file from buffer
  const tmpDir = path.join(os.tmpdir(), "sqlite-temp");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  
  const tmpPath = path.join(tmpDir, `temp-${Date.now()}.db`);
  fs.writeFileSync(tmpPath, sqliteBuffer);
  
  const sqliteDb = await new Promise((resolve, reject) => {
    const db = new sqlite3.Database(tmpPath, (err) => {
      if (err) return reject(err);
      resolve(db);
    });
  });
  
  try {
    // Get all table names from SQLite
    const tables = await new Promise((resolve, reject) => {
      sqliteDb.all(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows.map(row => row.name));
        }
      );
    });
    
    if (tables.length === 0) {
      throw new Error('No tables found in SQLite database');
    }
    
    const convertedTables = [];
    
    // Convert each table
    for (const tableName of tables) {
      const mysqlTableName = tableName; // Use original table name within the schema
      const tableInfo = await convertTableToMySQL(sqliteDb, tableName, mysqlTableName, dbId, mysqlSchemaName);
      convertedTables.push(tableInfo);
    }
    
    return {
      dbId,
      filename,
      mysqlSchemaName,
      tables: convertedTables,
      totalTables: convertedTables.length,
      totalRows: convertedTables.reduce((sum, table) => sum + table.rowCount, 0)
    };
    
  } finally {
    sqliteDb.close();
    // Clean up temporary file
    try { fs.unlinkSync(tmpPath); } catch (_) {}
  }
}

// Get database schema information
async function getDatabaseSchema(dbId, userId) {
  await ensureSchema();
  
  const [rows] = await pool.execute(
    `SELECT d.mysql_schema_name, t.table_name, t.mysql_table_name, t.row_count
     FROM user_databases d
     LEFT JOIN database_tables t ON d.id = t.db_id
     WHERE d.id = ? AND d.user_id = ?
     ORDER BY t.table_name`,
    [dbId, String(userId)]
  );
  
  if (rows.length === 0) {
    return null;
  }
  
  const schemaName = rows[0].mysql_schema_name;
  const tables = [];
  
  // Group rows by table and get column information
  const tableMap = new Map();
  for (const row of rows) {
    if (!tableMap.has(row.table_name)) {
      tableMap.set(row.table_name, {
        name: row.table_name,
        mysqlName: row.mysql_table_name,
        rowCount: row.row_count,
        columns: []
      });
    }
  }
  
  // Get column information for each table
  for (const [tableName, tableInfo] of tableMap) {
    try {
      const [columnRows] = await pool.execute(
        `SELECT COLUMN_NAME as name, DATA_TYPE as type, IS_NULLABLE as nullable, COLUMN_KEY as key_type
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
         ORDER BY ORDINAL_POSITION`,
        [schemaName, tableInfo.mysqlName]
      );
      
      tableInfo.columns = columnRows.map(col => ({
        name: col.name,
        type: col.type,
        nullable: col.nullable === 'YES',
        isPrimaryKey: col.key_type === 'PRI'
      }));
    } catch (err) {
      console.warn(`Could not get column info for table ${tableName}:`, err.message);
      tableInfo.columns = [];
    }
    
    tables.push(tableInfo);
  }
  
  const dbInfo = {
    id: dbId,
    mysqlSchemaName: schemaName,
    tables: tables
  };
  
  return dbInfo;
}

// Execute query on user's MySQL database
async function executeQueryOnUserDb(dbId, userId, query) {
  await ensureSchema();
  
  // Get database schema name
  const [rows] = await pool.execute(
    `SELECT mysql_schema_name FROM user_databases WHERE id = ? AND user_id = ?`,
    [dbId, String(userId)]
  );
  
  if (rows.length === 0) {
    throw new Error('Database not found');
  }
  
  const schemaName = rows[0].mysql_schema_name;
  
  // Convert SQLite-specific queries to MySQL equivalents
  let modifiedQuery = query;
  
  // Handle SHOW TABLES - convert to schema-specific query
  console.log(`🔍 Original query: "${query}"`);
  console.log(`🔍 Schema name: "${schemaName}"`);
  
  if (modifiedQuery.trim().toUpperCase().replace(';', '') === 'SHOW TABLES') {
    modifiedQuery = `SELECT TABLE_NAME as Tables_in_${schemaName} FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '${schemaName}'`;
    console.log(`🔍 Converted SHOW TABLES to: "${modifiedQuery}"`);
  }
  
  // Handle SQLite schema queries
  if (modifiedQuery.includes('sqlite_master')) {
    if (modifiedQuery.includes("type='table'")) {
      // Convert "SELECT name FROM sqlite_master WHERE type='table'" to MySQL equivalent
      modifiedQuery = `SELECT TABLE_NAME as name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '${schemaName}'`;
    } else if (modifiedQuery.includes('sql')) {
      // Convert "SELECT sql FROM sqlite_master WHERE type='table'" to MySQL equivalent
      modifiedQuery = `SELECT TABLE_NAME as name, 'CREATE TABLE' as sql FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '${schemaName}'`;
    }
  }
  
  // Replace table names with schema.table format
  const [tableRows] = await pool.execute(
    `SELECT table_name, mysql_table_name FROM database_tables WHERE db_id = ?`,
    [dbId]
  );
  
  for (const tableRow of tableRows) {
    const regex = new RegExp(`\\b${tableRow.table_name}\\b`, 'gi');
    modifiedQuery = modifiedQuery.replace(regex, `\`${schemaName}\`.\`${tableRow.mysql_table_name}\``);
  }
  
  // Execute the modified query
  console.log(`🔍 Executing query: ${modifiedQuery}`);
  const [results] = await pool.execute(modifiedQuery);
  console.log(`✅ Query executed successfully, returned ${results.length} rows`);
  
  return results;
}

// Get list of user's databases
async function listUserDatabases(userId) {
  await ensureSchema();
  
  const [rows] = await pool.execute(
    `SELECT d.id, d.filename, d.mysql_schema_name, d.created_at,
            COUNT(t.id) as table_count,
            SUM(t.row_count) as total_rows
     FROM user_databases d
     LEFT JOIN database_tables t ON d.id = t.db_id
     WHERE d.user_id = ?
     GROUP BY d.id
     ORDER BY d.created_at DESC`,
    [String(userId)]
  );
  
  return rows.map(row => ({
    id: row.id,
    filename: row.filename,
    mysqlSchemaName: row.mysql_schema_name,
    tableCount: row.table_count,
    totalRows: row.total_rows || 0,
    created_at: row.created_at
  }));
}

module.exports = {
  convertSqliteToMysql,
  getDatabaseSchema,
  executeQueryOnUserDb,
  listUserDatabases,
  ensureSchema,
  initializeMySQL,
  isMySQLAvailable
};
