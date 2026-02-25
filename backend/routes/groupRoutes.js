const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { protect } = require('../middleware/auth');

/**
 * API Routes - Groups
 * All routes require JWT authentication
 */
router.use(protect);

router.post('/', groupController.createGroup);
router.get('/', groupController.getGroups);
router.get('/:id', groupController.getGroup);
router.put('/:id', groupController.updateGroup);
router.post('/:id/members', groupController.addMembers);
router.delete('/:id/members/:memberId', groupController.removeMember);
router.get('/:id/messages', groupController.getMessages);

module.exports = router;
