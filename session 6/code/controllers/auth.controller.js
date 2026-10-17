const asyncWrapper = require("../middleware/asyncWrapper");
const User = require("../models/user.model");
const httpStatusText = require("../utils/httpStatusText");
const appError = require("../utils/appError");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const generateJWT = require("../utils/generateJWT");

const register = asyncWrapper(async (req, res, next) => {
  // request level validation with express validator
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const error = appError.create(result.array(), 400, httpStatusText.FAIL);
    return next(error);
  }
  const { firstName, lastName, email, password, role } = req.body;
  console.log("req.file ->", req.file);

  // check for duplicate users
  const existedUser = await User.findOne({ email: email });
  if (existedUser) {
    const error = appError.create(
      "user already exists",
      400,
      httpStatusText.FAIL,
    );
    return next(error);
  }

  // password hashing
  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = new User({
    firstName,
    lastName,
    email,
    password: hashedPassword,
    role,
    avatar: req.file.filename,
  });

  // generate JWT => jwt.sing(payload , secretKey)
  const token = await generateJWT({
    email: newUser.email,
    id: newUser._id,
    role: newUser.role,
  });
  newUser.token = token;

  await newUser.save();

  res
    .status(201)
    .json({ status: httpStatusText.SUCCESS, data: { user: newUser } });
});

const login = asyncWrapper(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email && !password) {
    const error = appError.create(
      "email and password are required",
      400,
      httpStatusText.FAIL,
    );
    return next(error);
  }

  const user = await User.findOne({ email });
  if (!user) {
    const error = appError.create("user not found", 400, httpStatusText.FAIL);
    return next(error);
  }

  const matchedPassword = await bcrypt.compare(password, user.password);
  const ok = user && matchedPassword;
  if (!ok) {
    const error = appError.create(
      "invalid email or password",
      401,
      httpStatusText.ERROR,
    );
    return next(error);
  }

  // logged in successfully
  const token = await generateJWT({
    email: user.email,
    id: user._id,
    role: user.role,
  });
  res.json({ status: httpStatusText.SUCCESS, data: { token } });
});

module.exports = {
  register,
  login,
};
