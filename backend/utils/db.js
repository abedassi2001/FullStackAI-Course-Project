const mongoose = require("mongoose");

/**
 * Connect to MongoDB
 * @param {string} uri - MongoDB connection string
 */
async function connectDB(uri) {
  try {
    await mongoose.connect(uri, { dbName: "fullstackai" });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1); // stop the app if DB fails
  }
}

module.exports = { connectDB };
