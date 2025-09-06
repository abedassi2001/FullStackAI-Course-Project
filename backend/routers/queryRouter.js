const express = require("express");
const router = express.Router();
const queryController = require("../controllers/queryController");
const { upload } = require("../middlewares/queryMiddleware"); // import upload

router.post("/", upload.single("dbfile"), queryController.create);
router.get("/", queryController.getAll);

module.exports = router;
