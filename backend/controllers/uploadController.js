// backend/controllers/uploadController.js
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const {
  convertSqliteToMysql,
  getDatabaseSchema,
  listUserDatabases,
  isMySQLAvailable,
  syncAllUserDatabases,
  // ⬇️ make sure this exists in sqliteToMysqlService.js
  // (implement it if it's not there yet)
  getDatabaseFilePath,
} = require("../services/sqliteToMysqlService");
const { generateRandomData } = require("../utils/randomDataGenerator");
const sqlite3 = require("sqlite3").verbose();
const mysql = require("mysql2/promise");

// email helper (already provided in services/emailService.js)
const { sendEmail } = require("../services/emailService");

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

    const uploadsBase = path.join(process.cwd(), "uploads", String(uid));
    if (!fs.existsSync(uploadsBase)) fs.mkdirSync(uploadsBase, { recursive: true });
    const rawPath = path.join(uploadsBase, `${result.dbId}.db`);
    fs.writeFileSync(rawPath, buffer);
    console.log("💾 saved original SQLite:", rawPath);



    console.log(`✅ Database converted successfully:`, {
      dbId: result.dbId,
      filename: result.filename,
      tables: result.totalTables,
      rows: result.totalRows,
    });

    res.json({
      success: true,
      dbId: result.dbId,
      filename: result.filename,
      user: uid,
      mysqlSchemaName: result.mysqlSchemaName,
      tables: result.tables,
      totalTables: result.totalTables,
      totalRows: result.totalRows,
    });
  } catch (err) {
    console.error("❌ Upload failed:", err);
    res.status(500).json({
      success: false,
      error: "Upload failed: " + err.message,
    });
  }
};

exports.listDBs = async (req, res) => {
  try {
    const uid = getUid(req);
    if (!uid) return res.status(401).json({ success: false, error: "Unauthorized" });

    const databases = await listUserDatabases(uid);
    res.json({ success: true, databases });
  } catch (err) {
    console.error("List DBs error:", err);
    res.status(500).json({ success: false, error: "Failed to list databases" });
  }
};

// Sync all databases for a user
exports.syncDatabases = async (req, res) => {
  try {
    const uid = getUid(req);
    if (!uid) return res.status(401).json({ success: false, error: "Unauthorized" });

    console.log(`🔄 Manual sync requested for user ${uid}`);
    const syncedCount = await syncAllUserDatabases(uid);
    
    res.json({ 
      success: true, 
      message: `Successfully synced ${syncedCount} databases`,
      syncedCount 
    });
  } catch (err) {
    console.error("Sync databases error:", err);
    res.status(500).json({ success: false, error: "Failed to sync databases" });
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
      tables: schemaInfo.tables,
    });
  } catch (err) {
    console.error("Schema error:", err);
    res.status(500).json({ success: false, error: "Failed to read schema" });
  }
};

// Migrate existing schemas to clean names (remove timestamps)
exports.migrateSchemaNames = async (req, res) => {
  try {
    const uid = getUid(req);
    if (!uid) return res.status(401).json({ success: false, error: "Unauthorized" });

    const { migrateSchemaNames } = require('../services/sqliteToMysqlService');
    await migrateSchemaNames(uid);

    res.json({ 
      success: true, 
      message: "Schema names migrated successfully. Dropdown names should now match schema names." 
    });
  } catch (err) {
    console.error("Migration error:", err);
    res.status(500).json({ success: false, error: "Failed to migrate schema names" });
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

    // Create a temporary SQLite DB file with realistic random data
    const os = require("os");
    const tmpPath = path.join(os.tmpdir(), `demo-${Date.now()}.db`);
    const tmpDir = path.dirname(tmpPath);
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const db = new sqlite3.Database(tmpPath);
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        // Create tables with proper structure
        db.run(
          `
          CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            city TEXT,
            country TEXT,
            created_at DATE
          );
        `,
          (e) => (e ? reject(e) : null)
        );

        db.run(
          `
          CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price DECIMAL(10,2) NOT NULL,
            category TEXT,
            stock_quantity INTEGER DEFAULT 0,
            created_at DATE
          );
        `,
          (e) => (e ? reject(e) : null)
        );

        db.run(
          `
          CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER,
            product_id INTEGER,
            quantity INTEGER NOT NULL,
            total_amount DECIMAL(10,2) NOT NULL,
            order_date DATE,
            status TEXT DEFAULT 'pending',
            FOREIGN KEY (customer_id) REFERENCES customers(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
          );
        `,
          (e) => (e ? reject(e) : null)
        );

        // Generate realistic random data
        const data = generateRandomData();

        // Insert customers
        const customerStmt = db.prepare(
          `
          INSERT INTO customers (name, email, phone, city, country, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `
        );
        data.customers.forEach((customer) => {
          customerStmt.run([
            customer.name,
            customer.email,
            customer.phone,
            customer.city,
            customer.country,
            customer.created_at,
          ]);
        });
        customerStmt.finalize();

        // Insert products
        const productStmt = db.prepare(
          `
          INSERT INTO products (name, description, price, category, stock_quantity, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `
        );
        data.products.forEach((product) => {
          productStmt.run([
            product.name,
            product.description,
            product.price,
            product.category,
            product.stock_quantity,
            product.created_at,
          ]);
        });
        productStmt.finalize();

        // Insert orders
        const orderStmt = db.prepare(
          `
          INSERT INTO orders (customer_id, product_id, quantity, total_amount, order_date, status)
          VALUES (?, ?, ?, ?, ?, ?)
        `
        );
        data.orders.forEach((order) => {
          orderStmt.run([
            order.customer_id,
            order.product_id,
            order.quantity,
            order.total_amount,
            order.order_date,
            order.status,
          ]);
        });
        orderStmt.finalize((e) => (e ? reject(e) : resolve()));
      });
    });
    db.close();

    const buffer = fs.readFileSync(tmpPath);
    const timestamp = Date.now();
    const demoFilename = `demo-database-${timestamp}.db`;
    const result = await convertSqliteToMysql(uid, demoFilename, buffer);

    const uploadsBase = path.join(process.cwd(), "uploads", String(uid));
    if (!fs.existsSync(uploadsBase)) fs.mkdirSync(uploadsBase, { recursive: true });
    const rawPath = path.join(uploadsBase, `${result.dbId}.db`);
    fs.writeFileSync(rawPath, buffer);
    console.log("💾 saved demo SQLite:", rawPath);



    // cleanup temp demo file
    try {
      fs.unlinkSync(tmpPath);
    } catch (_) {}

    console.log(`✅ Demo database created successfully:`, {
      dbId: result.dbId,
      filename: demoFilename,
      tables: result.totalTables,
      rows: result.totalRows,
    });

    res.json({
      success: true,
      dbId: result.dbId,
      filename: demoFilename,
      mysqlSchemaName: result.mysqlSchemaName,
      tables: result.tables,
      totalTables: result.totalTables,
      totalRows: result.totalRows,
    });
  } catch (err) {
    console.error("❌ Create demo DB failed:", err);
    res.status(500).json({ success: false, error: "Failed to create demo database: " + err.message });
  }
};

// Delete database
exports.deleteDatabase = async (req, res) => {
  try {
    const uid = getUid(req);
    if (!uid) return res.status(401).json({ success: false, error: "Unauthorized" });

    const { dbId } = req.params;
    if (!dbId) {
      return res.status(400).json({ success: false, error: "Database ID is required" });
    }

    console.log(`🗑️ Deleting database ${dbId} for user ${uid}`);

    // Create MySQL connection
    const pool = mysql.createPool({
      host: process.env.MYSQL_HOST || "localhost",
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER || "root",
      password: process.env.MYSQL_PASSWORD ?? process.env.MYSQL_PASS ?? "",
      database: process.env.MYSQL_DATABASE ?? process.env.MYSQL_DB ?? "query",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // Get database info
    const [rows] = await pool.execute(
      `SELECT mysql_schema_name FROM user_databases WHERE id = ? AND user_id = ?`,
      [dbId, String(uid)]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Database not found" });
    }

    const schemaName = rows[0].mysql_schema_name;

    // Drop the MySQL schema
    await pool.execute(`DROP SCHEMA IF EXISTS \`${schemaName}\``);
    console.log(`✅ Dropped MySQL schema: ${schemaName}`);

    // Remove from user_databases table
    await pool.execute(`DELETE FROM user_databases WHERE id = ? AND user_id = ?`, [dbId, String(uid)]);

    // Remove from database_tables table
    await pool.execute(`DELETE FROM database_tables WHERE db_id = ?`, [dbId]);

    console.log(`✅ Database ${dbId} deleted successfully`);

    // Close the pool
    await pool.end();

    res.json({
      success: true,
      message: "Database deleted successfully",
      dbId: dbId,
    });
  } catch (error) {
    console.error("Delete database error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Database deletion failed",
    });
  }
};

// === NEW: Email the raw .db file ===
exports.emailDatabase = async (req, res) => {
  try {
    const uid = getUid(req);
    if (!uid) return res.status(401).json({ success: false, error: "Unauthorized" });

    const { dbId } = req.params;
    if (!dbId) return res.status(400).json({ success: false, error: "Database ID is required" });

    let databases = [];
    let dbMeta = null;
    
    try {
      databases = await listUserDatabases(uid);
      console.log("[emailDatabase] listUserDatabases:", databases);
      dbMeta = databases.find((d) => String(d.id) === String(dbId));
    } catch (mysqlError) {
      console.log("[emailDatabase] MySQL not available, using fallback approach:", mysqlError.message);
      // If MySQL is not available, create a minimal dbMeta object
      dbMeta = {
        id: dbId,
        filename: `database-${dbId}.db`,
        name: `Database ${dbId}`
      };
    }
    
    if (!dbMeta) return res.status(404).json({ success: false, error: "Database not found" });

    // Try to find the database file using multiple approaches
    let dbPath = await getDatabaseFilePath(uid, dbMeta);
    console.log("[emailDatabase] resolved dbPath:", dbPath, "dbMeta:", dbMeta);

    // If getDatabaseFilePath doesn't find it, try direct path construction
    if (!dbPath) {
      const uploadsBase = path.join(process.cwd(), "uploads", String(uid));
      const directPath = path.join(uploadsBase, `${dbId}.db`);
      console.log("[emailDatabase] trying direct path:", directPath);
      
      try {
        await fsp.access(directPath);
        dbPath = directPath;
        console.log("[emailDatabase] found file at direct path:", dbPath);
      } catch (e) {
        console.log("[emailDatabase] direct path not accessible:", e.message);
        
        // Try alternative path construction - sometimes the file might be named differently
        const altPath = path.join(uploadsBase, `${dbMeta.filename || dbMeta.name || dbId}.db`);
        console.log("[emailDatabase] trying alternative path:", altPath);
        try {
          await fsp.access(altPath);
          dbPath = altPath;
          console.log("[emailDatabase] found file at alternative path:", dbPath);
        } catch (e2) {
          console.log("[emailDatabase] alternative path not accessible:", e2.message);
        }
      }
    }

    // If still not found, check if the uploads directory exists and list files
    if (!dbPath) {
      const uploadsBase = path.join(process.cwd(), "uploads", String(uid));
      console.log("[emailDatabase] checking uploads directory:", uploadsBase);
      
      try {
        const files = await fsp.readdir(uploadsBase);
        console.log("[emailDatabase] files in uploads directory:", files);
        
        // Look for any .db file that might match
        for (const file of files) {
          if (file.endsWith('.db')) {
            const potentialPath = path.join(uploadsBase, file);
            try {
              await fsp.access(potentialPath);
              dbPath = potentialPath;
              console.log("[emailDatabase] found .db file:", dbPath);
              break;
            } catch (e) {
              console.log("[emailDatabase] file not accessible:", file, e.message);
            }
          }
        }
      } catch (e) {
        console.log("[emailDatabase] uploads directory not accessible:", e.message);
      }
    }

    // Final fallback: if we still don't have a path but we know the file should exist,
    // try to construct the most likely path based on the database ID
    if (!dbPath) {
      const uploadsBase = path.join(process.cwd(), "uploads", String(uid));
      const fallbackPath = path.join(uploadsBase, `${dbId}.db`);
      console.log("[emailDatabase] trying final fallback path:", fallbackPath);
      
      try {
        await fsp.access(fallbackPath);
        dbPath = fallbackPath;
        console.log("[emailDatabase] found file at fallback path:", dbPath);
      } catch (e) {
        console.log("[emailDatabase] fallback path not accessible:", e.message);
      }
    }

    if (!dbPath) {
      return res.status(404).json({ 
        success: false, 
        error: "Database file not found. The file may have been deleted or moved." 
      });
    }

    const to = (req.body?.to || "").trim();
    const recipient = to || req.user?.email;
    if (!recipient) return res.status(400).json({ success: false, error: "No recipient email" });

    const fileName = `${dbMeta.filename || `database-${dbId}`}.db`;

    const info = await sendEmail({
      to: recipient,
      subject: `Your database file: ${fileName}`,
      html: `<p>Attached is your database file <b>${fileName}</b>.</p>`,
      attachments: [{ filename: fileName, path: dbPath }],
    });

    console.log("✉️ Sent:", info.messageId);
    return res.json({ success: true, message: `Database emailed to ${recipient}` });
  } catch (err) {
    console.error("emailDatabase error:", err);
    return res.status(500).json({ success: false, error: String(err.message || err) });
  }
};
