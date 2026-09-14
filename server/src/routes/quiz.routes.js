const express = require('express');
const {
  getQuiz,
  updateQuiz,
  deleteQuiz,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  submitQuiz
} = require('../controllers/quiz.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticateToken);

router.get('/:id', getQuiz);
router.patch('/:id', requireRole('INSTRUCTOR'), updateQuiz);
router.delete('/:id', requireRole('INSTRUCTOR'), deleteQuiz);

router.post('/:id/questions', requireRole('INSTRUCTOR'), createQuestion);
router.patch('/questions/:id', requireRole('INSTRUCTOR'), updateQuestion);
router.delete('/questions/:id', requireRole('INSTRUCTOR'), deleteQuestion);

router.post('/:id/submit', submitQuiz);

module.exports = router;
