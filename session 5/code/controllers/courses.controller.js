const { courses } = require("../data/courses");
const { validationResult } = require("express-validator");

const getCourses = (req, res) => {
  res.json(courses);
};

const getCourse = (req, res) => {
  const courseId = +req.params.courseId;
  const course = courses.find((c) => c.id === courseId);
  if (!course) {
    return res.status(404).json({ msg: "course not found" });
  }
  res.json(course);
};

const createCourse = (req, res) => {
  // console.log(req.body);
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json(result.array());
  }
  const course = { id: courses.length + 1, ...req.body };
  courses.push(course);
  res.status(201).json(course);
};

const updateCourse = (req, res) => {
  const courseId = +req.params.courseId;
  let course = courses.find((c) => c.id === courseId);
  if (!course) {
    return res.status(404).json({ msg: "course not found" });
  }

  course = { ...course, ...req.body };
  res.status(200).json(course);
};

const deleteCourse = (req, res) => {
  const courseId = +req.params.courseId;
  let course = courses.find((c) => c.id === courseId);
  if (!course) {
    return res.status(404).json({ msg: "course not found" });
  }

  courses.filter((c) => c.id !== courseId);
  res.status(200).json({ success: true });
};

module.exports = {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
};
