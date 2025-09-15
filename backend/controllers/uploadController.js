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
const { generateRandomData, generateInsertStatements } = require("../utils/randomDataGenerator");
const sqlite3 = require("sqlite3").verbose();
const mysql = require("mysql2/promise");

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

    // Create a temporary SQLite DB file with realistic random data
    const os = require("os");
    const tmpPath = path.join(os.tmpdir(), `demo-${Date.now()}.db`);

    const db = new sqlite3.Database(tmpPath);
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        // Create tables with proper structure
        db.run(`
          CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            city TEXT,
            country TEXT,
            created_at DATE
          );
        `, (e) => (e ? reject(e) : null));

        db.run(`
          CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price DECIMAL(10,2) NOT NULL,
            category TEXT,
            stock_quantity INTEGER DEFAULT 0,
            created_at DATE
          );
        `, (e) => (e ? reject(e) : null));

        db.run(`
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
        `, (e) => (e ? reject(e) : null));

        // Generate realistic random data
        const data = generateRandomData();
        
        // Insert customers
        const customerStmt = db.prepare(`
          INSERT INTO customers (name, email, phone, city, country, created_at) 
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        data.customers.forEach(customer => {
          customerStmt.run([
            customer.name, customer.email, customer.phone, 
            customer.city, customer.country, customer.created_at
          ]);
        });
        customerStmt.finalize();

        // Insert products
        const productStmt = db.prepare(`
          INSERT INTO products (name, description, price, category, stock_quantity, created_at) 
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        data.products.forEach(product => {
          productStmt.run([
            product.name, product.description, product.price, 
            product.category, product.stock_quantity, product.created_at
          ]);
        });
        productStmt.finalize();

        // Insert orders
        const orderStmt = db.prepare(`
          INSERT INTO orders (customer_id, product_id, quantity, total_amount, order_date, status) 
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        data.orders.forEach(order => {
          orderStmt.run([
            order.customer_id, order.product_id, order.quantity, 
            order.total_amount, order.order_date, order.status
          ]);
        });
        orderStmt.finalize((e) => (e ? reject(e) : resolve()));
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
      queueLimit: 0
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
    await pool.execute(
      `DELETE FROM user_databases WHERE id = ? AND user_id = ?`,
      [dbId, String(uid)]
    );

    // Remove from database_tables table
    await pool.execute(
      `DELETE FROM database_tables WHERE db_id = ?`,
      [dbId]
    );

    console.log(`✅ Database ${dbId} deleted successfully`);

    // Close the pool
    await pool.end();

    res.json({ 
      success: true, 
      message: "Database deleted successfully",
      dbId: dbId
    });

  } catch (error) {
    console.error("Delete database error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Database deletion failed" 
    });
  }
};
