const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

/**
 * API Routes - Private Messages
 * GET /api/messages/:userId - Get conversation with user
 */
router.use(protect);
router.get('/:userId', messageController.getMessages);

module.exports = router;
