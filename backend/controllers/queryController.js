// backend/controllers/queryController.js
const { validateQuery } = require("../middlewares/queryMiddleware");
const queryService = require("../services/queryService");
const User = require("../models/user");

/**
 * POST /queries
 * Auth: Bearer <JWT>
 * Body (JSON): { prompt: "<SQL or natural language SQL>" }
 * Uses the saved dbFilePath from the authenticated user, validates and executes the SQL,
 * and writes a row to MySQL Query history (userId=req.user.id).
 */
exports.create = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, message: "Prompt is required" });
    }

    // For now prompt is direct SQL (you can plug AI layer later)
    const sql = String(prompt);

    // 🔒 Guardrails
    validateQuery(sql);

    // 🔎 Fetch user's saved DB path
    const user = await User.findById(req.user.id).lean();
    const dbFilePath = user?.dbFilePath;
    if (!dbFilePath) {
      return res.status(400).json({
        success: false,
        message: "No DB file saved for this user. Upload one first at POST /uploads",
      });
    }

    // Note: This endpoint is deprecated - use /ai/chat instead for database queries
    // The old fileDBService has been replaced with MySQL-based sqliteToMysqlService
    return res.status(400).json({
      success: false,
      message: "This endpoint is deprecated. Please use /ai/chat for database queries with the new MySQL-based system."
    });

    // 📝 Save prompt history to MySQL (Sequelize)
    const queryHistory = await queryService.createQuery(Number(req.user.id) || 1, prompt);

    res.json({ success: true, sql, data: results, history: queryHistory });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /queries
 * Auth: Bearer <JWT>
 * Returns all saved queries (MySQL).
 */
exports.getAll = async (req, res) => {
  try {
    const queries = await queryService.getAllQueries();
    res.json({ success: true, data: queries });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
