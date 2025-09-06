const express = require("express");
const upload = require("../middlewares/upload"); // multer config
const uploadController = require("../controllers/uploadController");

const router = express.Router();

router.post("/", upload.single("dbfile"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "DB file is required" });

  // Just use the path directly
  const dbFilePath = req.file.path;

  res.json({ success: true, file: req.file.filename, path: dbFilePath });
});

module.exports = router;