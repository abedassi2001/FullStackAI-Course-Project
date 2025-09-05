const queryService = require("../services/queryService");

exports.create = async (req, res) => {
  try {
    const prompt = req.body.prompt;
    if (!prompt) return res.status(400).json({ success: false, message: "Prompt is required" });

    const query = await queryService.createQuery(1, prompt); // userId = 1 for now
    res.json({ success: true, data: query });
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