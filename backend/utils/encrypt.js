// utils/encrypt.js
const bcrypt = require("bcrypt");

exports.encrypt = async (plain) => await bcrypt.hash(plain, 10);
exports.compare = async (plain, hashed) => await bcrypt.compare(plain, hashed);
