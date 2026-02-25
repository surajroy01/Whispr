const express = require('express');
const auth = require("../middleware/auth");
const router = express.Router();
const friendController = require('../controllers/friendController');
const { protect } = require('../middleware/auth');

/**
 * API Routes - Friends
 * All routes require JWT authentication
 */
router.use(protect);

router.post('/request', friendController.sendRequest);
router.get('/', friendController.getFriends);
router.get('/requests', friendController.getRequests);
router.put('/:id/accept', friendController.acceptRequest);
router.put('/:id/decline', friendController.declineRequest);
router.post("/block", protect, friendController.blockUser);
router.post("/unblock", protect, friendController.unblockUser);

module.exports = router;
