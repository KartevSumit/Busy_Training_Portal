const { z } = require('zod');

const catalogQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  instructor: z.string().uuid("Invalid instructor format").optional(),
  sort: z.enum(['title', 'created_at', 'enrollment_count']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});

module.exports = {
  catalogQuerySchema,
};
