// backend/middleware/upload.js
const multer = require("multer");
const path = require("path");

// Save uploaded DB files to /uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../uploads")),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/x-sqlite3" || file.originalname.endsWith(".db")) {
    cb(null, true);
  } else {
    cb(new Error("Only .db files are allowed"));
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
