const prisma = require('../db/prisma');
const { createLessonSchema, updateLessonSchema, reorderLessonSchema } = require('../validations/lesson.validation');
const { getOwnedCourse, getOwnedLesson } = require('../services/ownership.service');
const { reorderLesson } = require('../services/lesson.service');
const AppError = require('../utils/AppError');

exports.createLesson = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const { title, content } = createLessonSchema.parse(req.body);

    await getOwnedCourse(courseId, req.user.id);

    // Calculate position inside transaction to avoid race conditions
    const lesson = await prisma.$transaction(async (tx) => {
      const agg = await tx.lesson.aggregate({
        where: { courseId },
        _max: { position: true },
      });
      const nextPosition = agg._max.position !== null ? agg._max.position + 1 : 0;

      return tx.lesson.create({
        data: {
          title,
          content,
          position: nextPosition,
          courseId,
        },
      });
    });

    res.status(201).json({ lesson });
  } catch (error) {
    next(error);
  }
};

exports.getCourseLessons = async (req, res, next) => {
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
        throw new AppError(404, 'COURSE_NOT_FOUND', 'Course not found');
      }
    } else if (req.user.role === 'INSTRUCTOR') {
      if (course.instructorId !== req.user.id) {
        throw new AppError(403, 'FORBIDDEN', 'You do not have permission to view these lessons');
      }
    }

    const lessons = await prisma.lesson.findMany({
      where: { courseId },
      orderBy: { position: 'asc' },
    });

    res.status(200).json({ lessons });
  } catch (error) {
    next(error);
  }
};

exports.updateLesson = async (req, res, next) => {
  try {
    const lessonId = req.params.id;
    const { title, content } = updateLessonSchema.parse(req.body);

    await getOwnedLesson(lessonId, req.user.id);

    const updatedLesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: { title, content },
    });

    res.status(200).json({ lesson: updatedLesson });
  } catch (error) {
    next(error);
  }
};

exports.deleteLesson = async (req, res, next) => {
  try {
    const lessonId = req.params.id;
    
    const targetLesson = await getOwnedLesson(lessonId, req.user.id);
    const courseId = targetLesson.courseId;

    // Delete and repair positions transactionally
    await prisma.$transaction(async (tx) => {
      await tx.lesson.delete({
        where: { id: lessonId },
      });

      const remainingLessons = await tx.lesson.findMany({
        where: { courseId },
        orderBy: { position: 'asc' },
      });

      // Simple repair strategy: Just update sequentially (won't conflict since we only close gaps)
      // Since we deleted an item, positions can only decrease, so no unique constraint violations.
      for (let i = 0; i < remainingLessons.length; i++) {
        const lesson = remainingLessons[i];
        if (lesson.position !== i) {
          await tx.lesson.update({
            where: { id: lesson.id },
            data: { position: i },
          });
        }
      }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

exports.reorderLesson = async (req, res, next) => {
  try {
    const lessonId = req.params.id;
    const { newPosition } = reorderLessonSchema.parse(req.body);

    const updatedLessons = await reorderLesson(lessonId, newPosition, req.user.id);
    
    res.status(200).json({ lessons: updatedLessons });
  } catch (error) {
    next(error);
  }
};
