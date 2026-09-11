const exportService = require('../services/export.service');
const prisma = require('../db/prisma');
const AppError = require('../utils/AppError');

exports.exportCourseProgress = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const instructorId = req.user.id;

    const sanitizedId = String(courseId).replace(/[^a-zA-Z0-9-]/g, '');

    const csvContent = await exportService.exportCourseProgress(courseId, instructorId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="course-progress-${sanitizedId}.csv"`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};
