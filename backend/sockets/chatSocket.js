/**
 * Chat Socket.IO Handlers
 * Manages real-time private messaging, group chat, and typing indicators
 *
 * SOCKET EVENTS FLOW:
 * ==================
 * Client -> Server:
 *   - authenticate: { token } - Verify JWT, set user online
 *   - join_chat: { userId } - Join private chat room
 *   - leave_chat: { userId } - Leave private chat room
 *   - send_message: { receiverId, content, type?, gifUrl? }
 *   - typing_start: { receiverId }
 *   - typing_stop: { receiverId }
 *   - join_group: { groupId }
 *   - leave_group: { groupId }
 *   - send_group_message: { groupId, content, type?, gifUrl? }
 *   - group_typing_start: { groupId }
 *   - group_typing_stop: { groupId }
 *
 * Server -> Client:
 *   - message: { message object }
 *   - message_delivered: { messageId, deliveredAt }
 *   - typing: { userId }
 *   - stop_typing: { userId }
 *   - group_message: { message object }
 *   - group_typing: { userId }
 *   - group_stop_typing: { userId }
 *   - user_online: { userId }
 *   - user_offline: { userId }
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Group = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');

// Map: socketId -> userId (for online status)
const onlineUsers = new Map();

// Map: userId -> Set of socketIds (user might have multiple tabs)
const userSockets = new Map();

const getUserId = (socketId) => onlineUsers.get(socketId);

const addOnlineUser = (socketId, userId) => {
  onlineUsers.set(socketId, userId);
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId).add(socketId);
};

const removeOnlineUser = (socketId) => {
  const userId = onlineUsers.get(socketId);
  onlineUsers.delete(socketId);
  if (userId && userSockets.has(userId)) {
    userSockets.get(userId).delete(socketId);
    if (userSockets.get(userId).size === 0) {
      userSockets.delete(userId);
    }
  }
  return userId;
};

const isUserOnline = (userId) => userSockets.has(userId.toString());

const getSocketsForUser = (userId) => {
  const id = userId?.toString?.() || userId;
  return userSockets.get(id) || new Set();
};

const setupChatSocket = (io) => {
  // Middleware: authenticate socket connection
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('User not found'));
      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;

    // Mark user online
    addOnlineUser(socket.id, userId);
    User.updateOne({ _id: userId }, { $set: { isOnline: true, lastSeen: new Date(), socketId: socket.id } }).exec();

    // Broadcast online status to friends (simplified: emit to all for now; can be optimized with friend rooms)
    socket.broadcast.emit('user_online', { userId });

    // ---- PRIVATE CHAT ----
    socket.on('join_chat', ({ userId: otherUserId }) => {
      const room = [userId, otherUserId].sort().join('_');
      socket.join(`private_${room}`);
    });

    socket.on('leave_chat', ({ userId: otherUserId }) => {
      const room = [userId, otherUserId].sort().join('_');
      socket.leave(`private_${room}`);
    });

    socket.on('send_message', async (data) => {
      try {
        const { receiverId, content, type = 'text', gifUrl } = data;

        const message = await Message.create({
          sender: userId,
          receiver: receiverId,
          content: content || (type === 'gif' ? gifUrl : ''),
          type,
          gifUrl: type === 'gif' ? gifUrl : null
        });

        const populated = await Message.findById(message._id)
          .populate('sender', 'username profilePicture')
          .populate('receiver', 'username profilePicture');

        const room = [userId, receiverId].sort().join('_');
        io.to(`private_${room}`).emit('message', populated);

        // Mark delivered if receiver is online
        if (isUserOnline(receiverId)) {
          populated.isDelivered = true;
          populated.deliveredAt = new Date();
          await Message.updateOne({ _id: message._id }, { $set: { isDelivered: true, deliveredAt: new Date() } });
          const senderSockets = getSocketsForUser(userId);

          senderSockets.forEach(socketId => {
            io.to(socketId).emit('message_delivered', {
              messageId: message._id,
              deliveredAt: populated.deliveredAt
            });
          });
        }
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('typing_start', ({ receiverId }) => {
      const room = [userId, receiverId].sort().join('_');
      socket.to(`private_${room}`).emit('typing', { userId });
    });

    socket.on('typing_stop', ({ receiverId }) => {
      const room = [userId, receiverId].sort().join('_');
      socket.to(`private_${room}`).emit('stop_typing', { userId });
    });

    // ---- GROUP CHAT ----
    socket.on('join_group', async ({ groupId }) => {
      const group = await Group.findById(groupId);
      if (group && group.members.some(m => m.toString() === userId)) {
        socket.join(`group_${groupId}`);
      }
    });

    socket.on('leave_group', ({ groupId }) => {
      socket.leave(`group_${groupId}`);
    });

    socket.on('send_group_message', async (data) => {
      try {
        const { groupId, content, type = 'text', gifUrl } = data;

        const group = await Group.findById(groupId);
        if (!group || !group.members.some(m => m.toString() === userId)) {
          return socket.emit('error', { message: 'Not a group member' });
        }

        const message = await GroupMessage.create({
          group: groupId,
          sender: userId,
          content: content || (type === 'gif' ? gifUrl : ''),
          type,
          gifUrl: type === 'gif' ? gifUrl : null
        });

        const populated = await GroupMessage.findById(message._id)
          .populate('sender', 'username profilePicture');

        io.to(`group_${groupId}`).emit('group_message', { ...populated.toObject(), group: groupId });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('group_typing_start', ({ groupId }) => {
      socket.to(`group_${groupId}`).emit('group_typing', { userId });
    });

    socket.on('group_typing_stop', ({ groupId }) => {
      socket.to(`group_${groupId}`).emit('group_stop_typing', { userId });
    });

    // ---- DISCONNECT ----
    socket.on('disconnect', async () => {
      const uid = removeOnlineUser(socket.id);
      if (uid) {
        const stillOnline = getSocketsForUser(uid).size > 0;
        if (!stillOnline) {
          await User.updateOne({ _id: uid }, { $set: { isOnline: false, lastSeen: new Date() } });
          socket.broadcast.emit('user_offline', { userId: uid });
        }
      }
    });
  });

  return { isUserOnline, getSocketsForUser };
};

module.exports = setupChatSocket;
