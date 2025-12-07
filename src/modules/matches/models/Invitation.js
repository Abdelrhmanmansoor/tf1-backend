const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
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
  inviter_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MSMatchUser',
    required: true
  },
  invitee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MSMatchUser',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired'],
    default: 'pending'
  },
  expires_at: {
    type: Date,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// UNIQUE: one invitation per user per match
invitationSchema.index({ match_id: 1, invitee_id: 1 }, { unique: true });
invitationSchema.index({ invitee_id: 1 });
invitationSchema.index({ match_id: 1 });

module.exports = mongoose.model('MSInvitation', invitationSchema, 'ms_invitations');
