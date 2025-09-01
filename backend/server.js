const path = require("path");
// لو ملف .env في جذر المشروع:
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });


require("dotenv").config();
const { connectDB } = require("./utils/db");
const app = require("./app");

const PORT = process.env.PORT || 3000;

// Connect to MongoDB then start server
connectDB(process.env.MONGO_URI).then(() => {
  app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
});
