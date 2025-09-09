// this class will call the repository and will do any business logic if needed
// backend/services/usersService.js
const bcrypt = require("bcrypt");

const jwt = require("jsonwebtoken");
const repo = require("../repositories/usersRepository");

const JWT_SECRET = process.env.JWT_SECRET || "change-me-please";
const TOKEN_TTL = "1d";

/**
 * Generate a JWT token for a user
 */
function generateToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

/**
 * Register a new user (no hashing, password saved as plain text)
 */
async function registerUser({ name, email, password, role = "user", status = "active" }) {
  try {
    if (!name || !email || !password) {
      throw new Error("Name, email and password are required");
    }

    const existing = await repo.getUserByEmail(email.toLowerCase());
    if (existing) {
      throw new Error("Email already in use");
    }

    const created = await repo.createUser({
      name,
      email: email.toLowerCase(),
      password, // model will hash this
      role,
      status,
    });

    return created.toJSON();
  } catch (err) {
    console.error("❌ registerUser error:", err);
    throw err; // pass the same error up to controller
  }
}


/**
 * Login with email + password
 */
async function loginUser({ email, password }) {
  console.log(email,password);
  if (!email || !password) {
    throw new Error("email and password are required");
  }
console.log(email,password);
  // 🔹 find user by email
  const user = await repo.getUserByEmail(email.toLowerCase());
  if (!user) throw new Error("Invalid credentials");

  // 🔹 compare hashed password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error("Invalid credentials");

  // 🔹 generate JWT
  const token = generateToken(user);

  // use toJSON() to strip sensitive fields (like password)
  return { user: user.toJSON(), token };
}

/**
 * Get a single user by ID
 */
async function getUser(id) {
  const user = await repo.getUserById(id);
  if (!user) throw new Error("User not found");
  return user.toJSON ? user.toJSON() : user;
}

/**
 * List all users
 */
async function listUsers() {
  const users = await repo.getAllUsers();
  return users.map((u) => {
    const { password, __v, ...safe } = u;
    return safe;
  });
}

/**
 * Update user fields (except password)
 */
async function updateUser(id, updates = {}) {
  if (updates.email) {
    const emailLower = updates.email.toLowerCase();
    const existing = await repo.getUserByEmail(emailLower);
    if (existing && existing._id.toString() !== id) {
      throw new Error("Email already in use");
    }
    updates.email = emailLower;
  }

  if ("password" in updates) delete updates.password; // prevent password changes here

  const updated = await repo.updateUser(id, updates);
  if (!updated) throw new Error("User not found");
  return updated.toJSON ? updated.toJSON() : updated;
}

/**
 * Change password (no hashing)
 */
async function changePassword(id, oldPassword, newPassword) {
  const user = await repo.getUserById(id);
  if (!user) throw new Error("User not found");

  if (user.password !== oldPassword) throw new Error("Old password is incorrect");

  if (newPassword.length < 3) {
    throw new Error("New password must be at least 3 characters long");
  }

  const updated = await repo.updateUser(id, { password: newPassword });
  return !!updated;
}

/**
 * Delete user
 */
async function deleteUser(id) {
  const ok = await repo.deleteUser(id);
  if (!ok) throw new Error("User not found");
  return true;
}

module.exports = {
  registerUser,
  loginUser,
  getUser,
  listUsers,
  updateUser,
  changePassword,
  deleteUser,
};
