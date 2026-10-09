import crypto from "node:crypto";

const start = Date.now();

for (let i = 1; i <= 7; i++) {
  crypto.pbkdf2("password", "salt", 500000, 64, "sha512", () => {
    console.log(`Task ${i} finished after ${Date.now() - start}ms`);
  });
}
