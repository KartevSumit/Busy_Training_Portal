const prisma = require('../db/prisma');
const AppError = require('../utils/AppError');

const getOwnedCourse = async (courseId, instructorId) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });

  if (!course) {
    throw new AppError(404, 'COURSE_NOT_FOUND', 'Course not found');
  }

  if (course.instructorId !== instructorId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have permission to access this course');
  }

  return course;
};

const getOwnedLesson = async (lessonId, instructorId) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { course: true },
  });

  if (!lesson) {
    throw new AppError(404, 'LESSON_NOT_FOUND', 'Lesson not found');
  }

  if (lesson.course.instructorId !== instructorId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have permission to access this lesson');
  }

  return lesson;
};

module.exports = {
  getOwnedCourse,
  getOwnedLesson,
};
