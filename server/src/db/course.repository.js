const prisma = require('./prisma');

async function listCourses(filters, sort, page, pageSize) {
  const where = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.category) {
    where.category = filters.category;
  }

  if (filters.instructorId) {
    where.instructorId = filters.instructorId;
  }

  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: 'insensitive' } },
      { description: { contains: filters.q, mode: 'insensitive' } }
    ];
  }

  const sortMap = {
    title: { title: 'asc' },
    created_at: { createdAt: 'desc' },
    enrollment_count: { enrollments: { _count: 'desc' } }
  };

  const finalOrderBy = [
    sortMap[sort] ?? { title: 'asc' },
    { id: 'asc' }
  ];

  const total = await prisma.course.count({ where });

  const data = await prisma.course.findMany({
    where,
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: finalOrderBy,
    include: {
      _count: {
        select: { enrollments: true }
      }
    }
  });

  return { data, total };
}

module.exports = {
  listCourses
};
