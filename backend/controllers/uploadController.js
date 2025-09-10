// backend/controllers/uploadController.js
const fs = require("fs");
const { saveDbBufferToMySQL } = require("../services/fileDBService");

exports.uploadDB = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "DB file is required" });
    }
    const uid = req.user?.id || req.user?._id;  // <— accept both
    if (!uid) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const buffer = fs.readFileSync(req.file.path);
    const dbId = await saveDbBufferToMySQL(uid, req.file.originalname, buffer);

    res.json({
      success: true,
      dbId,
      filename: req.file.originalname,
      user: uid,
    });
  } catch (err) {
    console.error("Upload failed:", err);
    res.status(500).json({ success: false, error: "Upload failed" });
  }
};
