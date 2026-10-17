const express = require("express");
const usersController = require("../controllers/users.controller");
const authController = require("../controllers/auth.controller");
const { verifyToken } = require("../middleware/auth");
const upload = require("../middleware/upload");
const router = express.Router();
// const multer = require("multer");
// const upload = multer({ dest: "uploads/" });

router.route("/").get(verifyToken, usersController.getUsers);
router
  .route("/register")
  .post(upload.single("avatar"), authController.register);
router.route("/login").post(authController.login);

module.exports = router;
