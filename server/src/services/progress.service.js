const prisma = require('../db/prisma');
const AppError = require('../utils/AppError');

const markLessonComplete = async (enrollmentId, lessonId) => {
  return await prisma.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      throw new AppError(404, 'ENROLLMENT_NOT_FOUND', 'Enrollment not found');
    }

    const lesson = await tx.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new AppError(404, 'LESSON_NOT_FOUND', 'Lesson not found');
    }

    if (enrollment.courseId !== lesson.courseId) {
      throw new AppError(403, 'INVALID_RELATIONSHIP', 'Lesson does not belong to the enrolled course');
    }

    let progressCreated = false;
    try {
      await tx.lessonProgress.create({
        data: {
          enrollmentId,
          lessonId,
        },
      });
      progressCreated = true;
    } catch (error) {
      if (error.code === 'P2002') {
        progressCreated = false;
      } else {
        throw error;
      }
    }

    if (!progressCreated) {
      return enrollment;
    }

    const totalLessons = await tx.lesson.count({
      where: { courseId: enrollment.courseId },
    });

    const completedLessons = await tx.lessonProgress.count({
      where: { enrollmentId },
    });

    let newStatus = 'NOT_STARTED';
    if (completedLessons > 0 && completedLessons < totalLessons) {
      newStatus = 'IN_PROGRESS';
    } else if (completedLessons > 0 && completedLessons >= totalLessons) {
      newStatus = 'COMPLETED';
    }

    if (enrollment.status !== newStatus) {
      return await tx.enrollment.update({
        where: { id: enrollmentId },
        data: {
          status: newStatus,
          statusChangedAt: new Date(),
        },
      });
    }

    return enrollment;
  });
};

module.exports = {
  markLessonComplete,
};
