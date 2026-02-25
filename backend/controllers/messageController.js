/**
 * Message Controller
 * Handles private message history retrieval
 */
const Message = require('../models/Message');
const Friend = require('../models/Friend');
const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * @route   GET /api/messages/:userId
 * @desc    Get conversation with a user (friends only)
 */
exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.params;          // ✅ Correct param name
    const currentUserId = req.user._id;

    // Validate user
    const receiver = await User.findById(userId);
    if (!receiver) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Block checks
    if (receiver.blockedUsers?.includes(currentUserId)) {
      return res.status(403).json({
        message: "You are blocked by this user"
      });
    }

    if (req.user.blockedUsers?.includes(userId)) {
      return res.status(403).json({
        message: "You have blocked this user"
      });
    }

    // Convert to ObjectId (safe comparison)
    const userObjId = new mongoose.Types.ObjectId(userId);
    const currentObjId = new mongoose.Types.ObjectId(currentUserId);

    // Verify friendship
    const friendship = await Friend.findOne({
      $or: [
        { requester: currentObjId, recipient: userObjId, status: 'accepted' },
        { requester: userObjId, recipient: currentObjId, status: 'accepted' }
      ]
    });

    if (!friendship) {
      return res.status(403).json({ message: 'You can only chat with friends' });
    }

    // Fetch messages
    const messages = await Message.find({
      $or: [
        { sender: currentObjId, receiver: userObjId },
        { sender: userObjId, receiver: currentObjId }
      ]
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'username profilePicture')
      .populate('receiver', 'username profilePicture');

    res.json(messages);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};