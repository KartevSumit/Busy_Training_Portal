const express = require('express');
const { getAlerts, getAlertCount } = require('../controllers/alert.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('INSTRUCTOR'));

router.get('/', getAlerts);
router.get('/count', getAlertCount);

module.exports = router;
