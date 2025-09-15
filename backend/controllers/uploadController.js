// backend/controllers/uploadController.js
const fs = require("fs");
const path = require("path");
const {
  convertSqliteToMysql,
  getDatabaseSchema,
  listUserDatabases,
  isMySQLAvailable,
  cleanupOrphanedDatabases,
} = require("../services/sqliteToMysqlService");
const sqlite3 = require("sqlite3").verbose();

function getUid(req) {
  return req.user?.id || req.user?._id || null;
}

exports.uploadDB = async (req, res) => {
  try {
    const uid = getUid(req);
    if (!uid) return res.status(401).json({ success: false, error: "Unauthorized" });
    if (!req.file) return res.status(400).json({ success: false, error: "DB file is required" });

    // Preflight MySQL availability to avoid throwing with unclear error
    const mysqlOk = await isMySQLAvailable();
    if (!mysqlOk) {
      return res.status(503).json({
        success: false,
        error: "MySQL is not available. Check MYSQL_HOST/PORT/USER/PASSWORD env vars and server permissions.",
      });
    }

    console.log(`🔄 Converting SQLite database: ${req.file.originalname} for user: ${uid}`);
    
    const buffer = req.file.buffer; // multer memory storage
    const result = await convertSqliteToMysql(uid, req.file.originalname, buffer);

    console.log(`✅ Database converted successfully:`, {
      dbId: result.dbId,
      filename: result.filename,
      tables: result.totalTables,
      rows: result.totalRows
    });

    res.json({ 
      success: true, 
      dbId: result.dbId, 
      filename: result.filename, 
      user: uid,
      mysqlSchemaName: result.mysqlSchemaName,
      tables: result.tables,
      totalTables: result.totalTables,
      totalRows: result.totalRows
    });
  } catch (err) {
    console.error("❌ Upload failed:", err);
    res.status(500).json({ 
      success: false, 
      error: "Upload failed: " + err.message 
    });
  }
};

exports.listDBs = async (req, res) => {
  try {
    const uid = getUid(req);
    if (!uid) return res.status(401).json({ success: false, error: "Unauthorized" });

    // Clean up orphaned databases first
    await cleanupOrphanedDatabases(uid);
    
    const databases = await listUserDatabases(uid);
    res.json({ success: true, databases });
  } catch (err) {
    console.error("List DBs error:", err);
    res.status(500).json({ success: false, error: "Failed to list databases" });
  }
};

exports.schemaPreview = async (req, res) => {
  try {
    const uid = getUid(req);
    if (!uid) return res.status(401).json({ success: false, error: "Unauthorized" });

    const dbId = parseInt(req.params.id, 10);
    if (!dbId) return res.status(400).json({ success: false, error: "Invalid id" });

    const schemaInfo = await getDatabaseSchema(dbId, uid);
    if (!schemaInfo) return res.status(404).json({ success: false, error: "Database not found" });

    res.json({ 
      success: true, 
      filename: schemaInfo.filename || "database",
      mysqlSchemaName: schemaInfo.mysqlSchemaName,
      tables: schemaInfo.tables
    });
  } catch (err) {
    console.error("Schema error:", err);
    res.status(500).json({ success: false, error: "Failed to read schema" });
  }
};

// Create a small demo SQLite DB and convert it to MySQL
exports.createDemoDB = async (req, res) => {
  try {
    const uid = getUid(req);
    if (!uid) return res.status(401).json({ success: false, error: "Unauthorized" });

    console.log(`🔄 Creating demo database for user: ${uid}`);

    // Preflight MySQL availability to avoid creating temp files when DB is down
    const mysqlOk = await isMySQLAvailable();
    if (!mysqlOk) {
      return res.status(503).json({
        success: false,
        error: "MySQL is not available. Check MYSQL_HOST/PORT/USER/PASSWORD env vars and server permissions.",
      });
    }

    // Create a temporary SQLite DB file with a simple dataset
    const os = require("os");
    const tmpPath = path.join(os.tmpdir(), `demo-${Date.now()}.db`);

    const db = new sqlite3.Database(tmpPath);
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run(
          "CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY, name TEXT, email TEXT, city TEXT);",
          (e) => (e ? reject(e) : null)
        );
        const stmt = db.prepare("INSERT INTO customers (name, email, city) VALUES (?, ?, ?)");
        const rows = [
          ["Alice Smith", "alice@example.com", "New York"],
          ["Bob Johnson", "bob@example.com", "San Francisco"],
          ["Charlie Brown", "charlie@example.com", "Chicago"],
          ["Diana Prince", "diana@example.com", "Metropolis"],
          ["Ethan Hunt", "ethan@example.com", "Seattle"],
        ];
        for (const r of rows) stmt.run(r);
        stmt.finalize((e) => (e ? reject(e) : resolve()));
      });
    });
    db.close();

    const buffer = fs.readFileSync(tmpPath);
    const result = await convertSqliteToMysql(uid, "demo-database.db", buffer);

    // cleanup temp demo file
    try { fs.unlinkSync(tmpPath); } catch (_) {}

    console.log(`✅ Demo database created successfully:`, {
      dbId: result.dbId,
      tables: result.totalTables,
      rows: result.totalRows
    });

    res.json({ 
      success: true, 
      dbId: result.dbId, 
      filename: "demo-database.db",
      mysqlSchemaName: result.mysqlSchemaName,
      tables: result.tables,
      totalTables: result.totalTables,
      totalRows: result.totalRows
    });
  } catch (err) {
    console.error("❌ Create demo DB failed:", err);
    res.status(500).json({ success: false, error: "Failed to create demo database: " + err.message });
  }
};
