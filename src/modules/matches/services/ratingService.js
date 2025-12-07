const Rating = require('../models/Rating');
const Match = require('../models/Match');
const Participation = require('../models/Participation');

class RatingService {
  async createRating(matchId, raterId, rateeId, score, comment = null) {
    // Validate score
    if (score < 1 || score > 5) {
      throw new Error('Score must be between 1 and 5');
    }

    // Check if match exists and is finished
    const match = await Match.findById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    if (match.state !== 'finished') {
      throw new Error('Ratings can only be given for finished matches');
    }

    // Check if both rater and ratee are confirmed participants
    const raterParticipation = await Participation.findOne({
      match_id: matchId,
      user_id: raterId,
      status: { $in: ['confirmed', 'checked_in'] }
    });

    const rateeParticipation = await Participation.findOne({
      match_id: matchId,
      user_id: rateeId,
      status: { $in: ['confirmed', 'checked_in'] }
    });

    if (!raterParticipation) {
      throw new Error('Rater is not a confirmed participant of this match');
    }

    if (!rateeParticipation) {
      throw new Error('Ratee is not a confirmed participant of this match');
    }

    // Check if rating already exists
    const existingRating = await Rating.findOne({
      match_id: matchId,
      rater_id: raterId,
      ratee_id: rateeId
    });

    if (existingRating) {
      throw new Error('Rating already exists for this participant');
    }

    // Create rating
    const rating = await Rating.create({
      match_id: matchId,
      rater_id: raterId,
      ratee_id: rateeId,
      score,
      comment
    });

    return rating;
  }

  async getMatchRatings(matchId) {
    const ratings = await Rating.find({ match_id: matchId })
      .populate('rater_id', 'display_name email')
      .populate('ratee_id', 'display_name email')
      .sort({ created_at: -1 });

    return ratings;
  }

  async getUserRatings(userId) {
    const ratings = await Rating.find({ ratee_id: userId })
      .populate('rater_id', 'display_name email')
      .populate('match_id', 'venue starts_at')
      .sort({ created_at: -1 });

    // Calculate average rating
    const totalScore = ratings.reduce((sum, r) => sum + r.score, 0);
    const averageRating = ratings.length > 0 ? totalScore / ratings.length : 0;

    return {
      ratings,
      average_rating: averageRating,
      total_ratings: ratings.length
    };
  }
}

module.exports = new RatingService();
