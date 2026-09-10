const prisma = require('../db/prisma');

async function recordActivity(txOrPrisma, { courseId, actorId, actionType, detail }) {
  const client = txOrPrisma || prisma;

  return client.activityLog.create({
    data: {
      courseId,
      actorId,
      actionType,
      detail: detail || {}
    }
  });
}

module.exports = {
  recordActivity
};
