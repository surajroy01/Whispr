/**
 * GroupMessage Model
 * Stores messages sent in group chats
 */
const mongoose = require('mongoose');

const groupMessageSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['text', 'emoji', 'gif'],
      default: 'text'
    },
    gifUrl: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient group message retrieval
groupMessageSchema.index({ group: 1, createdAt: -1 });

module.exports = mongoose.model('GroupMessage', groupMessageSchema);
