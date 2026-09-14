const { createQuizSchema, updateQuizSchema, quizQuestionSchema, updateQuizQuestionSchema, submitQuizSchema } = require('../validations/quiz.validation');
const quizService = require('../services/quiz.service');

const prisma = require('../db/prisma');
const getCourseAccess = async (courseId, user) => {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return { canView: false, enrolled: false };
  
  if (user.role === 'INSTRUCTOR') {
    return { canView: course.instructorId === user.id, enrolled: false, course };
  } else if (user.role === 'ADMIN') {
    return { canView: true, enrolled: false, course };
  } else {
    if (course.status === 'DRAFT') return { canView: false, enrolled: false, course };
    const enrollment = await prisma.enrollment.findUnique({
      where: { learnerId_courseId: { learnerId: user.id, courseId } }
    });
    if (!enrollment && course.status === 'ARCHIVED') return { canView: false, enrolled: false, course };
    return { canView: true, enrolled: !!enrollment, course };
  }
};

const getQuiz = async (req, res, next) => {
  try {
    const quiz = await quizService.getQuizById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const access = await getCourseAccess(quiz.courseId, req.user);
    if (!access.canView) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.user.role !== 'INSTRUCTOR' && !access.enrolled) {
      return res.status(403).json({ error: 'Must enroll to view quizzes' });
    }

    if (req.user.role === 'LEARNER' || (req.user.role === 'INSTRUCTOR' && req.user.id !== quiz.course.instructorId)) {
      quiz.questions = quiz.questions.map(q => {
        const { correctOption, ...rest } = q;
        return rest;
      });
    }

    res.json(quiz);
  } catch (err) {
    next(err);
  }
};

const updateQuiz = async (req, res, next) => {
  try {
    const { title } = updateQuizSchema.parse(req.body);
    const quiz = await quizService.updateQuiz(req.params.id, req.user.id, { title });
    res.json(quiz);
  } catch (err) {
    if (err.message === 'Forbidden' || err.message === 'Quiz not found') {
      return res.status(err.message === 'Forbidden' ? 403 : 404).json({ error: err.message });
    }
    next(err);
  }
};

const deleteQuiz = async (req, res, next) => {
  try {
    await quizService.deleteQuiz(req.params.id, req.user.id);
    res.json({ message: 'Quiz deleted' });
  } catch (err) {
    if (err.message === 'Forbidden' || err.message === 'Quiz not found') {
      return res.status(err.message === 'Forbidden' ? 403 : 404).json({ error: err.message });
    }
    next(err);
  }
};

const createQuestion = async (req, res, next) => {
  try {
    const { question, optionA, optionB, optionC, optionD, correctOption } = quizQuestionSchema.parse(req.body);
    
    const newQuestion = await quizService.createQuestion(req.params.id, req.user.id, {
      question, optionA, optionB, optionC, optionD, correctOption
    });
    res.status(201).json(newQuestion);
  } catch (err) {
    if (err.message === 'Forbidden' || err.message === 'Quiz not found') {
      return res.status(err.message === 'Forbidden' ? 403 : 404).json({ error: err.message });
    }
    next(err);
  }
};

const updateQuestion = async (req, res, next) => {
  try {
    const parsedBody = updateQuizQuestionSchema.parse(req.body);
    const updated = await quizService.updateQuestion(req.params.id, req.user.id, parsedBody);
    res.json(updated);
  } catch (err) {
    if (err.message === 'Forbidden' || err.message === 'Question not found') {
      return res.status(err.message === 'Forbidden' ? 403 : 404).json({ error: err.message });
    }
    next(err);
  }
};

const deleteQuestion = async (req, res, next) => {
  try {
    await quizService.deleteQuestion(req.params.id, req.user.id);
    res.json({ message: 'Question deleted' });
  } catch (err) {
    if (err.message === 'Forbidden' || err.message === 'Question not found') {
      return res.status(err.message === 'Forbidden' ? 403 : 404).json({ error: err.message });
    }
    next(err);
  }
};

const submitQuiz = async (req, res, next) => {
  try {
    const { answers } = submitQuizSchema.parse(req.body);
    const quiz = await quizService.getQuizById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    
    const access = await getCourseAccess(quiz.courseId, req.user);
    if (!access.canView) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (req.user.role === 'LEARNER' && !access.enrolled) {
      return res.status(403).json({ error: 'Must enroll to submit quiz' });
    }

    const result = await quizService.submitQuiz(req.params.id, req.user, answers);
    res.json(result);
  } catch (err) {
    if (err.message === 'Forbidden' || err.message === 'Quiz not found') {
      return res.status(err.message === 'Forbidden' ? 403 : 404).json({ error: err.message });
    }
    next(err);
  }
};

module.exports = {
  getQuiz,
  updateQuiz,
  deleteQuiz,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  submitQuiz
};

const createQuiz = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const { title } = createQuizSchema.parse(req.body);
    const quiz = await quizService.createQuiz(courseId, req.user.id, title);
    res.status(201).json(quiz);
  } catch (err) {
    if (err.message === 'Forbidden' || err.message === 'Course not found') {
      return res.status(err.message === 'Forbidden' ? 403 : 404).json({ error: err.message });
    }
    next(err);
  }
};

const listQuizzes = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const access = await getCourseAccess(courseId, req.user);
    if (!access.canView) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    if (req.user.role === 'LEARNER' && !access.enrolled) {
        return res.status(403).json({ error: 'Must enroll to view quizzes' });
    }

    const quizzes = await quizService.getQuizzesByCourse(courseId);
    res.json(quizzes);
  } catch (err) {
    next(err);
  }
};

module.exports.createQuiz = createQuiz;
module.exports.listQuizzes = listQuizzes;
