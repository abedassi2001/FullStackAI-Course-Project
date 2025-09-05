const express = require("express");
const app = express();
const queryRouter = require("./routers/queryRouter");
const usersRouter = require("./routers/usersRouter"); // ✅ import users router

app.use(express.json()); // parse JSON bodies
app.use("/queries", queryRouter);
app.use("/users", usersRouter); // ✅ mount at /users

module.exports = app;
