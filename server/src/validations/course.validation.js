const { z } = require('zod');

const createCourseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
});

const updateCourseSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required').optional(),
});

module.exports = {
  createCourseSchema,
  updateCourseSchema,
};
