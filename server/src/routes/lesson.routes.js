const express = require('express');
const { 
  updateLesson, 
  deleteLesson, 
  reorderLesson 
} = require('../controllers/lesson.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('INSTRUCTOR'));

router.patch('/:id', updateLesson);
router.delete('/:id', deleteLesson);
router.patch('/:id/reorder', reorderLesson);

module.exports = router;
