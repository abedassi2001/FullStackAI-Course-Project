// backend/middleware/upload.js
const multer = require("multer");
// Use memory storage to avoid writing to the project directory
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/x-sqlite3" || file.originalname.endsWith(".db")) {
    cb(null, true);
  } else {
    cb(new Error("Only .db files are allowed"));
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });

module.exports = upload;
