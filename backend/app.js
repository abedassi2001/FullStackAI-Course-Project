const express = require("express");
const app = express();
const queryRouter = require("./routers/queryRouter");

app.use(express.json()); // parse JSON bodies
app.use("/queries", queryRouter);

module.exports = app;
