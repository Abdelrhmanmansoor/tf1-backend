const mongoose = require('mongoose');

const userStatsSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MSMatchUser',
    required: true,
    unique: true,
    index: true
  },
  // Match statistics
  matches_created: { type: Number, default: 0 },
  matches_joined: { type: Number, default: 0 },
  matches_completed: { type: Number, default: 0 },
  matches_cancelled: { type: Number, default: 0 },
  
  // Performance metrics
  attendance_rate: { type: Number, default: 100 }, // percentage
  reliability_score: { type: Number, default: 100 }, // 0-100
  average_rating: { type: Number, default: 0 }, // 0-5
  total_ratings: { type: Number, default: 0 },
  
  // Activity metrics
  total_swipes: { type: Number, default: 0 },
  swipes_right: { type: Number, default: 0 },
  swipes_left: { type: Number, default: 0 },
  super_likes_given: { type: Number, default: 0 },
  super_likes_received: { type: Number, default: 0 },
  
  // Social metrics
  friends_count: { type: Number, default: 0 },
  invitations_sent: { type: Number, default: 0 },
  invitations_received: { type: Number, default: 0 },
  
  // Gamification
  total_points: { type: Number, default: 0 },
  current_level: { type: Number, default: 1 },
  badges: [{
    badge_id: String,
    name: String,
    earned_at: Date
  }],
  achievements: [{
    achievement_id: String,
    name: String,
    unlocked_at: Date
  }],
  
  // Streaks
  current_streak: { type: Number, default: 0 }, // consecutive weeks with activity
  longest_streak: { type: Number, default: 0 },
  last_activity: { type: Date, default: Date.now },
  
  // Preferences (learned from behavior)
  favorite_sports: [String],
  favorite_cities: [String],
  preferred_level: String,
  preferred_time_slots: [String], // e.g., 'morning', 'afternoon', 'evening'
  
  // Premium status
  is_premium: { type: Boolean, default: false },
  premium_since: Date,
  premium_expires: Date
  
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes for leaderboards
userStatsSchema.index({ total_points: -1 });
userStatsSchema.index({ reliability_score: -1 });
userStatsSchema.index({ matches_completed: -1 });
userStatsSchema.index({ current_streak: -1 });

module.exports = mongoose.model('MSUserStats', userStatsSchema, 'ms_user_stats');


