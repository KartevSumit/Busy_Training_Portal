const prisma = require('../db/prisma');
const AppError = require('../utils/AppError');

const enrollLearner = async (courseId, learnerId) => {
  try {
    const enrollment = await prisma.enrollment.create({
      data: {
        courseId,
        learnerId,
        status: 'NOT_STARTED',
      },
    });
    return enrollment;
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError(409, 'ALREADY_ENROLLED', 'Learner is already enrolled in this course');
    }
    throw error;
  }
};

const bulkEnrollLearners = async (courseId, emails) => {
  const normalizedEmails = [...new Set(emails.map(e => e.trim().toLowerCase()))];

  const results = [];

  const users = await prisma.user.findMany({
    where: {
      email: { in: normalizedEmails },
      role: 'LEARNER',
    },
  });

  const userMap = new Map();
  users.forEach(u => userMap.set(u.email, u));

  const existingEnrollments = await prisma.enrollment.findMany({
    where: {
      courseId,
      learnerId: { in: users.map(u => u.id) },
    },
  });

  const enrolledUserIds = new Set(existingEnrollments.map(e => e.learnerId));

  const enrollOps = [];
  const enrolledInThisBatch = new Set();

  for (const email of normalizedEmails) {
    const user = userMap.get(email);

    if (!user) {
      results.push({ email, outcome: 'unknown' });
    } else if (enrolledUserIds.has(user.id)) {
      results.push({ email, outcome: 'already_enrolled' });
    } else {
      results.push({ email, outcome: 'enrolled' });
      if (!enrolledInThisBatch.has(user.id)) {
        enrolledInThisBatch.add(user.id);
        enrollOps.push(
          prisma.enrollment.create({
            data: {
              courseId,
              learnerId: user.id,
              status: 'NOT_STARTED',
            },
          })
        );
      }
    }
  }

  if (enrollOps.length > 0) {
    await prisma.$transaction(enrollOps);
  }

  return results;
};

module.exports = {
  enrollLearner,
  bulkEnrollLearners,
};
