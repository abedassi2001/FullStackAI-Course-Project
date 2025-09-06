const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

// Allow only .db files
const fileFilter = (req, file, cb) => {
  if (file.originalname.endsWith(".db")) {
    cb(null, true);
  } else {
    cb(new Error("Only .db files are allowed"));
  }
};

const upload = multer({ storage, fileFilter });

// 🔹 SQL validator
function validateQuery(sql) {
  if (!sql || typeof sql !== "string") {
    throw new Error("Invalid SQL query");
  }

  // prevent dangerous statements (basic check)
  const forbidden = ["DROP", "DELETE", "UPDATE"];
  if (forbidden.some(keyword => sql.toUpperCase().includes(keyword))) {
    throw new Error("Dangerous SQL query detected");
  }

  return true;
}

module.exports = { upload, validateQuery };
