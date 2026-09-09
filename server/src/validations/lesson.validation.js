const { z } = require('zod');

const createLessonSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
});

const updateLessonSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  content: z.string().min(1, 'Content is required').optional(),
});

const reorderLessonSchema = z.object({
  newPosition: z.number().int().min(0, 'newPosition must be a non-negative integer'),
});

module.exports = {
  createLessonSchema,
  updateLessonSchema,
  reorderLessonSchema,
};
