const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  match_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MSMatch',
    required: true
  },
  team_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MSTeam',
    default: null
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MSMatchUser',
    required: true
  },
  body: {
    type: String,
    required: true,
    trim: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Index for performance
chatMessageSchema.index({ match_id: 1, created_at: -1 });
chatMessageSchema.index({ user_id: 1 });

module.exports = mongoose.model('MSChatMessage', chatMessageSchema, 'ms_chat_messages');
