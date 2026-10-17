const jwt = require("jsonwebtoken");
const appError = require("../utils/appError");
const httpStatusText = require("../utils/httpStatusText");

const verifyToken = (req, res, next) => {
  const authHeader = req.get("authorization");
  if (!authHeader) {
    const error = appError.create(
      "token is required",
      401,
      httpStatusText.ERROR,
    );
    return next(error);
  }

  try {
    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = { id: payload.sub, role: payload.role };

    next();
  } catch (err) {
    const error = appError.create("invalid token", 401, httpStatusText.ERROR);
    return next(error);
  }
};

// Authorization
const allowedTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(appError.create("this role is not authorized", 403));
    }
    next();
  };

module.exports = { verifyToken, allowedTo };
