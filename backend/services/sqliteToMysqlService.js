const mysql = require("mysql2/promise");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");              // ADD
const fs = require("fs/promises");         // ADD


// MySQL connection config
const MYSQL_HOST = process.env.MYSQL_HOST || "localhost";
const MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306);
const MYSQL_USER = process.env.MYSQL_USER || "root";
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD ?? process.env.MYSQL_PASS ?? "";
const MYSQL_DATABASE = process.env.MYSQL_DATABASE ?? process.env.MYSQL_DB ?? "query";
const USER_DB_BASE = path.join(process.cwd(), "uploads");

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

async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

function sanitize(name) {
  return String(name || "").replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}

// Resolve the on-disk path of the original .db we saved at upload time
async function getDatabaseFilePath(uid, dbMeta) {
  const base = path.join(USER_DB_BASE, String(uid));
  const fname = sanitize(dbMeta.filename || "");
  const byId = path.join(base, `${dbMeta.id}.db`);
  const byName = path.join(base, fname);
  const byNameDb = path.join(base, fname.endsWith(".db") ? fname : `${fname}.db`);

  console.log("[getDatabaseFilePath] uid:", uid, "dbMeta:", dbMeta);
  console.log("[getDatabaseFilePath] base:", base);
  console.log("[getDatabaseFilePath] fname:", fname);
  console.log("[getDatabaseFilePath] byId:", byId);
  console.log("[getDatabaseFilePath] byName:", byName);
  console.log("[getDatabaseFilePath] byNameDb:", byNameDb);

  const candidates = [byId, byName, byNameDb];

  for (const p of candidates) {
    console.log("[getDatabaseFilePath] checking candidate:", p);
    if (await fileExists(p)) {
      console.log("[getDatabaseFilePath] found file at:", p);
      return p;
    }
  }

  // Last resort: scan dir and try to match id/filename
  try {
    console.log("[getDatabaseFilePath] scanning directory:", base);
    const entries = await fs.readdir(base);
    console.log("[getDatabaseFilePath] directory entries:", entries);
    
    for (const e of entries) {
      console.log("[getDatabaseFilePath] checking entry:", e);
      if (
        e === `${dbMeta.id}.db` ||
        e === fname ||
        e === (fname.endsWith(".db") ? fname : `${fname}.db`)
      ) {
        const p = path.join(base, e);
        console.log("[getDatabaseFilePath] potential match:", p);
        if (await fileExists(p)) {
          console.log("[getDatabaseFilePath] found file via scanning:", p);
          return p;
        }
      }
    }
  } catch (err) {
    console.log("[getDatabaseFilePath] directory scan error:", err.message);
  }

  console.log("[getDatabaseFilePath] no file found");
  return null;
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

// Helper function to check if a schema exists
async function schemaExists(schemaName) {
  try {
    const [rows] = await pool.execute(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [schemaName]
    );
    return rows.length > 0;
  } catch (error) {
    console.warn(`Error checking if schema exists: ${error.message}`);
    return false;
  }
}

// Main function to convert SQLite database to MySQL
async function convertSqliteToMysql(userId, filename, sqliteBuffer, customSchemaName = null) {
  await ensureSchema();
  
  // Create schema name for this user's database (clean name without timestamp)
  let mysqlSchemaName;
  if (customSchemaName) {
    // Use custom schema name if provided, but sanitize it
    mysqlSchemaName = customSchemaName.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 64); // MySQL schema name limit
  } else {
    // Generate clean name using the original filename (no timestamp)
    const cleanFilename = filename.replace(/\.db$/i, '').replace(/[^a-zA-Z0-9_]/g, '_');
    mysqlSchemaName = cleanFilename;
  }
  
  // Handle schema name conflicts by adding a counter if needed
  let finalSchemaName = mysqlSchemaName;
  let counter = 1;
  while (await schemaExists(finalSchemaName)) {
    finalSchemaName = `${mysqlSchemaName}_${counter}`;
    counter++;
  }
  mysqlSchemaName = finalSchemaName;
  
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
  
  // Handle "show all rows" requests by creating separate queries for each table
  const originalQueryLower = query.toLowerCase();
  const isShowAllRowsRequest = (originalQueryLower.includes('show') && originalQueryLower.includes('all') && 
      (originalQueryLower.includes('row') || originalQueryLower.includes('data'))) ||
      (modifiedQuery.toLowerCase().includes('show') && modifiedQuery.toLowerCase().includes('all') && 
      (modifiedQuery.toLowerCase().includes('row') || modifiedQuery.toLowerCase().includes('data')));
      
  if (isShowAllRowsRequest) {
    console.log(`🔍 Detected "show all rows" request, creating separate queries`);
    
    // Get all tables for this database
    const [tableRows] = await pool.execute(
      `SELECT table_name, mysql_table_name FROM database_tables WHERE db_id = ?`,
      [dbId]
    );
    
    console.log(`🔍 Found ${tableRows.length} tables for dbId ${dbId}:`, tableRows);
    
    if (tableRows.length > 0) {
      // Create separate queries for each table instead of UNION ALL
      // This avoids column compatibility issues between different tables
      console.log(`🔍 Creating separate queries for each table instead of UNION ALL`);
      
      const separateQueries = tableRows.map(tableRow => {
        console.log(`🔍 Adding table: ${tableRow.table_name} -> ${tableRow.mysql_table_name}`);
        return `SELECT '${tableRow.table_name}' as table_name, * FROM \`${schemaName}\`.\`${tableRow.mysql_table_name}\``;
      });
      
      // Join with semicolons to create multiple separate queries
      modifiedQuery = separateQueries.join('; ');
      console.log(`🔍 Created separate queries: ${modifiedQuery.substring(0, 200)}...`);
    } else {
      console.log(`⚠️ No tables found for database ${dbId}, trying to get tables directly from MySQL schema`);
      
      // Fallback: Get tables directly from MySQL schema
      try {
        const [actualTables] = await pool.execute(
          `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
          [schemaName]
        );
        
        if (actualTables.length > 0) {
          console.log(`🔍 Found ${actualTables.length} tables directly from MySQL schema:`, actualTables);
          
          const separateQueries = actualTables.map(table => {
            console.log(`🔍 Adding table: ${table.TABLE_NAME}`);
            return `SELECT '${table.TABLE_NAME}' as table_name, * FROM \`${schemaName}\`.\`${table.TABLE_NAME}\``;
          });
          
          modifiedQuery = separateQueries.join('; ');
          console.log(`🔍 Created fallback separate queries: ${modifiedQuery.substring(0, 200)}...`);
        } else {
          console.log(`⚠️ No tables found in MySQL schema ${schemaName}`);
        }
      } catch (err) {
        console.error(`❌ Error getting tables from MySQL schema:`, err.message);
      }
    }
  } else {
    // Replace table names with schema.table format (only if not already handled by separate queries)
    const [tableRows] = await pool.execute(
      `SELECT table_name, mysql_table_name FROM database_tables WHERE db_id = ?`,
      [dbId]
    );
    
    for (const tableRow of tableRows) {
      // More specific regex to only match table names in FROM clauses, not in string literals
      const regex = new RegExp(`\\bFROM\\s+${tableRow.table_name}\\b`, 'gi');
      modifiedQuery = modifiedQuery.replace(regex, `FROM \`${schemaName}\`.\`${tableRow.mysql_table_name}\``);
    }
  }
  
  // Handle multiple SELECT statements
  console.log(`🔍 Executing query: ${modifiedQuery}`);
  
  // Check if query contains multiple SELECT statements
  const selectStatements = modifiedQuery.split(';').filter(stmt => stmt.trim().toUpperCase().startsWith('SELECT'));
  
  if (selectStatements.length > 1) {
    console.log(`🔍 Found ${selectStatements.length} SELECT statements, executing separately`);
    let allResults = [];
    let allColumns = new Set();
    
    for (const statement of selectStatements) {
      const trimmedStmt = statement.trim();
      if (trimmedStmt) {
        try {
          console.log(`🔍 Executing: ${trimmedStmt.substring(0, 100)}...`);
          const [results] = await pool.execute(trimmedStmt);
          console.log(`✅ Statement returned ${results.length} rows`);
          
          if (results.length > 0) {
            allResults = allResults.concat(results);
            // Collect all column names
            Object.keys(results[0]).forEach(col => allColumns.add(col));
          }
        } catch (err) {
          console.error(`❌ Error executing statement: ${trimmedStmt}`, err.message);
          // Continue with other statements
        }
      }
    }
    
    console.log(`✅ Multiple queries executed successfully, returned ${allResults.length} total rows`);
    console.log(`📊 Columns found: ${Array.from(allColumns).join(', ')}`);
    return allResults;
  } else {
    // Single query execution
    const [results] = await pool.execute(modifiedQuery);
    console.log(`✅ Query executed successfully, returned ${results.length} rows`);
    return results;
  }
}

// Get list of user's databases (with real table/row counts)
async function listUserDatabases(userId) {
  await ensureSchema();
  
  // First, sync all databases to ensure metadata is up-to-date
  try {
    await syncAllUserDatabases(userId);
  } catch (err) {
    console.warn(`⚠️ Failed to sync databases for user ${userId}:`, err.message);
    // Continue with the query even if sync fails
  }
  
  const [rows] = await pool.execute(
    `SELECT 
       d.id,
       d.filename,
       d.mysql_schema_name,
       d.created_at,
       COUNT(t.table_name) AS tableCount,
       COALESCE(SUM(t.row_count), 0) AS totalRows
     FROM user_databases d
     LEFT JOIN database_tables t ON d.id = t.db_id
     WHERE d.user_id = ?
     GROUP BY d.id, d.filename, d.mysql_schema_name, d.created_at
     ORDER BY d.created_at DESC`,
    [String(userId)]
  );
  
  return rows.map(row => ({
    id: row.id,
    filename: row.filename,
    mysqlSchemaName: row.mysql_schema_name,
    tableCount: Number(row.tableCount) || 0,
    totalRows: Number(row.totalRows) || 0,
    created_at: row.created_at
  }));
}

// Migrate existing schemas to clean names (remove timestamps)
async function migrateSchemaNames(userId = null) {
  await ensureSchema();
  
  try {
    // Get all databases that have timestamped schema names
    const whereClause = userId ? 'WHERE d.user_id = ?' : '';
    const params = userId ? [String(userId)] : [];
    
    const [rows] = await pool.execute(
      `SELECT d.id, d.filename, d.mysql_schema_name, d.user_id
       FROM user_databases d
       ${whereClause}
       ORDER BY d.created_at`,
      params
    );
    
    console.log(`🔄 Found ${rows.length} databases to check for migration`);
    
    for (const row of rows) {
      const currentSchemaName = row.mysql_schema_name;
      const filename = row.filename;
      
      // Check if schema name has timestamp pattern (ends with _ followed by 8 digits)
      const timestampPattern = /_(\d{8})$/;
      if (timestampPattern.test(currentSchemaName)) {
        // Extract clean name (remove timestamp)
        const cleanName = currentSchemaName.replace(timestampPattern, '');
        
        // Check if clean schema name already exists
        if (await schemaExists(cleanName)) {
          console.log(`⚠️  Clean schema name '${cleanName}' already exists, skipping migration for '${currentSchemaName}'`);
          continue;
        }
        
        // Rename the MySQL schema
        try {
          await pool.execute(`RENAME DATABASE \`${currentSchemaName}\` TO \`${cleanName}\``);
          
          // Update the database record
          await pool.execute(
            `UPDATE user_databases SET mysql_schema_name = ? WHERE id = ?`,
            [cleanName, row.id]
          );
          
          console.log(`✅ Migrated schema: ${currentSchemaName} → ${cleanName}`);
        } catch (error) {
          console.error(`❌ Failed to migrate schema ${currentSchemaName}:`, error.message);
        }
      }
    }
    
    console.log('🎉 Schema migration completed');
  } catch (error) {
    console.error('❌ Schema migration failed:', error.message);
  }
}

// Clean up orphaned database entries (databases that no longer exist in MySQL)
async function cleanupOrphanedDatabases(userId) {
  await ensureSchema();
  
  try {
    const [rows] = await pool.execute(
      `SELECT d.id, d.mysql_schema_name FROM user_databases d WHERE d.user_id = ?`,
      [String(userId)]
    );
    
    for (const row of rows) {
      const schemaName = row.mysql_schema_name;
      
      // Check if the schema exists in MySQL
      const [schemaExists] = await pool.execute(
        `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
        [schemaName]
      );
      
      if (schemaExists[0].count === 0) {
        console.log(`🗑️ Cleaning up orphaned database ${row.id} (schema: ${schemaName})`);
        
        // Delete from user_databases (this will cascade to database_tables)
        await pool.execute(
          `DELETE FROM user_databases WHERE id = ? AND user_id = ?`,
          [row.id, String(userId)]
        );
      }
    }
    
    return true;
  } catch (err) {
    console.error(`❌ Error cleaning up orphaned databases:`, err);
    return false;
  }
}

// Update database_tables when a table is dropped
async function updateDatabaseTablesAfterDrop(dbId, userId, droppedTableName) {
  await ensureSchema();
  
  try {
    // Remove the dropped table from database_tables
    const [result] = await pool.execute(
      `DELETE FROM database_tables WHERE db_id = ? AND table_name = ?`,
      [dbId, droppedTableName]
    );
    
    console.log(`🗑️ Removed table ${droppedTableName} from database_tables for dbId ${dbId}`);
    return result.affectedRows > 0;
  } catch (err) {
    console.error(`❌ Error updating database_tables after drop:`, err);
    return false;
  }
}

// Extract table name from DELETE statement
function extractTableNameFromDelete(deleteSQL) {
  try {
    // Handle various DELETE patterns:
    // DELETE FROM table_name ...
    // DELETE FROM schema.table_name ...
    // DELETE FROM `table_name` ...
    // DELETE FROM `schema`.`table_name` ...
    const deleteMatch = deleteSQL.toLowerCase().match(/delete\s+from\s+(?:[`"]?\w+[`"]?\.)?[`"]?(\w+)[`"]?/i);
    if (!deleteMatch) {
      console.error(`❌ Could not extract table name from DELETE statement: ${deleteSQL}`);
      return null;
    }
    
    return deleteMatch[1];
  } catch (err) {
    console.error(`❌ Error extracting table name from DELETE statement:`, err);
    return null;
  }
}

// Extract table name from INSERT statement
function extractTableNameFromInsert(insertSQL) {
  try {
    // Handle various INSERT patterns:
    // INSERT INTO table_name ...
    // INSERT INTO schema.table_name ...
    // INSERT INTO `table_name` ...
    // INSERT INTO `schema`.`table_name` ...
    const insertMatch = insertSQL.toLowerCase().match(/insert\s+into\s+(?:[`"]?\w+[`"]?\.)?[`"]?(\w+)[`"]?/i);
    if (!insertMatch) {
      console.error(`❌ Could not extract table name from INSERT statement: ${insertSQL}`);
      return null;
    }
    
    return insertMatch[1];
  } catch (err) {
    console.error(`❌ Error extracting table name from INSERT statement:`, err);
    return null;
  }
}

// Update row count for a specific table in database_tables
async function updateTableRowCount(dbId, tableName) {
  try {
    await ensureSchema();
    
    // Get database info to determine schema name
    const [dbRows] = await pool.execute(
      `SELECT mysql_schema_name FROM user_databases WHERE id = ?`,
      [dbId]
    );
    
    if (dbRows.length === 0) {
      console.error(`❌ Database not found for dbId ${dbId}`);
      return false;
    }
    
    const schemaName = dbRows[0].mysql_schema_name;
    
    // Get current row count for the table
    let rowCount = 0;
    try {
      const [countRows] = await pool.execute(
        `SELECT COUNT(*) as count FROM \`${schemaName}\`.\`${tableName}\``
      );
      rowCount = countRows[0].count;
    } catch (err) {
      console.warn(`⚠️ Could not get row count for table ${tableName}:`, err.message);
      return false;
    }
    
    // Update the row count in database_tables
    const [result] = await pool.execute(
      `UPDATE database_tables SET row_count = ? WHERE db_id = ? AND table_name = ?`,
      [rowCount, dbId, tableName]
    );
    
    if (result.affectedRows > 0) {
      console.log(`✅ Updated row count for table ${tableName} to ${rowCount} rows`);
      return true;
    } else {
      console.warn(`⚠️ No rows updated for table ${tableName} in database_tables`);
      return false;
    }
  } catch (err) {
    console.error(`❌ Error updating row count for table ${tableName}:`, err);
    return false;
  }
}

// Update database_tables when a table is created
async function updateDatabaseTablesAfterCreation(dbId, createTableSQL) {
  try {
    await ensureSchema();
    
    // Extract table name from CREATE TABLE statement
    // Handle both "CREATE TABLE table_name" and "CREATE TABLE schema.table_name"
    const createMatch = createTableSQL.toLowerCase().match(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:[`"]?\w+[`"]?\.)?[`"]?(\w+)[`"]?/i);
    if (!createMatch) {
      console.error(`❌ Could not extract table name from CREATE TABLE statement: ${createTableSQL}`);
      return;
    }
    
    const tableName = createMatch[1];
    console.log(`📊 Adding new table ${tableName} to database_tables for dbId ${dbId}`);
    
    // Get database info to determine schema name
    const [dbRows] = await pool.execute(
      `SELECT mysql_schema_name FROM user_databases WHERE id = ?`,
      [dbId]
    );
    
    if (dbRows.length === 0) {
      console.error(`❌ Database not found for dbId ${dbId}`);
      return;
    }
    
    const schemaName = dbRows[0].mysql_schema_name;
    
    // Get row count for the new table
    let rowCount = 0;
    try {
      const [countRows] = await pool.execute(
        `SELECT COUNT(*) as count FROM \`${schemaName}\`.\`${tableName}\``
      );
      rowCount = countRows[0].count;
    } catch (err) {
      console.warn(`⚠️ Could not get row count for table ${tableName}:`, err.message);
    }
    
    // Add the new table to database_tables
    await pool.execute(
      `INSERT INTO database_tables (db_id, table_name, mysql_table_name, row_count) VALUES (?, ?, ?, ?)`,
      [dbId, tableName, tableName, rowCount]
    );
    
    console.log(`✅ Added table ${tableName} to database_tables with ${rowCount} rows`);
  } catch (err) {
    console.error(`❌ Error updating database_tables after creation:`, err);
  }
}

// Check if a table exists in the actual MySQL database
async function tableExistsInDatabase(dbId, userId, tableName) {
  await ensureSchema();
  
  try {
    // Get database schema name
    const [rows] = await pool.execute(
      `SELECT mysql_schema_name FROM user_databases WHERE id = ? AND user_id = ?`,
      [dbId, String(userId)]
    );
    
    if (rows.length === 0) {
      return false;
    }
    
    const schemaName = rows[0].mysql_schema_name;
    
    // Check if table exists in MySQL
    const [tableRows] = await pool.execute(
      `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
      [schemaName, tableName]
    );
    
    return tableRows[0].count > 0;
  } catch (err) {
    console.error(`❌ Error checking table existence:`, err);
    return false;
  }
}

// Sync all databases for a user
async function syncAllUserDatabases(userId) {
  await ensureSchema();
  
  try {
    // Get all databases for the user
    const [dbRows] = await pool.execute(
      `SELECT id FROM user_databases WHERE user_id = ?`,
      [String(userId)]
    );
    
    console.log(`🔄 Syncing ${dbRows.length} databases for user ${userId}`);
    
    let syncedCount = 0;
    for (const dbRow of dbRows) {
      const success = await syncDatabaseTables(dbRow.id, userId);
      if (success) {
        syncedCount++;
      }
    }
    
    console.log(`✅ Synced ${syncedCount}/${dbRows.length} databases for user ${userId}`);
    return syncedCount;
  } catch (err) {
    console.error(`❌ Error syncing all user databases:`, err);
    return 0;
  }
}

// Sync database_tables with actual MySQL tables
async function syncDatabaseTables(dbId, userId) {
  await ensureSchema();
  
  try {
    // Get database schema name
    const [rows] = await pool.execute(
      `SELECT mysql_schema_name FROM user_databases WHERE id = ? AND user_id = ?`,
      [dbId, String(userId)]
    );
    
    if (rows.length === 0) {
      return false;
    }
    
    const schemaName = rows[0].mysql_schema_name;
    
    // Get actual tables from MySQL
    const [actualTables] = await pool.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ?`,
      [schemaName]
    );
    
    const actualTableNames = actualTables.map(t => t.TABLE_NAME);
    
    // Get tables from database_tables
    const [dbTables] = await pool.execute(
      `SELECT table_name, mysql_table_name FROM database_tables WHERE db_id = ?`,
      [dbId]
    );
    
    const existingTableNames = dbTables.map(t => t.mysql_table_name);
    
    // Remove tables that no longer exist in MySQL
    for (const dbTable of dbTables) {
      if (!actualTableNames.includes(dbTable.mysql_table_name)) {
        await pool.execute(
          `DELETE FROM database_tables WHERE db_id = ? AND table_name = ?`,
          [dbId, dbTable.table_name]
        );
        console.log(`🗑️ Synced: Removed non-existent table ${dbTable.table_name} from database_tables`);
      }
    }
    
    // Add tables that exist in MySQL but are missing from database_tables
    for (const actualTable of actualTables) {
      if (!existingTableNames.includes(actualTable.TABLE_NAME)) {
        // Get row count for the table
        let rowCount = 0;
        try {
          const [countRows] = await pool.execute(
            `SELECT COUNT(*) as count FROM \`${schemaName}\`.\`${actualTable.TABLE_NAME}\``
          );
          rowCount = countRows[0].count;
        } catch (err) {
          console.warn(`⚠️ Could not get row count for table ${actualTable.TABLE_NAME}:`, err.message);
        }
        
        // Add the missing table to database_tables
        await pool.execute(
          `INSERT INTO database_tables (db_id, table_name, mysql_table_name, row_count) VALUES (?, ?, ?, ?)`,
          [dbId, actualTable.TABLE_NAME, actualTable.TABLE_NAME, rowCount]
        );
        console.log(`✅ Synced: Added missing table ${actualTable.TABLE_NAME} to database_tables with ${rowCount} rows`);
      }
    }
    
    return true;
  } catch (err) {
    console.error(`❌ Error syncing database_tables:`, err);
    return false;
  }
}

module.exports = {
  convertSqliteToMysql,
  getDatabaseSchema,
  executeQueryOnUserDb,
  listUserDatabases,
  ensureSchema,
  initializeMySQL,
  isMySQLAvailable,
  updateDatabaseTablesAfterDrop,
  updateDatabaseTablesAfterCreation,
  updateTableRowCount,
  extractTableNameFromInsert,
  extractTableNameFromDelete,
  tableExistsInDatabase,
  syncDatabaseTables,
  syncAllUserDatabases,
  cleanupOrphanedDatabases,
  migrateSchemaNames,
  getDatabaseFilePath,
  get pool() { return pool; }
};
