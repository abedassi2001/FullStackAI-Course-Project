// backend/controllers/usersController.js
// This file receives requests from usersRouter and calls the service layer.
const svc = require("../services/usersService");

function sendError(res, status, err) {
  const message = err?.message || String(err) || "Unknown error";
  return res.status(status).json({ message, error: message });
}

// Register a new user
async function register(req, res) {
  try {
    const user = await svc.registerUser(req.body);
    return res.status(201).json(user);
  } catch (e) {
    return sendError(res, 400, e);
  }
}

// Login
async function login(req, res) {
  try {
    const result = await svc.loginUser(req.body);
    return res.json(result);
  } catch (e) {
    return sendError(res, 401, e);
  }
}

// List users (admin)
async function list(req, res) {
  try {
    const users = await svc.listUsers();
    return res.json(users);
  } catch (e) {
    return sendError(res, 400, e);
  }
}

// Get one user
async function getOne(req, res) {
  try {
    const user = await svc.getUser(req.params.id);
    if (!user) return sendError(res, 404, new Error("User not found"));
    return res.json(user);
  } catch (e) {
    return sendError(res, 400, e);
  }
}

// Update user
async function update(req, res) {
  try {
    const updated = await svc.updateUser(req.params.id, req.body);
    return res.json(updated);
  } catch (e) {
    return sendError(res, 400, e);
  }
}

// Delete user
async function remove(req, res) {
  try {
    const ok = await svc.deleteUser(req.params.id);
    if (!ok) return sendError(res, 404, new Error("User not found"));
    return res.json({ success: true });
  } catch (e) {
    return sendError(res, 400, e);
  }
}

module.exports = { register, login, list, getOne, update, remove };
