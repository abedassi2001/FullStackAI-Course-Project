// backend/app.js
const express = require("express");
const app = express();

const uploadRouter = require("./routers/uploadRouter");
const queryRouter = require("./routers/queryRouter");
const usersRouter = require("./routers/usersRouter");
const aiRouter = require("./routers/aiRouter");

app.use(express.json());

// mount routers
app.use("/uploads", uploadRouter);  // now protected with JWT inside the router
app.use("/queries", queryRouter);
app.use("/users", usersRouter);
app.use("/ai", aiRouter);

module.exports = app;
