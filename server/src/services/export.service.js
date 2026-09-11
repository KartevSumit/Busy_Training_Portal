const prisma = require('../db/prisma');
const AppError = require('../utils/AppError');

async function exportCourseProgress(courseId, instructorId) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, instructorId: true }
  });

  if (!course) {
    throw new AppError(404, 'COURSE_NOT_FOUND', 'Course not found');
  }

  if (course.instructorId !== instructorId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not own this course');
  }

  const totalLessons = await prisma.lesson.count({
    where: { courseId }
  });

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    include: {
      learner: { select: { email: true } },
      _count: {
        select: { lessonProgress: true }
      }
    },
    orderBy: {
      learner: {
        email: 'asc'
      }
    }
  });

  const records = enrollments.map(e => {
    const completedLessons = e._count.lessonProgress;
    let progressPercentage = 0;
    if (totalLessons > 0) {
      progressPercentage = Math.round((completedLessons / totalLessons) * 100);
    }

    return {
      learner_email: e.learner.email,
      course_title: course.title,
      status: e.status,
      enrolled_at: e.enrolledAt.toISOString(),
      status_changed_at: e.statusChangedAt.toISOString(),
      completed_lessons: completedLessons,
      total_lessons: totalLessons,
      progress_percentage: progressPercentage
    };
  });

  const header = ['learner_email', 'course_title', 'status', 'enrolled_at', 'status_changed_at', 'completed_lessons', 'total_lessons', 'progress_percentage'];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = [header.join(',')];
  for (const record of records) {
    const row = header.map(key => escapeCSV(record[key])).join(',');
    csvRows.push(row);
  }

  return csvRows.join('\n');
}

module.exports = {
  exportCourseProgress
};
