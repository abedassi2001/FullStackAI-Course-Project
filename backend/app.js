const express = require("express");
const usersRouter = require("./routers/usersRouter");

const app = express();
app.use(express.json());

// Users routes
app.use("/users", usersRouter);
console.log("hi");
module.exports = app;
