// backend/server.js
require("dotenv").config();

const { connectMongoDB } = require("./utils/db"); // MongoDB connection helper
const app = require("./app");

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    // Connect to MongoDB (required)
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in .env");
    }
    await connectMongoDB(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // Optional: connect to MySQL only if explicitly enabled
    if (process.env.USE_MYSQL === "true") {
      const sequelize = require("./utils/mysql.db");
      await sequelize.authenticate();
      await sequelize.sync({ alter: true });
      console.log("✅ MySQL connected and tables synced");
      
      // Also initialize the mysql2 pool for sqliteToMysqlService
      const { initializeMySQL } = require("./services/sqliteToMysqlService");
      await initializeMySQL();
      console.log("✅ MySQL pool initialized for database operations");
    } else {
      console.log("ℹ️ Skipping MySQL init (set USE_MYSQL=true to enable)");
    }

    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
})();
