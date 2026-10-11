import { createServer } from "node:http";

const server = createServer((req, res) => {
  if (req.url === "/") res.end("Home Page");
  else if (req.url === "/about") res.end("About Page");
  else res.end("Not Found Page");
});

server.listen(3000, () => {
  console.log("Server running - listening at http://localhost:3000");
});
