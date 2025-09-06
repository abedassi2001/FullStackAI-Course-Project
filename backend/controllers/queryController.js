const validateQuery = require("../middlewares/queryMiddleware");
const fileDBService = require("../services/fileDBService");
const queryService = require("../services/queryService");

exports.create = async (req, res) => {
  try {
    const prompt = req.body.prompt;
    if (!prompt) return res.status(400).json({ success: false, message: "Prompt is required" });

    // 1️⃣ Translate prompt to SQL via AI
    const aiResponse = await aiService.generateSQL(prompt);

    if (aiResponse.action !== "query") {
      return res.status(400).json({ success: false, message: "Unsupported AI action" });
    }

    // 2️⃣ Validate AI SQL
    validateQuery(aiResponse.sql);

    // 3️⃣ Get user DB file
    const dbFilePath = req.session.dbFile; // must have uploaded
    if (!dbFilePath) return res.status(400).json({ success: false, message: "No DB file uploaded" });

    // 4️⃣ Execute SQL on uploaded DB
    const results = await fileDBService.runSQL(dbFilePath, aiResponse.sql);

    // 5️⃣ Save prompt history in MySQL (optional)
    const queryHistory = await queryService.createQuery(1, prompt); // userId=1 for now

    res.json({ success: true, sql: aiResponse.sql, data: results, history: queryHistory });
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
