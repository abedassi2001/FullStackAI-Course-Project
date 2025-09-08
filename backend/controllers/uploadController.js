// backend/controllers/uploadController.js
const fs = require("fs");
const mysql = require("mysql2/promise");

// create one connection pool for your app
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "your_password",
  database: "your_database",
});

exports.uploadDB = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "DB file is required" });
    }

    // Read uploaded file as binary
    const fileBuffer = fs.readFileSync(req.file.path);

    // Insert into MySQL
    const [result] = await pool.execute(
      "INSERT INTO user_databases (user_id, filename, file) VALUES (?, ?, ?)",
      [req.user._id.toString(), req.file.originalname, fileBuffer]
    );

    res.json({
      success: true,
      dbId: result.insertId,
      filename: req.file.originalname,
      user: req.user._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Upload failed" });
  }
};
