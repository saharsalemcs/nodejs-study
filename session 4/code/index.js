const fs = require("node:fs");
const http = require("http");

const htmlFile = fs.readFileSync("./views/index.html");
const cssFile = fs.readFileSync("./views/style.css");

const server = http.createServer((req, res) => {
  if (req.url === "/") res.write(htmlFile);
  else if (req.url === "/style.css") res.write(cssFile);
  else if (req.url === "/about") res.write("<h1>About Page</h1>");
  else {
    res.statusCode = 404;
    res.write("NOT FOUND PAGE!");
  }

  res.end();
});

server.listen("3001", () => {
  console.log("server is running on port 3001");
});
