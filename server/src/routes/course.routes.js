const express = require('express');
const {
  createCourse,
  getCourse,
  listCourses,
  updateCourse,
  publishCourse,
  archiveCourse,
  restoreCourse
} = require('../controllers/course.controller');
const {
  createLesson,
  getCourseLessons
} = require('../controllers/lesson.controller');
const {
  enroll,
  bulkEnroll
} = require('../controllers/enrollment.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { getCourseActivity } = require('../controllers/activityLog.controller');

const router = express.Router();

router.use(authenticateToken);

router.post('/', requireRole('INSTRUCTOR'), createCourse);
router.get('/', listCourses);
router.get('/:id', getCourse);
router.patch('/:id', requireRole('INSTRUCTOR'), updateCourse);

router.get('/:id/activity', requireRole('INSTRUCTOR'), getCourseActivity);
router.post('/:id/alerts/:learnerId/dismiss', requireRole('INSTRUCTOR'), require('../controllers/alert.controller').dismissAlert);

router.post('/:id/publish', requireRole('INSTRUCTOR'), publishCourse);
router.post('/:id/archive', requireRole('INSTRUCTOR'), archiveCourse);
router.post('/:id/restore', requireRole('INSTRUCTOR'), restoreCourse);

router.post('/:id/lessons', requireRole('INSTRUCTOR'), createLesson);
router.get('/:id/lessons', getCourseLessons);

router.post('/:id/enroll', enroll);
router.post('/:id/enroll-bulk', requireRole('INSTRUCTOR'), bulkEnroll);

module.exports = router;
