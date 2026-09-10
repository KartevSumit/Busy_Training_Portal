const express = require('express');
const { getMyEnrollments } = require('../controllers/enrollment.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticateToken);

router.get('/', requireRole('LEARNER'), getMyEnrollments);

module.exports = router;
