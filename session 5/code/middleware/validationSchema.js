const { body } = require("express-validator");

const validationSchema = function () {
  return [
    body("title")
      .notEmpty()
      .withMessage("title not provided")
      .isLength({ min: 2 })
      .withMessage("title should be at least 2 characters")
      .body("price")
      .notEmpty()
      .withMessage("price not provided"),
  ];
};

module.exports = {
  validationSchema,
};
