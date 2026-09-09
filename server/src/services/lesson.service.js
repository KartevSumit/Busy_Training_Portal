const prisma = require('../db/prisma');
const AppError = require('../utils/AppError');
const { getOwnedLesson } = require('./ownership.service');

const LESSON_POSITION_OFFSET = 10000;

const reorderLesson = async (lessonId, newPosition, instructorId) => {
  // 1. Verify ownership and get the lesson's course
  const targetLesson = await getOwnedLesson(lessonId, instructorId);
  const courseId = targetLesson.courseId;

  // 2. Validate newPosition
  if (!Number.isInteger(newPosition) || newPosition < 0) {
    throw new AppError(400, 'INVALID_POSITION', 'newPosition must be a non-negative integer');
  }

  // 3. Load all lessons ordered by position
  const allLessons = await prisma.lesson.findMany({
    where: { courseId },
    orderBy: { position: 'asc' },
  });

  const totalLessons = allLessons.length;
  if (newPosition >= totalLessons) {
    throw new AppError(400, 'INVALID_POSITION', `newPosition must be between 0 and ${totalLessons - 1}`);
  }

  // 4. Calculate new order in memory
  const lessonIndex = allLessons.findIndex(l => l.id === lessonId);
  if (lessonIndex === -1) {
    throw new AppError(404, 'LESSON_NOT_FOUND', 'Lesson not found in course');
  }

  // Remove target lesson
  const [removedLesson] = allLessons.splice(lessonIndex, 1);
  // Insert at new position
  allLessons.splice(newPosition, 0, removedLesson);

  // 5. Two-phase transaction strategy
  // Why a temporary offset? The database has a UNIQUE(course_id, position) constraint.
  // If we try to update positions directly (e.g. changing 1 to 2 when 2 already exists),
  // PostgreSQL will throw a unique constraint violation immediately, even within a transaction
  // (unless the constraint is explicitly DEFERRABLE, which we are not using).
  // Therefore, Phase 1 shifts all lessons to safe temporary positions.
  // Phase 2 assigns the final contiguous 0..n-1 positions.
  
  const transactionOps = [];

  // Phase 1: Shift to temporary offset positions
  for (let i = 0; i < allLessons.length; i++) {
    const lesson = allLessons[i];
    transactionOps.push(
      prisma.lesson.update({
        where: { id: lesson.id },
        data: { position: lesson.position + LESSON_POSITION_OFFSET },
      })
    );
  }

  // Phase 2: Write final contiguous positions
  for (let i = 0; i < allLessons.length; i++) {
    const lesson = allLessons[i];
    transactionOps.push(
      prisma.lesson.update({
        where: { id: lesson.id },
        data: { position: i },
      })
    );
  }

  // Execute all operations in a single transaction
  await prisma.$transaction(transactionOps);

  // Return the newly ordered lessons
  return prisma.lesson.findMany({
    where: { courseId },
    orderBy: { position: 'asc' },
  });
};

module.exports = {
  reorderLesson,
};
