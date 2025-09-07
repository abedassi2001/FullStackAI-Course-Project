// backend/controllers/uploadController.js
const path = require("path");
const User = require("../models/user");

/**
 * POST /uploads
 * Body: form-data { dbfile: <file> }
 * Auth: Bearer <JWT>
 * Saves absolute dbFilePath to the authenticated user's document.
 */
exports.uploadDB = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "DB file is required" });

    const dbFilePath = path.resolve(req.file.path);

    // attach to authenticated user
    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { dbFilePath },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({
      success: true,
      file: req.file.filename,
      path: dbFilePath,
      user: updated.toJSON(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
