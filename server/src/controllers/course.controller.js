const prisma = require('../db/prisma');
const { createCourseSchema, updateCourseSchema } = require('../validations/course.validation');
const { transitionCourseStatus } = require('../services/courseState.service');
const { getOwnedCourse } = require('../services/ownership.service');
const AppError = require('../utils/AppError');

exports.createCourse = async (req, res, next) => {
  try {
    const { title, description, category } = createCourseSchema.parse(req.body);

    const course = await prisma.course.create({
      data: {
        title,
        description,
        category,
        status: 'DRAFT',
        instructorId: req.user.id,
      },
    });

    res.status(201).json({ course });
  } catch (error) {
    next(error);
  }
};

exports.getCourse = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new AppError(404, 'COURSE_NOT_FOUND', 'Course not found');
    }

    if (req.user.role === 'LEARNER') {
      if (course.status !== 'PUBLISHED') {
        // Prevent learner from distinguishing between non-existent vs draft/archived
        throw new AppError(404, 'COURSE_NOT_FOUND', 'Course not found');
      }
    } else if (req.user.role === 'INSTRUCTOR') {
      if (course.instructorId !== req.user.id) {
        throw new AppError(403, 'FORBIDDEN', 'You do not have permission to view this course');
      }
    }

    res.status(200).json({ course });
  } catch (error) {
    next(error);
  }
};

exports.updateCourse = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const { title, description, category } = updateCourseSchema.parse(req.body);

    await getOwnedCourse(courseId, req.user.id);

    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: { title, description, category },
    });

    res.status(200).json({ course: updatedCourse });
  } catch (error) {
    next(error);
  }
};

exports.publishCourse = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const updatedCourse = await transitionCourseStatus(courseId, 'PUBLISHED', req.user.id);
    res.status(200).json({ course: updatedCourse });
  } catch (error) {
    next(error);
  }
};

exports.archiveCourse = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const updatedCourse = await transitionCourseStatus(courseId, 'ARCHIVED', req.user.id);
    res.status(200).json({ course: updatedCourse });
  } catch (error) {
    next(error);
  }
};

exports.restoreCourse = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const updatedCourse = await transitionCourseStatus(courseId, 'PUBLISHED', req.user.id);
    res.status(200).json({ course: updatedCourse });
  } catch (error) {
    next(error);
  }
};
