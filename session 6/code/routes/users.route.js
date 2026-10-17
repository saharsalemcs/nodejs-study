const express = require("express");
const usersController = require("../controllers/users.controller");
const authController = require("../controllers/auth.controller");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

router.route("/").get(verifyToken, usersController.getUsers);
router.route("/register").post(authController.register);
router.route("/login").get(authController.login);

module.exports = router;
