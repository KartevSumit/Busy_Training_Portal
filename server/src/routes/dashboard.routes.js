const express = require('express');
const { getDashboardSummary } = require('../controllers/dashboard.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('INSTRUCTOR'));

router.get('/summary', getDashboardSummary);

module.exports = router;
