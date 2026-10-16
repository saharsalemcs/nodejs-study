const User = require("../models/user.model");
const httpStatusText = require("../utils/httpStatusText");

const getUsers = async (req, res) => {
  const query = req.query;

  const limit = query.limit || 10;
  const page = query.page || 1;
  const skip = (page - 1) * limit;

  const users = await User.find({}, { __v: false }).limit(limit).skip(skip);

  res.json({ status: httpStatusText.SUCCESS, data: { users } });
};

const register = async (req, res) => {
  console.log(req.body);
  const { firstName, lastName, email, password } = req.body;
};

const login = async () => {};

module.exports = {
  getUsers,
  register,
  login,
};
