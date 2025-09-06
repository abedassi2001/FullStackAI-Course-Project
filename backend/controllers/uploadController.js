const path = require("path");

exports.uploadDB = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "DB file is required" });

    // Store uploaded DB path in session (or in-memory map keyed by user ID)
    req.session.dbFile = path.resolve(req.file.path);

    res.json({ success: true, file: req.file.filename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
