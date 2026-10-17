require("dotenv").config();
const cors = require("cors");
const httpStatusText = require("./utils/httpStatusText");

const express = require("express");
const coursesRouter = require("./routes/courses.route");
const usersRouter = require("./routes/users.route");
const { mongoose } = require("mongoose");

const app = express();

const password = process.env.MONGODB_PASSWORD;
const url = `mongodb+srv://saharsalemdev_db_user:${password}@cluster0.3ma3qkg.mongodb.net/learn-nodejs`;

mongoose.connect(url).then(() => {
  console.log("mongodb server started");
});

app.use(cors());
app.use(express.json());

// rout handler
app.use("/api/courses", coursesRouter);
app.use("/api/users", usersRouter);

app.all("/*splat", (req, res, next) => {
  return res.status(404).json({
    status: httpStatusText.ERROR,
    message: "this resource is not available",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  res.status(err.statusCode || 400).json({
    status: err.statusText || httpStatusText.ERROR,
    message: err.message,
    code: err.statusCode,
    data: null,
  });
});

app.listen("5000", () => {
  console.log("server is running on port 5000");
});
