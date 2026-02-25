/**
 * Friend Controller
 * Handles friend requests and friends list
 */
const Friend = require('../models/Friend');
const User = require('../models/User');

/**
 * @route   POST /api/friends/request
 * @desc    Send friend request
 */
exports.sendRequest = async (req, res) => {
  try {
    const { recipientId } = req.body;
    const requesterId = req.user._id;

    if (requesterId.toString() === recipientId) {
      return res.status(400).json({ message: 'Cannot send request to yourself' });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'User not found' });
    }

    let friendship = await Friend.findOne({
      $or: [
        { requester: requesterId, recipient: recipientId },
        { requester: recipientId, recipient: requesterId }
      ]
    });

    if (friendship) {
      if (friendship.status === 'accepted') {
        return res.status(400).json({ message: 'Already friends' });
      }
      if (friendship.status === 'pending') {
        return res.status(400).json({ message: 'Friend request already sent' });
      }
      // If declined, create new request
      await Friend.deleteOne({ _id: friendship._id });
    }

    friendship = await Friend.create({
      requester: requesterId,
      recipient: recipientId,
      status: 'pending'
    });

    await friendship.populate(['requester', 'recipient']);
    res.status(201).json(friendship);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   PUT /api/friends/:id/accept
 * @desc    Accept friend request
 */
exports.acceptRequest = async (req, res) => {
  try {
    const friendship = await Friend.findOne({
      recipient: req.user._id,
      requester: req.params.id,
      status: 'pending'
    });

    if (!friendship) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    friendship.status = 'accepted';
    await friendship.save();
    await friendship.populate(['requester', 'recipient']);
    res.json(friendship);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   PUT /api/friends/:id/decline
 * @desc    Decline friend request
 */
exports.declineRequest = async (req, res) => {
  try {
    const friendship = await Friend.findOneAndDelete({
      recipient: req.user._id,
      requester: req.params.id,
      status: 'pending'
    });

    if (!friendship) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    res.json({ message: 'Request declined' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   GET /api/friends
 * @desc    Get friends list
 */
exports.getFriends = async (req, res) => {
  try {
    const friendships = await Friend.find({
      $or: [{ requester: req.user._id }, { recipient: req.user._id }],
      status: 'accepted'
    })
      .populate('requester', 'username email profilePicture isOnline lastSeen')
      .populate('recipient', 'username email profilePicture isOnline lastSeen');

    const friends = friendships.map((f) => {
      const friend = f.requester._id.toString() === req.user._id.toString()
        ? f.recipient
        : f.requester;
      return friend;
    });

    res.json(friends);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   GET /api/friends/requests
 * @desc    Get pending friend requests (received)
 */
exports.getRequests = async (req, res) => {
  try {
    const requests = await Friend.find({
      recipient: req.user._id,
      status: 'pending'
    }).populate('requester', 'username email profilePicture');

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.blockUser = async (req, res) => {
    try {
        const { userIdToBlock } = req.body;

        const user = await User.findById(req.user.id);

        if (user.blockedUsers.includes(userIdToBlock)) {
            return res.status(400).json({ message: "User already blocked" });
        }

        user.blockedUsers.push(userIdToBlock);
        await user.save();

        res.status(200).json({ message: "User blocked successfully" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.unblockUser = async (req, res) => {
    try {
        const { userIdToUnblock } = req.body;

        const user = await User.findById(req.user.id);

        user.blockedUsers = user.blockedUsers.filter(
            id => id.toString() !== userIdToUnblock
        );

        await user.save();

        res.status(200).json({ message: "User unblocked successfully" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
