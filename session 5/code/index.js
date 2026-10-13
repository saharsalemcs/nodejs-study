const express = require("express");
const coursesRouter = require("./routes/courses.route");

const app = express();

app.use(express.json());

// rout handler
app.use("/api/courses", coursesRouter);

app.listen("5000", () => {
  console.log("server is running on port 5000");
});
