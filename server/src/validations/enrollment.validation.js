const { z } = require('zod');

const enrollSchema = z.object({
  learnerId: z.string().uuid('learnerId must be a valid UUID').optional(),
});

const bulkEnrollSchema = z.object({
  emails: z.array(z.string().email('Invalid email address')).min(1, 'At least one email is required'),
});

module.exports = {
  enrollSchema,
  bulkEnrollSchema,
};
