const { z } = require('zod');

const emptyToNull = (val) => val === '' ? null : val;

const resourceUrlSchema = z.union([
  z.string().url('Invalid URL format'),
  z.literal(''),
  z.null()
]).optional().transform(emptyToNull);

const resourceNameSchema = z.union([
  z.string(),
  z.literal(''),
  z.null()
]).optional().transform(emptyToNull);

const resourceRefinement = (data) => {
  if (data.resourceName && !data.resourceUrl) {
    return false;
  }
  return true;
};

const createLessonSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  resourceUrl: resourceUrlSchema,
  resourceName: resourceNameSchema,
}).refine(resourceRefinement, {
  message: 'Resource Name cannot be provided without a Resource URL',
  path: ['resourceName']
});

const updateLessonSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  content: z.string().min(1, 'Content is required').optional(),
  resourceUrl: resourceUrlSchema,
  resourceName: resourceNameSchema,
}).refine(resourceRefinement, {
  message: 'Resource Name cannot be provided without a Resource URL',
  path: ['resourceName']
});

const reorderLessonSchema = z.object({
  newPosition: z.number().int().min(0, 'newPosition must be a non-negative integer'),
});

module.exports = {
  createLessonSchema,
  updateLessonSchema,
  reorderLessonSchema,
};
