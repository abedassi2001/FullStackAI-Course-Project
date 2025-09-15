// backend/routers/chatRouter.js
const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const chatController = require("../controllers/chatController");

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Create a new chat
router.post("/", chatController.createChat);

// Get all chats for the user
router.get("/", chatController.getChats);

// Get messages for a specific chat
router.get("/:chatId/messages", chatController.getChatMessages);

// Send a message to a chat
router.post("/:chatId/messages", chatController.sendMessage);

// Delete a chat
router.delete("/:chatId", chatController.deleteChat);

module.exports = router;
