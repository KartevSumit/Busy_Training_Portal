const { catalogQuerySchema } = require('../validations/catalog.validation');
const { getCatalog } = require('../services/catalog.service');
const prisma = require('../db/prisma');
const { createCourseSchema, updateCourseSchema } = require('../validations/course.validation');
const { transitionCourseStatus } = require('../services/courseState.service');
const { getOwnedCourse } = require('../services/ownership.service');
const courseService = require('../services/course.service');
const AppError = require('../utils/AppError');

exports.createCourse = async (req, res, next) => {
  try {
    const data = createCourseSchema.parse(req.body);
    const course = await courseService.createCourse(data, req.user.id);
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

    let enrollment = null;

    if (req.user.role === 'LEARNER') {
      if (course.status === 'DRAFT') {
        throw new AppError(404, 'COURSE_NOT_FOUND', 'Course not found');
      }

      enrollment = await prisma.enrollment.findUnique({
        where: { learnerId_courseId: { learnerId: req.user.id, courseId } }
      });
      
      if (!enrollment && course.status === 'ARCHIVED') {
        throw new AppError(404, 'COURSE_NOT_FOUND', 'Course not found');
      }
    } else if (req.user.role === 'INSTRUCTOR') {
      if (course.instructorId !== req.user.id) {
        throw new AppError(403, 'FORBIDDEN', 'You do not have permission to view this course');
      }
    }

    res.status(200).json({ course, enrollment });
  } catch (error) {
    next(error);
  }
};

exports.updateCourse = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const data = updateCourseSchema.parse(req.body);
    const updatedCourse = await courseService.updateCourse(courseId, data, req.user.id);
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

exports.listCourses = async (req, res, next) => {
  try {
    const validatedQuery = catalogQuerySchema.parse(req.query);
    const result = await getCatalog(validatedQuery, req.user);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.getCategories = async (req, res, next) => {
  try {
    const categories = await prisma.course.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' }
    });
    const categoryList = categories.map(c => c.category).filter(c => c);
    res.status(200).json({ categories: categoryList });
  } catch (error) {
    next(error);
  }
};

exports.getInstructors = async (req, res, next) => {
  try {
    const instructors = await prisma.user.findMany({
      where: { role: 'INSTRUCTOR' },
      select: { id: true, email: true },
      orderBy: { email: 'asc' }
    });
    res.status(200).json({ instructors });
  } catch (error) {
    next(error);
  }
};
