import crypto from "node:crypto";

// const start = Date.now();

// for (let i = 1; i <= 7; i++) {
//   crypto.pbkdf2("password", "salt", 500000, 64, "sha512", () => {
//     console.log(`Task ${i} finished after ${Date.now() - start}ms`);
//   });
// }

const start = performance.now();
process.env.UV_THREADPOOL_SIZE = 5; // DEFAULT IS 4

fetch("https://dummyjson.com/products").then(() => {
  console.log("performance: ", performance.now() - start);
});
fetch("https://dummyjson.com/products").then(() => {
  console.log("performance: ", performance.now() - start);
});
fetch("https://dummyjson.com/products").then(() => {
  console.log("performance: ", performance.now() - start);
});
fetch("https://dummyjson.com/products").then(() => {
  console.log("performance: ", performance.now() - start);
});
fetch("https://dummyjson.com/products").then(() => {
  console.log("performance: ", performance.now() - start);
});
fetch("https://dummyjson.com/products").then(() => {
  console.log("performance: ", performance.now() - start);
});
fetch("https://dummyjson.com/products").then(() => {
  console.log("performance: ", performance.now() - start);
});

//   اول خمسة متقاربين عشان انا عملت حجم الثريد خمسة ، الباقي وقتهم بعد عن اول خمسة
