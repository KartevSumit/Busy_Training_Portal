const { listCourses } = require('../db/course.repository');

async function getCatalog(query, user) {
  const filters = {};

  if (query.q) {
    filters.q = query.q;
  }
  
  if (query.category) {
    filters.category = query.category;
  }

  if (query.instructor) {
    filters.instructorId = query.instructor;
  }

  if (user?.role === 'LEARNER') {
    filters.status = 'PUBLISHED';
    filters.learnerId = user.id;
  } else if (query.status) {
    filters.status = query.status;
  }

  const { data, total } = await listCourses(filters, query.sort || 'title', query.page, query.pageSize);

  const formattedData = data.map(course => {
    const formatted = {
      id: course.id,
      title: course.title,
      description: course.description,
      category: course.category,
      status: course.status,
      instructorId: course.instructorId,
      createdAt: course.createdAt.toISOString(),
      updatedAt: course.updatedAt.toISOString(),
      enrollmentCount: course._count?.enrollments ?? 0
    };

    if (user?.role === 'LEARNER') {
      formatted.is_enrolled = Array.isArray(course.enrollments) && course.enrollments.length > 0;
    }

    return formatted;
  });

  const totalPages = Math.ceil(total / query.pageSize);

  return {
    data: formattedData,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages
    }
  };
}

module.exports = {
  getCatalog
};
