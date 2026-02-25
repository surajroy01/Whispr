/**
 * Group Controller
 * Handles group creation, members, and group messages
 */
const Group = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');
const Friend = require('../models/Friend');

/**
 * @route   POST /api/groups
 * @desc    Create new group
 */
exports.createGroup = async (req, res) => {
  try {
    const { name, description, memberIds } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    const members = [req.user._id];
    if (memberIds && Array.isArray(memberIds)) {
      // Verify all members are friends
      for (const memberId of memberIds) {
        const friendship = await Friend.findOne({
          $or: [
            { requester: req.user._id, recipient: memberId, status: 'accepted' },
            { requester: memberId, recipient: req.user._id, status: 'accepted' }
          ]
        });
        if (friendship && !members.some(m => m.toString() === memberId)) {
          members.push(memberId);
        }
      }
    }

    const group = await Group.create({
      name,
      description: description || '',
      admin: req.user._id,
      members
    });

    await group.populate('admin members', 'username profilePicture');
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   GET /api/groups
 * @desc    Get user's groups
 */
exports.getGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('admin', 'username profilePicture')
      .populate('members', 'username profilePicture isOnline');

    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   GET /api/groups/:id
 * @desc    Get group details
 */
exports.getGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('admin', 'username profilePicture')
      .populate('members', 'username profilePicture isOnline');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.members.some(m => m._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   PUT /api/groups/:id
 * @desc    Update group (admin only)
 */
exports.updateGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group || group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only admin can update group' });
    }

    const { name, description } = req.body;
    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    await group.save();

    await group.populate('admin members', 'username profilePicture');
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   POST /api/groups/:id/members
 * @desc    Add members to group (admin only, must be friends)
 */
exports.addMembers = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group || group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only admin can add members' });
    }

    const { memberIds } = req.body;
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ message: 'Provide member IDs' });
    }

    for (const memberId of memberIds) {
      const friendship = await Friend.findOne({
        $or: [
          { requester: req.user._id, recipient: memberId, status: 'accepted' },
          { requester: memberId, recipient: req.user._id, status: 'accepted' }
        ]
      });
      if (friendship && !group.members.some(m => m.toString() === memberId)) {
        group.members.push(memberId);
      }
    }

    await group.save();
    await group.populate('admin members', 'username profilePicture');
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   DELETE /api/groups/:id/members/:memberId
 * @desc    Remove member (admin) or leave group (member)
 */
exports.removeMember = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const { memberId } = req.params;
    const isAdmin = group.admin.toString() === req.user._id.toString();
    const isRemovingSelf = memberId === req.user._id.toString();

    if (isRemovingSelf) {
      group.members = group.members.filter(m => m.toString() !== memberId);
      if (group.members.length === 0) {
        await Group.deleteOne({ _id: group._id });
        return res.json({ message: 'Group deleted (no members left)' });
      }
      if (isAdmin && group.members.length > 0) {
        group.admin = group.members[0];
      }
    } else if (isAdmin) {
      group.members = group.members.filter(m => m.toString() !== memberId);
    } else {
      return res.status(403).json({ message: 'Only admin can remove members' });
    }

    await group.save();
    await group.populate('admin members', 'username profilePicture');
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @route   GET /api/groups/:id/messages
 * @desc    Get group message history
 */
exports.getMessages = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group || !group.members.some(m => m.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    const messages = await GroupMessage.find({ group: req.params.id })
      .sort({ createdAt: 1 })
      .populate('sender', 'username profilePicture');

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
