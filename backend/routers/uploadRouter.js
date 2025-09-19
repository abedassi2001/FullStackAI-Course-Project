// backend/routers/uploadRouter.js
const express = require("express");
const upload = require("../middlewares/upload"); // multer config
const { requireAuth } = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/uploadController");
const exportCtrl = require("../controllers/exportController");

const router = express.Router();

// Upload new .db (multipart/form-data: dbfile)
router.post("/", requireAuth, upload.single("dbfile"), ctrl.uploadDB);

// List your saved DBs (id, filename, size, created_at)
router.get("/", requireAuth, ctrl.listDBs);

// Preview schema (tables + columns)
router.get("/:id/schema", requireAuth, ctrl.schemaPreview);

// Create and upload a demo SQLite database for the user
router.post("/demo", requireAuth, ctrl.createDemoDB);

// Export database to CSV or JSON
router.get("/export/:dbId/:format", requireAuth, exportCtrl.exportDatabase);

// Delete database
router.delete("/:dbId", requireAuth, ctrl.deleteDatabase);

// ⬇️ NEW: Email the raw .db file to user (or custom email if provided in body)
router.post("/email/:dbId", requireAuth, ctrl.emailDatabase);

module.exports = router;
