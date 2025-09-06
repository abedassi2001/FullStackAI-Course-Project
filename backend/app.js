const express = require("express");
const app = express();
const uploadRouter = require("./routers/uploadRouter");


const queryRouter = require("./routers/queryRouter");
const usersRouter = require("./routers/usersRouter");
const aiRouter = require("./routers/aiRouter"); // ✅ import ai router
app.use("/uploads", uploadRouter); // ✅ mount at /uploads

app.use(express.json());
app.use("/queries", queryRouter);
app.use("/users", usersRouter);
app.use("/ai", aiRouter); // ✅ mount at /ai

module.exports = app;
