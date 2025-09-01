// query.routes.js
// This file sets up the Express routes for Query.
// Example endpoints (all prefixed with /api/queries):
// - POST "/" -> queryController.create
// - GET "/" -> queryController.getAll
// - GET "/:id" -> queryController.getOne
// - PUT "/:id" -> queryController.update
// - DELETE "/:id" -> queryController.delete
//
// Apply authentication middleware (e.g., authMiddleware) if needed.
// Example:
// router.post("/", authMiddleware, queryController.create);
// queryRouter.js
const express = require("express");
const router = express.Router(); // <--- this is missing in your code

// Example route (you can add your own)
router.get("/", (req, res) => {
  res.send("Query route works!");
});

module.exports = router;

