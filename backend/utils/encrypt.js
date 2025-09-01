// encrypt.js
// Utility functions for handling sensitive data (like passwords).
//
// Functions to implement:
// - encrypt(password): hash a password before saving to DB (e.g., bcrypt.hash)
// - compare(plain, hashed): compare a plain password with its hashed version
//
// Example with bcrypt:
// const bcrypt = require("bcrypt");
// exports.encrypt = async (plain) => await bcrypt.hash(plain, 10);
// exports.compare = async (plain, hashed) => await bcrypt.compare(plain, hashed);
