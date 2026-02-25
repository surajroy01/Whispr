const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

/**
 * API Routes - Users & Profile
 * All routes require JWT authentication
 */
router.use(protect);

router.get('/me', userController.getProfile);
router.put('/me', upload.single('profilePicture'), userController.updateProfile);
router.get('/search', userController.searchUsers);
router.get('/:id', userController.getUserById);

module.exports = router;
