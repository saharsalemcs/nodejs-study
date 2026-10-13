const express = require("express");

const router = express.Router();
const courseControllers = require("../controllers/courses.controller");

router
  .route("/")
  .get(courseControllers.getCourses)
  .post(validationSchema(), courseControllers.createCourse);

router
  .route("/:courseId")
  .get(courseControllers.getCourse)
  .patch(courseControllers.updateCourse)
  .delete(courseControllers.deleteCourse);
