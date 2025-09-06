const { validateQuery } = require("../middlewares/queryMiddleware");
const fileDBService = require("../services/fileDBService");
const queryService = require("../services/queryService");

exports.create = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, message: "Prompt is required" });
    }

    const sql = prompt;

    // ✅ Validate SQL
    validateQuery(sql);

    // ✅ Get uploaded DB file
    const dbFilePath = req.file ? req.file.path : null;
    if (!dbFilePath) {
      return res.status(400).json({ success: false, message: "No DB file uploaded" });
    }

    // ✅ Run SQL on uploaded DB
    const results = await fileDBService.runSQL(dbFilePath, sql);

    // ✅ Save prompt history
    const queryHistory = await queryService.createQuery(1, prompt); // hardcoded userId=1

    res.json({ success: true, sql, data: results, history: queryHistory });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const queries = await queryService.getAllQueries();
    res.json({ success: true, data: queries });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
