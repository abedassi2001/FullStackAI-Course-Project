// backend/routers/queryRouter.js
const express = require("express");
const router = express.Router();
const queryController = require("../controllers/queryController");
const { requireAuth } = require("../middlewares/authMiddleware");

// ✅ No file upload here anymore; queries use the saved dbFilePath
router.post("/", requireAuth, queryController.create);
router.get("/", requireAuth, queryController.getAll);

module.exports = router;
