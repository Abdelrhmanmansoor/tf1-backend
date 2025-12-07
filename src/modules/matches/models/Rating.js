const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  match_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MSMatch',
    required: true
  },
  rater_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MSMatchUser',
    required: true
  },
  ratee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MSMatchUser',
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// UNIQUE: one rating per pair per match
ratingSchema.index({ match_id: 1, rater_id: 1, ratee_id: 1 }, { unique: true });
ratingSchema.index({ match_id: 1 });
ratingSchema.index({ ratee_id: 1 });

module.exports = mongoose.model('MSRating', ratingSchema, 'ms_ratings');
