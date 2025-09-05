const express = require("express");
const router = express.Router();
const queryController = require("../controllers/queryController");

router.post("/", queryController.create);
router.get("/", queryController.getAll);

module.exports = router;
