const prisma = require('../db/prisma');
const AppError = require('../utils/AppError');

exports.getCourseActivity = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new AppError(404, 'COURSE_NOT_FOUND', 'Course not found');
    }

    if (course.instructorId !== req.user.id && req.user.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to view activity for this course');
    }

    const activity = await prisma.activityLog.findMany({
      where: { courseId },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' }
      ],
      select: {
        id: true,
        courseId: true,
        actorId: true,
        actionType: true,
        detail: true,
        createdAt: true,
        actor: {
          select: {
            email: true,
            role: true
          }
        }
      }
    });

    res.status(200).json({ data: activity });
  } catch (error) {
    next(error);
  }
};

exports.addComment = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const { text } = req.body;
    
    if (!text || typeof text !== 'string' || text.trim() === '') {
      throw new AppError(400, 'VALIDATION_ERROR', 'Comment text is required');
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new AppError(404, 'COURSE_NOT_FOUND', 'Course not found');
    }

    let canComment = false;
    if (course.instructorId === req.user.id || req.user.role === 'ADMIN') {
      canComment = true;
    } else if (req.user.role === 'LEARNER') {
      if (course.status === 'PUBLISHED' || course.status === 'ARCHIVED') {
        const enrollment = await prisma.enrollment.findUnique({
          where: { learnerId_courseId: { learnerId: req.user.id, courseId } }
        });
        if (enrollment) {
          canComment = true;
        }
      }
    }

    if (!canComment) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to comment on this course');
    }

    const result = await prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          courseId,
          authorId: req.user.id,
          text: text.trim()
        }
      });

      const activity = await tx.activityLog.create({
        data: {
          courseId,
          actorId: req.user.id,
          actionType: 'COMMENT_ADDED',
          detail: { text: text.trim(), commentId: comment.id }
        }
      });

      return { comment, activity };
    });

    res.status(201).json({ data: result.activity });
  } catch (error) {
    next(error);
  }
};
