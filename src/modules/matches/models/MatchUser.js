const mongoose = require('mongoose');

const matchUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password_hash: {
    type: String,
    required: true
  },
  display_name: {
    type: String,
    required: true,
    trim: true
  },
  is_admin: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Index for performance
matchUserSchema.index({ email: 1 });

module.exports = mongoose.model('MSMatchUser', matchUserSchema, 'ms_match_users');
