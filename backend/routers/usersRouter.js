// here we will setup our userrouter 
const express = require("express");
const ctrl = require("../controllers/usersController");
const router = express.Router();

// Register a new user
// POST http://localhost:3000/users/register
router.post("/register", ctrl.register);

// Login and get JWT token
// POST http://localhost:3000/users/login
router.post("/login", ctrl.login);

// Get all users
// GET http://localhost:3000/users
router.get("/",ctrl.list);

// Get single user by ID
// GET http://localhost:3000/users/:id
router.get("/:id", ctrl.getOne);

// Update user by ID
// PUT http://localhost:3000/users/:id
router.put("/:id", ctrl.update);

// Delete user by ID
// DELETE http://localhost:3000/users/:id
router.delete("/:id", ctrl.remove);

module.exports = router;
