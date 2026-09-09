const express = require('express');
const { 
  createCourse, 
  getCourse, 
  updateCourse, 
  publishCourse, 
  archiveCourse, 
  restoreCourse 
} = require('../controllers/course.controller');
const {
  createLesson,
  getCourseLessons
} = require('../controllers/lesson.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticateToken);

// Course endpoints
router.post('/', requireRole('INSTRUCTOR'), createCourse);
router.get('/:id', getCourse);
router.patch('/:id', requireRole('INSTRUCTOR'), updateCourse);

router.post('/:id/publish', requireRole('INSTRUCTOR'), publishCourse);
router.post('/:id/archive', requireRole('INSTRUCTOR'), archiveCourse);
router.post('/:id/restore', requireRole('INSTRUCTOR'), restoreCourse);

// Nested Lesson endpoints within Course
router.post('/:id/lessons', requireRole('INSTRUCTOR'), createLesson);
router.get('/:id/lessons', getCourseLessons);

module.exports = router;
