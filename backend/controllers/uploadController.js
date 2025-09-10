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
