// backend/app.js
const express = require("express");
const app = express();
const cors = require("cors");   // 👈 add this

const uploadRouter = require("./routers/uploadRouter");
const queryRouter = require("./routers/queryRouter");
const usersRouter = require("./routers/usersRouter");
const aiRouter = require("./routers/aiRouter");
const chatRouter = require("./routers/chatRouter");
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"], // your frontend dev URL(s)
  credentials: true
}));
app.use(express.json());

// mount routers
app.use("/uploads", uploadRouter);  // now protected with JWT inside the router
app.use("/queries", queryRouter);
app.use("/users", usersRouter);
app.use("/ai", aiRouter);
app.use("/chats", chatRouter);

module.exports = app;
