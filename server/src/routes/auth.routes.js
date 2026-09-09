const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticateToken, authController.getMe);
router.post('/provision-instructor', authenticateToken, requireRole('ADMIN'), authController.provisionInstructor);

module.exports = router;
