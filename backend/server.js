require("dotenv").config();
const path = require("path");
const { connectMongoDB } = require("./utils/db"); // ✅ use the right name
const sequelize = require("./utils/mysql.db");
const app = require("./app");

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    // Connect to MongoDB
    await connectMongoDB(process.env.MONGO_URI);

    // Connect to MySQL
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log("✅ MySQL connected and tables synced");

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
})();
