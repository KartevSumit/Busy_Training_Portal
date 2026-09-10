const express = require('express');
const { 
  updateLesson, 
  deleteLesson, 
  reorderLesson 
} = require('../controllers/lesson.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticateToken);

router.patch('/:id', requireRole('INSTRUCTOR'), updateLesson);
router.delete('/:id', requireRole('INSTRUCTOR'), deleteLesson);
router.patch('/:id/reorder', requireRole('INSTRUCTOR'), reorderLesson);

module.exports = router;
