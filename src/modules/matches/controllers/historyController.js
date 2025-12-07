const Participation = require('../models/Participation');
const Match = require('../models/Match');
const ratingService = require('../services/ratingService');

class HistoryController {
  async getMyMatchHistory(req, res) {
    try {
      const userId = req.matchUser._id;

      // Get all participations
      const participations = await Participation.find({ user_id: userId })
        .populate({
          path: 'match_id',
          populate: {
            path: 'created_by',
            select: 'display_name email'
          }
        })
        .populate('team_id', 'name logo_url')
        .sort({ joined_at: -1 });

      // Get ratings received
      const ratingsData = await ratingService.getUserRatings(userId);

      // Format response
      const matches = participations.map(p => ({
        match: p.match_id,
        team: p.team_id,
        status: p.status,
        joined_at: p.joined_at
      }));

      res.status(200).json({
        success: true,
        data: {
          matches,
          ratings: {
            average_rating: ratingsData.average_rating,
            total_ratings: ratingsData.total_ratings,
            recent_ratings: ratingsData.ratings.slice(0, 5)
          }
        }
      });
    } catch (error) {
      console.error('Get match history error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error retrieving match history'
      });
    }
  }
}

module.exports = new HistoryController();
