const prisma = require('../db/prisma');

async function getActiveAlertsForInstructor(instructorId) {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const alerts = await prisma.enrollment.findMany({
    where: {
      course: { instructorId },
      status: 'IN_PROGRESS',
      statusChangedAt: { lt: fourteenDaysAgo }
    },
    include: {
      course: { select: { id: true, title: true } },
      learner: { select: { id: true, email: true } }
    }
  });

  const rawAlerts = await prisma.$queryRaw`
    SELECT 
      e.id as "enrollmentId",
      e.status_changed_at as "episodeStart",
      e.status,
      c.id as "courseId",
      c.title as "courseTitle",
      u.id as "learnerId",
      u.email as "learnerEmail"
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    JOIN "User" u ON e.learner_id = u.id
    WHERE c.instructor_id = ${instructorId}
      AND e.status = 'IN_PROGRESS'
      AND e.status_changed_at < ${fourteenDaysAgo}
      AND NOT EXISTS (
        SELECT 1 FROM alert_dismissals ad 
        WHERE ad.learner_id = e.learner_id 
          AND ad.course_id = e.course_id 
          AND ad.episode_start = e.status_changed_at
      )
    ORDER BY e.status_changed_at DESC;
  `;

  const formattedAlerts = rawAlerts.map(alert => {
    const episodeStart = new Date(alert.episodeStart);
    const diffTime = Math.abs(new Date() - episodeStart);
    const inactiveDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return {
      learnerId: alert.learnerId,
      learnerEmail: alert.learnerEmail,
      courseId: alert.courseId,
      courseTitle: alert.courseTitle,
      status: alert.status,
      episodeStart: episodeStart.toISOString(),
      inactiveDays
    };
  });

  return formattedAlerts;
}

async function getAlertCountForInstructor(instructorId) {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const result = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    WHERE c.instructor_id = ${instructorId}
      AND e.status = 'IN_PROGRESS'
      AND e.status_changed_at < ${fourteenDaysAgo}
      AND NOT EXISTS (
        SELECT 1 FROM alert_dismissals ad 
        WHERE ad.learner_id = e.learner_id 
          AND ad.course_id = e.course_id 
          AND ad.episode_start = e.status_changed_at
      );
  `;

  return Number(result[0].count);
}

async function dismissAlert(instructorId, courseId, learnerId) {
  return prisma.$transaction(async (tx) => {
    const course = await tx.course.findUnique({ where: { id: courseId } });
    if (!course) {
      const AppError = require('../utils/AppError');
      throw new AppError(404, 'COURSE_NOT_FOUND', 'Course not found');
    }
    if (course.instructorId !== instructorId) {
      const AppError = require('../utils/AppError');
      throw new AppError(403, 'FORBIDDEN', 'You do not own this course');
    }

    const enrollment = await tx.enrollment.findUnique({
      where: {
        learnerId_courseId: {
          learnerId,
          courseId
        }
      }
    });

    if (!enrollment) {
      const AppError = require('../utils/AppError');
      throw new AppError(404, 'ENROLLMENT_NOT_FOUND', 'Enrollment not found');
    }

    if (enrollment.status !== 'IN_PROGRESS') {
      const AppError = require('../utils/AppError');
      throw new AppError(400, 'INVALID_STATE', 'Learner is not currently IN_PROGRESS');
    }

    const episodeStart = enrollment.statusChangedAt;

    try {
      await tx.alertDismissal.create({
        data: {
          learnerId,
          courseId,
          episodeStart
        }
      });
    } catch (error) {
      if (error.code !== 'P2002') {
        throw error;
      }
    }

    return { success: true };
  });
}

module.exports = {
  getActiveAlertsForInstructor,
  getAlertCountForInstructor,
  dismissAlert
};
