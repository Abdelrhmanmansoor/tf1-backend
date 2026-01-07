const swipeService = require('../services/swipeService');
const { asyncHandler } = require('../utils/errorHandler');

class SwipeController {
  /**
   * Get matches for swiping
   */
  getSwipeMatches = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { limit = 10 } = req.query;

    const matches = await swipeService.getSwipeMatches(userId, parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        matches,
        count: matches.length
      }
    });
  });

  /**
   * Handle swipe action
   */
  swipe = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { matchId } = req.params;
    const { direction } = req.body; // 'left', 'right', or 'up'

    const result = await swipeService.handleSwipe(userId, matchId, direction);

    res.status(200).json({
      success: true,
      message: result.action === 'interested' ? 'تم الإعجاب بالمباراة!' : 
               result.action === 'super_like' ? 'Super Like! 🌟' : 'تم التمرير',
      data: result
    });
  });

  /**
   * Get interested users for user's match
   */
  getInterestedUsers = asyncHandler(async (req, res) => {
    const { matchId } = req.params;
    const userId = req.matchUser._id;

    // Verify user owns the match
    const Match = require('../models/Match');
    const match = await Match.findById(matchId);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    if (match.owner_id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only see interested users for your own matches'
      });
    }

    const interested = await swipeService.getInterestedUsers(matchId);

    res.status(200).json({
      success: true,
      data: {
        interested,
        count: interested.length
      }
    });
  });

  /**
   * Undo last swipe
   */
  undoSwipe = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    
    const SwipeAction = require('../models/SwipeAction');
    const lastSwipe = await SwipeAction.findOne({ user_id: userId })
      .sort({ timestamp: -1 });

    if (!lastSwipe) {
      return res.status(404).json({
        success: false,
        message: 'No swipe to undo'
      });
    }

    // Check if swipe is recent (within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (lastSwipe.timestamp < fiveMinutesAgo) {
      return res.status(400).json({
        success: false,
        message: 'Cannot undo swipes older than 5 minutes'
      });
    }

    // Delete the swipe
    await SwipeAction.deleteOne({ _id: lastSwipe._id });

    // If it was a right swipe, remove from interested
    if (lastSwipe.direction === 'right' || lastSwipe.direction === 'up') {
      const InterestedUser = require('../models/InterestedUser');
      await InterestedUser.deleteOne({
        user_id: userId,
        match_id: lastSwipe.match_id
      });
    }

    res.status(200).json({
      success: true,
      message: 'Swipe undone successfully',
      data: {
        undone_match_id: lastSwipe.match_id
      }
    });
  });
}

module.exports = new SwipeController();

