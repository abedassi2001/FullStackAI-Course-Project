// backend/routers/usersRouter.js
const express = require("express");
const ctrl = require("../controllers/usersController");
const { requireAuth, requireRole } = require("../middlewares/authMiddleware");

const router = express.Router();

// public
router.post("/register", ctrl.register);
router.post("/login", ctrl.login);

// protected: admin only
router.get("/", requireAuth, requireRole("admin"), ctrl.list);

// protected: أي مستخدم مسجل يقدر يجيب حاله/يعدل حاله (عدل حسب احتياجك)
router.get("/:id", requireAuth, ctrl.getOne);
router.put("/:id", requireAuth, ctrl.update);
router.delete("/:id", requireAuth, requireRole("admin"), ctrl.remove);

module.exports = router;
