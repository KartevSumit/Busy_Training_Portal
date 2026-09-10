const express = require('express');
const { completeLesson } = require('../controllers/progress.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticateToken);

router.post('/:id/complete', requireRole('LEARNER'), completeLesson);

module.exports = router;
