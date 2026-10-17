const express = require("express");
const courseControllers = require("../controllers/courses.controller");
const { validationSchema } = require("../middleware/validationSchema");
const { verifyToken, allowedTo } = require("../middleware/auth");

const router = express.Router();

router
  .route("/")
  .get(courseControllers.getCourses)
  .post(
    verifyToken,
    allowedTo("admin"),
    validationSchema(),
    courseControllers.createCourse,
  );

router
  .route("/:courseId")
  .get(courseControllers.getCourse)
  .patch(courseControllers.updateCourse)
  .delete(verifyToken, allowedTo("admin"), courseControllers.deleteCourse);

module.exports = router;
