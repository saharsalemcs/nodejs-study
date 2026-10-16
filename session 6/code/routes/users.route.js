const express = require("express");
const usersController = require("../controllers/users.controller");

const router = express.Router();

router.route("/").get(usersController.getUsers);
router.route("/register").post(usersController.register);
router.route("/login").get(usersController.login);

module.exports = router;
