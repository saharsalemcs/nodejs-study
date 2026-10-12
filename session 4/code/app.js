const express = require("express");
const app = express();

// === Built-in middleware => serves static assets such as HTML files, images, and so on. ===
// app.use(express.static("./views"));

// === Application-level middleware (with no mount path) ===
const logger1 = function (req, res, next) {
  console.log("MIDDLEWARE1:");
  console.log("METHOD: ", req.method, "URL: ", req.url);
  next();
};
app.use(logger1);

function logger2(req, res, next) {
  console.log("MIDDLEWARE2");
  next();
}
app.use("/about", logger2);

// Routes => method + path + handler
app.get("/", (req, res) => {
  res.send("<h1>Home Page</h1>");
});
app.get("/about", (req, res) => {
  res.json().send("About Page");
});
app.get("/products", (req, res) => {
  res.send([
    { id: 1, title: " product 1" },
    { id: 2, title: " product 2" },
  ]);
});

app.listen("5000", () => {
  console.log("server is running on port 5000");
});
