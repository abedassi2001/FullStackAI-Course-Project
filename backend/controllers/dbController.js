// backend/controllers/dbController.js
exports.getUserDatabases = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, filename, uploaded_at FROM user_databases WHERE user_id = ?",
      [req.user._id.toString()]
    );

    res.json({ success: true, databases: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch databases" });
  }
};
