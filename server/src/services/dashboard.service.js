const prisma = require('../db/prisma');

async function getDashboardSummary(instructorId) {
  const totalLearnersRaw = await prisma.$queryRaw`
    SELECT COUNT(DISTINCT e.learner_id) as count
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    WHERE c.instructor_id = ${instructorId}
  `;
  const totalLearners = Number(totalLearnersRaw[0].count);

  const publishedCourses = await prisma.course.count({
    where: { instructorId, status: 'PUBLISHED' }
  });

  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const completionsThisMonth = await prisma.enrollment.count({
    where: {
      course: { instructorId },
      status: 'COMPLETED',
      statusChangedAt: { gte: startOfMonth }
    }
  });

  const learnersInProgressRaw = await prisma.$queryRaw`
    SELECT COUNT(DISTINCT e.learner_id) as count
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    WHERE c.instructor_id = ${instructorId}
      AND e.status = 'IN_PROGRESS'
  `;
  const learnersInProgress = Number(learnersInProgressRaw[0].count);

  const rawBreakdown = await prisma.$queryRaw`
    SELECT c.id as "courseId", c.title as "courseTitle", e.status, COUNT(e.id) as count
    FROM courses c
    LEFT JOIN enrollments e ON c.id = e.course_id
    WHERE c.instructor_id = ${instructorId}
    GROUP BY c.id, c.title, e.status
    ORDER BY c.title ASC
  `;

  const courseMap = new Map();
  const courses = await prisma.course.findMany({
    where: { instructorId },
    select: { id: true, title: true }
  });

  for (const c of courses) {
    courseMap.set(c.id, {
      courseId: c.id,
      courseTitle: c.title,
      notStarted: 0,
      inProgress: 0,
      completed: 0
    });
  }

  for (const row of rawBreakdown) {
    if (!row.status) continue;

    const entry = courseMap.get(row.courseId);
    if (entry) {
      if (row.status === 'NOT_STARTED') entry.notStarted = Number(row.count);
      else if (row.status === 'IN_PROGRESS') entry.inProgress = Number(row.count);
      else if (row.status === 'COMPLETED') entry.completed = Number(row.count);
    }
  }

  const courseProgress = Array.from(courseMap.values());

  const day = now.getUTCDay() || 7;
  const currentWeekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day + 1));

  const weekStarts = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(currentWeekStart);
    d.setUTCDate(d.getUTCDate() - i * 7);
    weekStarts.push(d);
  }

  const oldestWeekStart = weekStarts[0];

  const rawTrend = await prisma.$queryRaw`
    SELECT DATE_TRUNC('week', e.status_changed_at AT TIME ZONE 'UTC') as "week", COUNT(e.id) as count
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    WHERE c.instructor_id = ${instructorId}
      AND e.status = 'COMPLETED'
      AND e.status_changed_at >= ${oldestWeekStart}
    GROUP BY DATE_TRUNC('week', e.status_changed_at AT TIME ZONE 'UTC')
  `;

  const trendMap = new Map();
  for (const ws of weekStarts) {
    trendMap.set(ws.toISOString(), 0);
  }

  for (const row of rawTrend) {
    const weekStart = new Date(row.week).toISOString();
    if (trendMap.has(weekStart)) {
      trendMap.set(weekStart, Number(row.count));
    }
  }

  const completionTrend = Array.from(trendMap.entries()).map(([weekStart, count]) => ({
    weekStart,
    count
  }));

  return {
    summary: {
      totalLearners,
      publishedCourses,
      completionsThisMonth,
      learnersInProgress
    },
    courseProgress,
    completionTrend
  };
}

module.exports = {
  getDashboardSummary
};
