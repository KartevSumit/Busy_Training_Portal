const prisma = require('../db/prisma');
const { createLessonSchema, updateLessonSchema, reorderLessonSchema } = require('../validations/lesson.validation');
const { getOwnedCourse, getOwnedLesson } = require('../services/ownership.service');
const { reorderLesson } = require('../services/lesson.service');
const AppError = require('../utils/AppError');

exports.createLesson = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const { title, content, resourceUrl, resourceName } = createLessonSchema.parse(req.body);
    await getOwnedCourse(courseId, req.user.id);
    const lesson = await prisma.$transaction(async (tx) => {
      const agg = await tx.lesson.aggregate({ where: { courseId }, _max: { position: true } });
      const nextPosition = agg._max.position !== null ? agg._max.position + 1 : 0;
      return tx.lesson.create({ data: { title, content, position: nextPosition, courseId, resourceUrl, resourceName } });
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

    let isEnrolled = false;

    if (req.user.role === 'LEARNER') {
      if (course.status === 'DRAFT') {
        throw new AppError(404, 'COURSE_NOT_FOUND', 'Course not found');
      }

      const enrollment = await prisma.enrollment.findUnique({
        where: { learnerId_courseId: { learnerId: req.user.id, courseId } }
      });
      isEnrolled = !!enrollment;
      
      if (!isEnrolled && course.status === 'ARCHIVED') {
        throw new AppError(404, 'COURSE_NOT_FOUND', 'Course not found');
      }
    } else if (req.user.role === 'INSTRUCTOR') {
      if (course.instructorId !== req.user.id) {
        throw new AppError(403, 'FORBIDDEN', 'You do not have permission to view these lessons');
      }
    }

    const lessonsArgs = {
      where: { courseId },
      orderBy: { position: 'asc' }
    };

    if (req.user.role === 'LEARNER' && isEnrolled) {
      lessonsArgs.include = {
        progress: {
          where: { enrollment: { learnerId: req.user.id } },
          select: { completedAt: true }
        }
      };
    }

    const lessonsData = await prisma.lesson.findMany(lessonsArgs);

    let lessons = lessonsData;
    if (req.user.role === 'LEARNER' && isEnrolled) {
      lessons = lessonsData.map(l => ({
        id: l.id,
        courseId: l.courseId,
        title: l.title,
        content: l.content,
        position: l.position,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
        resourceUrl: l.resourceUrl,
        resourceName: l.resourceName,
        isCompleted: Array.isArray(l.progress) && l.progress.length > 0
      }));
    }

    res.status(200).json({ lessons });
  } catch (error) {
    next(error);
  }
};

exports.updateLesson = async (req, res, next) => {
  try {
    const lessonId = req.params.id;
    const { title, content, resourceUrl, resourceName } = updateLessonSchema.parse(req.body);
    await getOwnedLesson(lessonId, req.user.id);
    const updatedLesson = await prisma.lesson.update({ where: { id: lessonId }, data: { title, content, resourceUrl, resourceName } });
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
    await prisma.$transaction(async (tx) => {
      await tx.lesson.delete({ where: { id: lessonId } });
      const remainingLessons = await tx.lesson.findMany({ where: { courseId }, orderBy: { position: 'asc' } });
      for (let i = 0; i < remainingLessons.length; i++) {
        const lesson = remainingLessons[i];
        if (lesson.position !== i) {
          await tx.lesson.update({ where: { id: lesson.id }, data: { position: i } });
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

exports.getLessonComments = async (req, res, next) => {
  try {
    const lessonId = req.params.id;
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { course: true } });
    if (!lesson) {
      throw new AppError(404, 'LESSON_NOT_FOUND', 'Lesson not found');
    }

    
    let isEnrolled = false;
    if (req.user.role === 'LEARNER') {
      if (lesson.course.status === 'DRAFT') {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const enrollment = await prisma.enrollment.findUnique({
        where: { learnerId_courseId: { learnerId: req.user.id, courseId: lesson.courseId } }
      });
      isEnrolled = !!enrollment;
      if (!isEnrolled && lesson.course.status === 'ARCHIVED') {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (!isEnrolled) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } else if (req.user.role === 'INSTRUCTOR') {
      if (lesson.course.instructorId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
  

    const comments = await prisma.comment.findMany({
      where: { lessonId },
      include: { author: { select: { email: true, role: true } } },
      orderBy: { createdAt: 'asc' }
    });

    res.json(comments);
  } catch (error) {
    next(error);
  }
};
