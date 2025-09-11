// backend/controllers/uploadController.js
const fs = require("fs");
const path = require("path");
const {
  saveDbBufferToMySQL,
  listUserDBs,
  fetchDbBufferFromMySQL,
  bufferToTempSqlite,
  getSchema,
} = require("../services/fileDBService");
const sqlite3 = require("sqlite3").verbose();

function getUid(req) {
  return req.user?.id || req.user?._id || null;
}

exports.uploadDB = async (req, res) => {
  try {
    const uid = getUid(req);
    if (!uid) return res.status(401).json({ success: false, error: "Unauthorized" });
    if (!req.file) return res.status(400).json({ success: false, error: "DB file is required" });

    const buffer = fs.readFileSync(req.file.path);
    const dbId = await saveDbBufferToMySQL(uid, req.file.originalname, buffer);

    res.json({ success: true, dbId, filename: req.file.originalname, user: uid });
  } catch (err) {
    console.error("Upload failed:", err);
    res.status(500).json({ success: false, error: "Upload failed" });
  }
};

exports.listDBs = async (req, res) => {
  try {
    const uid = getUid(req);
    if (!uid) return res.status(401).json({ success: false, error: "Unauthorized" });

    const rows = await listUserDBs(uid);
    res.json({ success: true, databases: rows });
  } catch (err) {
    console.error("List DBs error:", err);
    res.status(500).json({ success: false, error: "Failed to list databases" });
  }
};

exports.downloadDB = async (req, res) => {
  try {
    const uid = getUid(req);
    if (!uid) return res.status(401).json({ success: false, error: "Unauthorized" });

    const dbId = parseInt(req.params.id, 10);
    if (!dbId) return res.status(400).json({ success: false, error: "Invalid id" });

    const row = await fetchDbBufferFromMySQL(dbId, uid);
    if (!row) return res.status(404).json({ success: false, error: "Not found" });

    // Sanitize filename for headers
    const safeName = (row.filename || "database.db").replace(/[^\w.-]/g, "_");

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
    res.setHeader("Content-Length", row.file.length);
    return res.end(row.file); // send the Buffer as the body
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ success: false, error: "Download failed" });
  }
};

exports.schemaPreview = async (req, res) => {
  try {
    const uid = getUid(req);
    if (!uid) return res.status(401).json({ success: false, error: "Unauthorized" });

    const dbId = parseInt(req.params.id, 10);
    if (!dbId) return res.status(400).json({ success: false, error: "Invalid id" });

    const row = await fetchDbBufferFromMySQL(dbId, uid);
    if (!row) return res.status(404).json({ success: false, error: "Not found" });

    const tmpPath = bufferToTempSqlite(row.file, row.filename);
    const schemaText = await getSchema(tmpPath);

    res.json({ success: true, filename: row.filename, schema: schemaText });
  } catch (err) {
    console.error("Schema error:", err);
    res.status(500).json({ success: false, error: "Failed to read schema" });
  }
};

// Create a small demo SQLite DB, store it as BLOB in MySQL for this user
exports.createDemoDB = async (req, res) => {
  try {
    const uid = getUid(req);
    if (!uid) return res.status(401).json({ success: false, error: "Unauthorized" });

    // Create a temporary SQLite DB file with a simple dataset
    const tmpDir = path.join(__dirname, "..", "uploads", "tmp");
    fs.mkdirSync(tmpDir, { recursive: true });
    const tmpPath = path.join(tmpDir, `demo-${Date.now()}.db`);

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
    const dbId = await saveDbBufferToMySQL(uid, "demo-database.db", buffer);

    res.json({ success: true, dbId, filename: "demo-database.db" });
  } catch (err) {
    console.error("Create demo DB failed:", err);
    res.status(500).json({ success: false, error: "Failed to create demo database" });
  }
};
