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
