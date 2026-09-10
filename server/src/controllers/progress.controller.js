const prisma = require('../db/prisma');
const AppError = require('../utils/AppError');
const { markLessonComplete } = require('../services/progress.service');

exports.completeLesson = async (req, res, next) => {
  try {
    const lessonId = req.params.id;
    const { id: learnerId } = req.user;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new AppError(404, 'LESSON_NOT_FOUND', 'Lesson not found');
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        learnerId_courseId: {
          learnerId,
          courseId: lesson.courseId,
        }
      }
    });

    if (!enrollment) {
      throw new AppError(403, 'NOT_ENROLLED', 'You must be enrolled in this course to complete its lessons');
    }

    const updatedEnrollment = await markLessonComplete(enrollment.id, lesson.id);

    res.status(200).json({ enrollment: updatedEnrollment });
  } catch (error) {
    next(error);
  }
};
