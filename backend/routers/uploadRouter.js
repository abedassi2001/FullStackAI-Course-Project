// backend/routers/uploadRouter.js
const express = require("express");
const upload = require("../middlewares/upload"); // multer config
const { requireAuth } = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/uploadController");

const router = express.Router();

// Upload new .db (multipart/form-data: dbfile)
router.post("/", requireAuth, upload.single("dbfile"), ctrl.uploadDB);

// List your saved DBs (id, filename, size, created_at)
router.get("/", requireAuth, ctrl.listDBs);

// Download a saved DB by id
router.get("/:id/download", requireAuth, ctrl.downloadDB);

// Preview schema (tables + columns)
router.get("/:id/schema", requireAuth, ctrl.schemaPreview);

module.exports = router;
