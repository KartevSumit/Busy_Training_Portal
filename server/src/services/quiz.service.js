const prisma = require('../db/prisma');
const { recordActivity } = require('./activityLog.service');
const AppError = require('../utils/AppError');

const createQuiz = async (courseId, instructorId, title) => {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new Error('Course not found');
  if (course.instructorId !== instructorId) throw new Error('Forbidden');

  const quiz = await prisma.quiz.create({
    data: { courseId, title }
  });

  await recordActivity(prisma, { actorId: instructorId, courseId, actionType: 'QUIZ_CREATED', detail: { quizId: quiz.id, title } });
  return quiz;
};

const getQuizzesByCourse = async (courseId) => {
  return await prisma.quiz.findMany({
    where: { courseId },
    orderBy: { createdAt: 'asc' }
  });
};

const getQuizById = async (id) => {
  return await prisma.quiz.findUnique({
    where: { id },
    include: {
      course: { select: { instructorId: true } },
      questions: { orderBy: { position: 'asc' } }
    }
  });
};

const updateQuiz = async (id, instructorId, data) => {
  const quiz = await getQuizById(id);
  if (!quiz) throw new Error('Quiz not found');
  if (quiz.course.instructorId !== instructorId) throw new Error('Forbidden');

  return await prisma.quiz.update({
    where: { id },
    data
  });
};

const deleteQuiz = async (id, instructorId) => {
  const quiz = await getQuizById(id);
  if (!quiz) throw new Error('Quiz not found');
  if (quiz.course.instructorId !== instructorId) throw new Error('Forbidden');

  return await prisma.quiz.delete({ where: { id } });
};

const createQuestion = async (quizId, instructorId, data) => {
  const quiz = await getQuizById(quizId);
  if (!quiz) throw new Error('Quiz not found');
  if (quiz.course.instructorId !== instructorId) throw new Error('Forbidden');

  const lastQuestion = await prisma.quizQuestion.findFirst({
    where: { quizId },
    orderBy: { position: 'desc' }
  });
  const position = lastQuestion ? lastQuestion.position + 1 : 1;

  return await prisma.quizQuestion.create({
    data: { ...data, quizId, position }
  });
};

const updateQuestion = async (id, instructorId, data) => {
  const question = await prisma.quizQuestion.findUnique({
    where: { id },
    include: { quiz: { include: { course: true } } }
  });
  if (!question) throw new Error('Question not found');
  if (question.quiz.course.instructorId !== instructorId) throw new Error('Forbidden');

  return await prisma.quizQuestion.update({
    where: { id },
    data
  });
};

const deleteQuestion = async (id, instructorId) => {
  const question = await prisma.quizQuestion.findUnique({
    where: { id },
    include: { quiz: { include: { course: true } } }
  });
  if (!question) throw new Error('Question not found');
  if (question.quiz.course.instructorId !== instructorId) throw new Error('Forbidden');

  return await prisma.quizQuestion.delete({ where: { id } });
};

const submitQuiz = async (id, user, answers) => {
  const quiz = await getQuizById(id);
  if (!quiz) throw new Error('Quiz not found');
  
  
  let score = 0;
  for (const q of quiz.questions) {
    if (answers[q.id] === q.correctOption) {
      score += 1;
    }
  }

  return { score, total: quiz.questions.length };
};

module.exports = {
  createQuiz,
  getQuizzesByCourse,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  submitQuiz
};
