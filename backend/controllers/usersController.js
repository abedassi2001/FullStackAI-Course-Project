// this file will call the middle ware after getting calls from the usersrouter
const repo = require("../repositories/usersRepository");
const svc = require("../services/usersService");

// Register a new user
async function register(req, res) {
  try {
    const user = await svc.registerUser(req.body);
    res.status(201).json(user);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

// Login
async function login(req, res) {
  try {
    const result = await svc.loginUser(req.body);
    res.json(result);
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
}

// List all users
async function list(req, res) {
  const users = await repo.getAllUsers();
  res.json(users);
}

// Get one user by ID
async function getOne(req, res) {
  try {
    const user = await repo.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

// Update user
async function update(req, res) {
  try {
    const user = await repo.updateUser(req.params.id, req.body);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

// Delete user
async function remove(req, res) {
  try {
    const ok = await repo.deleteUser(req.params.id);
    if (!ok) return res.status(404).json({ error: "User not found" });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

module.exports = { register, login, list, getOne, update, remove };
