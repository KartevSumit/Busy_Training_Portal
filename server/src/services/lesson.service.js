const prisma = require('../db/prisma');
const AppError = require('../utils/AppError');
const { getOwnedLesson } = require('./ownership.service');

const LESSON_POSITION_OFFSET = 10000;

const reorderLesson = async (lessonId, newPosition, instructorId) => {
  const targetLesson = await getOwnedLesson(lessonId, instructorId);
  const courseId = targetLesson.courseId;

  if (!Number.isInteger(newPosition) || newPosition < 0) {
    throw new AppError(400, 'INVALID_POSITION', 'newPosition must be a non-negative integer');
  }

  const allLessons = await prisma.lesson.findMany({
    where: { courseId },
    orderBy: { position: 'asc' },
  });

  const totalLessons = allLessons.length;
  if (newPosition >= totalLessons) {
    throw new AppError(400, 'INVALID_POSITION', `newPosition must be between 0 and ${totalLessons - 1}`);
  }

  const lessonIndex = allLessons.findIndex(l => l.id === lessonId);
  if (lessonIndex === -1) {
    throw new AppError(404, 'LESSON_NOT_FOUND', 'Lesson not found in course');
  }

  const [removedLesson] = allLessons.splice(lessonIndex, 1);
  allLessons.splice(newPosition, 0, removedLesson);


  const transactionOps = [];

  for (let i = 0; i < allLessons.length; i++) {
    const lesson = allLessons[i];
    transactionOps.push(
      prisma.lesson.update({
        where: { id: lesson.id },
        data: { position: lesson.position + LESSON_POSITION_OFFSET },
      })
    );
  }

  for (let i = 0; i < allLessons.length; i++) {
    const lesson = allLessons[i];
    transactionOps.push(
      prisma.lesson.update({
        where: { id: lesson.id },
        data: { position: i },
      })
    );
  }

  await prisma.$transaction(transactionOps);

  return prisma.lesson.findMany({
    where: { courseId },
    orderBy: { position: 'asc' },
  });
};

module.exports = {
  reorderLesson,
};
