const prisma = require('../db/prisma');
const AppError = require('../utils/AppError');

const ALLOWED_TRANSITIONS = {
  DRAFT: ['PUBLISHED'],
  PUBLISHED: ['ARCHIVED'],
  ARCHIVED: ['PUBLISHED'],
};

const transitionCourseStatus = async (courseId, newStatus, instructorId) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });

  if (!course) {
    throw new AppError(404, 'COURSE_NOT_FOUND', 'Course not found');
  }

  if (course.instructorId !== instructorId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have permission to modify this course');
  }

  const currentStatus = course.status;

  if (currentStatus === newStatus) {
    throw new AppError(409, 'ILLEGAL_STATE_TRANSITION', `Course is already in ${newStatus} state`);
  }

  const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowedNext.includes(newStatus)) {
    throw new AppError(409, 'ILLEGAL_STATE_TRANSITION', `Cannot transition from ${currentStatus} to ${newStatus}`);
  }

  // Publish gate logic
  if (newStatus === 'PUBLISHED') {
    const lessonCount = await prisma.lesson.count({
      where: { courseId },
    });

    if (lessonCount === 0) {
      throw new AppError(409, 'COURSE_PUBLISH_BLOCKED', 'Cannot publish a course with no lessons');
    }
  }

  const updatedCourse = await prisma.course.update({
    where: { id: courseId },
    data: { status: newStatus },
  });

  return updatedCourse;
};

module.exports = {
  transitionCourseStatus,
};
