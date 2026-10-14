const { validationResult } = require("express-validator");
const Course = require("../models/course.model");

const getCourses = async (req, res) => {
  const courses = await Course.find();
  res.json(courses);
};

const getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ msg: "course not found" });
    }
    res.json(course);
  } catch (err) {
    return res.status(400).json({ msg: "Invalid Object Id" });
  }
};

const createCourse = async (req, res) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json(result.array());
  }

  const newCourse = new Course(req.body);
  await newCourse.save();

  res.status(201).json(newCourse);
};

const updateCourse = async (req, res) => {
  const courseId = req.params.courseId;
  try {
    const updatedCourse = await Course.updateOne(
      { _id: courseId },
      {
        $set: { ...req.body },
      },
    );

    if (!updatedCourse) {
      return res.status(404).json({ msg: "course not found" });
    }

    return res.status(200).json(updatedCourse);
  } catch (err) {
    return res.status(404).json({ error: err });
  }
};

const deleteCourse = async (req, res) => {
  const courseId = req.params.courseId;
  try {
    const data = await Course.deleteOne({ _id: courseId });
    res.status(200).json({ success: true, msg: data });
  } catch (err) {
    res.status(400).json({ error: err });
  }
};

module.exports = {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
};
