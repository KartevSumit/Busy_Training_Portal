const prisma = require('../db/prisma');
const { getOwnedCourse } = require('./ownership.service');
const { recordActivity } = require('./activityLog.service');

async function createCourse(data, instructorId) {
  return prisma.$transaction(async (tx) => {
    const course = await tx.course.create({
      data: {
        ...data,
        status: 'DRAFT',
        instructorId,
      },
    });

    await recordActivity(tx, {
      courseId: course.id,
      actorId: instructorId,
      actionType: 'COURSE_CREATED',
      detail: {
        title: course.title,
        category: course.category
      }
    });

    return course;
  });
}

async function updateCourse(courseId, data, instructorId) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.course.findUnique({
      where: { id: courseId }
    });

    if (!existing) {
      const AppError = require('../utils/AppError');
      throw new AppError(404, 'COURSE_NOT_FOUND', 'Course not found');
    }
    
    if (existing.instructorId !== instructorId) {
      const AppError = require('../utils/AppError');
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to modify this course');
    }

    const changedFields = [];
    if (data.title !== undefined && data.title !== existing.title) changedFields.push('title');
    if (data.description !== undefined && data.description !== existing.description) changedFields.push('description');
    if (data.category !== undefined && data.category !== existing.category) changedFields.push('category');

    const updatedCourse = await tx.course.update({
      where: { id: courseId },
      data,
    });

    if (changedFields.length > 0) {
      await recordActivity(tx, {
        courseId,
        actorId: instructorId,
        actionType: 'COURSE_UPDATED',
        detail: { changedFields }
      });
    }

    return updatedCourse;
  });
}

module.exports = {
  createCourse,
  updateCourse
};
