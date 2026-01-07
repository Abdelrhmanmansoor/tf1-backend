const socialService = require('../services/socialService');
const recommendationService = require('../services/recommendationService');
const { asyncHandler } = require('../utils/errorHandler');

class SocialController {
  /**
   * Send friend request
   */
  sendFriendRequest = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { friendId } = req.body;

    const friendship = await socialService.sendFriendRequest(userId, friendId);

    res.status(201).json({
      success: true,
      message: 'Friend request sent',
      data: friendship
    });
  });

  /**
   * Accept friend request
   */
  acceptFriendRequest = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { friendshipId } = req.params;

    const friendship = await socialService.acceptFriendRequest(userId, friendshipId);

    res.status(200).json({
      success: true,
      message: 'Friend request accepted',
      data: friendship
    });
  });

  /**
   * Get friends list
   */
  getFriends = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const friends = await socialService.getFriends(userId);

    res.status(200).json({
      success: true,
      data: {
        friends,
        count: friends.length
      }
    });
  });

  /**
   * Get pending requests
   */
  getPendingRequests = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const requests = await socialService.getPendingRequests(userId);

    res.status(200).json({
      success: true,
      data: {
        requests,
        count: requests.length
      }
    });
  });

  /**
   * Get friend suggestions
   */
  getFriendSuggestions = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { limit = 10 } = req.query;

    const suggestions = await socialService.suggestFriends(userId, parseInt(limit));

    res.status(200).json({
      success: true,
      data: suggestions
    });
  });

  /**
   * Get friends in match
   */
  getFriendsInMatch = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { matchId } = req.params;

    const friends = await socialService.getFriendsInMatch(userId, matchId);

    res.status(200).json({
      success: true,
      data: {
        friends,
        count: friends.length
      }
    });
  });

  /**
   * Get activity feed
   */
  getActivityFeed = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { limit = 50 } = req.query;

    const activities = await socialService.getActivityFeed(userId, parseInt(limit));

    res.status(200).json({
      success: true,
      data: activities
    });
  });

  /**
   * Get recommendations
   */
  getRecommendations = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { limit = 20 } = req.query;

    const recommendations = await recommendationService.getRecommendations(userId, parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        recommendations,
        count: recommendations.length
      }
    });
  });
}

module.exports = new SocialController();

