const express = require("express");
const usersRouter = require("./routers/usersRouter");
const queryRouter = require("./routers/queryRouter");   

const app = express();
app.use(express.json());

// Users routes
app.use("/users", usersRouter);
app.use("/queries", queryRouter);
module.exports = app;
