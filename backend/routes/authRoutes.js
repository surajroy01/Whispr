const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

/**
 * API Routes - Authentication
 * POST /api/auth/register         - Register new user
 * POST /api/auth/login            - Login user
 * PUT  /api/auth/change-password  - Change password (auth required)
 * POST /api/auth/forgot-password  - Request password reset
 * POST /api/auth/reset-password   - Reset password with token
 */
router.post('/register', authController.register);
router.post('/login', authController.login);
router.put('/change-password', protect, authController.changePassword);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
