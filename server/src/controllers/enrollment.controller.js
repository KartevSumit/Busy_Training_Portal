const prisma = require('../db/prisma');
const AppError = require('../utils/AppError');
const { enrollSchema, bulkEnrollSchema } = require('../validations/enrollment.validation');
const { enrollLearner, bulkEnrollLearners } = require('../services/enrollment.service');

exports.enroll = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const { role, id: userId } = req.user;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new AppError(404, 'COURSE_NOT_FOUND', 'Course not found');
    }

    let targetLearnerId;

    if (role === 'LEARNER') {
      if (course.status !== 'PUBLISHED') {
        throw new AppError(409, 'COURSE_NOT_PUBLISHED', 'You can only enroll in published courses');
      }
      targetLearnerId = userId;
    } else if (role === 'INSTRUCTOR') {
      if (course.instructorId !== userId) {
        throw new AppError(403, 'FORBIDDEN', 'You can only enroll learners into your own courses');
      }

      const { learnerId } = enrollSchema.parse(req.body);
      if (!learnerId) {
        throw new AppError(400, 'VALIDATION_ERROR', 'learnerId is required for instructor enrollment');
      }

      const targetUser = await prisma.user.findUnique({ where: { id: learnerId } });
      if (!targetUser || targetUser.role !== 'LEARNER') {
        throw new AppError(400, 'INVALID_LEARNER', 'Target user must exist and have the LEARNER role');
      }
      targetLearnerId = learnerId;
    } else {
      throw new AppError(403, 'FORBIDDEN', 'Admins cannot create enrollments directly');
    }

    const enrollment = await enrollLearner(courseId, targetLearnerId);

    res.status(201).json({ enrollment });
  } catch (error) {
    next(error);
  }
};

exports.bulkEnroll = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const { id: instructorId } = req.user;

    const { emails } = bulkEnrollSchema.parse(req.body);

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new AppError(404, 'COURSE_NOT_FOUND', 'Course not found');
    }

    if (course.instructorId !== instructorId) {
      throw new AppError(403, 'FORBIDDEN', 'You can only enroll learners into your own courses');
    }

    const results = await bulkEnrollLearners(courseId, emails);

    res.status(200).json({ results });
  } catch (error) {
    next(error);
  }
};

exports.getMyEnrollments = async (req, res, next) => {
  try {
    const { id: learnerId } = req.user;

    const enrollments = await prisma.enrollment.findMany({
      where: { learnerId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            instructorId: true,
            status: true,
          }
        }
      }
    });

    res.status(200).json({ enrollments });
  } catch (error) {
    next(error);
  }
};
