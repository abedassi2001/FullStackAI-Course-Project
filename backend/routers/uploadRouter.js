// backend/routers/uploadRouter.js
const express = require("express");
const upload = require("../middlewares/upload"); // multer config (saves to /uploads)
const uploadController = require("../controllers/uploadController");
const { requireAuth } = require("../middlewares/authMiddleware");

const router = express.Router();

// ✅ Protected: tie uploaded DB to authenticated user
router.post("/", requireAuth, upload.single("dbfile"), uploadController.uploadDB);

module.exports = router;
