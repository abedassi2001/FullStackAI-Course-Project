const User = require("../models/user");

/**
 * Create a new user document in MongoDB
 * @param {Object} data - { name, email, password, role?, status? }
 * @returns {Promise<User>} - created user
 */
async function createUser(data) {
  const doc = await User.create(data);
  return doc;
}

/**
 * Get all users from the database
 * @returns {Promise<User[]>}
 */
async function getAllUsers() {
  return User.find().lean(); // lean() returns plain JS objects
}

/**
 * Find a user by ID
 * @param {string} id
 * @returns {Promise<User|null>}
 */
async function getUserById(id) {
  return User.findById(id);
}

/**
 * Find a user by email
 * @param {string} email
 * @returns {Promise<User|null>}
 */
async function getUserByEmail(email) {
  return User.findOne({ email });
}

/**
 * Update user fields by ID
 * @param {string} id
 * @param {Object} updates - fields to update
 * @returns {Promise<User|null>} updated user or null if not found
 */
async function updateUser(id, updates) {
  const doc = await User.findByIdAndUpdate(id, updates, {
    new: true,          // return updated document
    runValidators: true // validate against schema rules
  });
  return doc;
}

/**
 * Delete a user by ID
 * @param {string} id
 * @returns {Promise<boolean>} true if deleted, false if not found
 */
async function deleteUser(id) {
  const res = await User.findByIdAndDelete(id);
  return !!res; // convert to boolean
}

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  getUserByEmail,
  updateUser,
  deleteUser,
};
