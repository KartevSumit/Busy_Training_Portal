const { z } = require('zod');

const createQuizSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
});

const updateQuizSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
});

const quizQuestionSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  optionA: z.string().min(1, 'Option A is required'),
  optionB: z.string().min(1, 'Option B is required'),
  optionC: z.string().min(1, 'Option C is required'),
  optionD: z.string().min(1, 'Option D is required'),
  correctOption: z.enum(['A', 'B', 'C', 'D'], {
    errorMap: () => ({ message: 'correctOption must be A, B, C, or D' }),
  }),
});

const updateQuizQuestionSchema = quizQuestionSchema.partial();

const submitQuizSchema = z.object({
  answers: z.record(z.string(), z.string(), {
    errorMap: () => ({ message: 'Invalid answers format' }),
  }),
});

module.exports = {
  createQuizSchema,
  updateQuizSchema,
  quizQuestionSchema,
  updateQuizQuestionSchema,
  submitQuizSchema,
};
