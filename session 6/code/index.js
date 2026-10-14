const express = require("express");
const coursesRouter = require("./routes/courses.route");
const { mongoose } = require("mongoose");

const app = express();
const url =
  "mongodb+srv://saharsalemdev_db_user:xgy3YIyIWjiCQYCQ@cluster0.3ma3qkg.mongodb.net/learn-nodejs";

mongoose.connect(url).then(() => {
  console.log("mongodb server started");
});

app.use(express.json());

// rout handler
app.use("/api/courses", coursesRouter);

app.listen("5000", () => {
  console.log("server is running on port 5000");
});
