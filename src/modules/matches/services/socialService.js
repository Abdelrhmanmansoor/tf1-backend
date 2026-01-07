const Friendship = require('../models/Friendship');
const MatchUser = require('../models/MatchUser');
const Participation = require('../models/Participation');
const MatchNotification = require('../models/MatchNotification');
const gamificationService = require('./gamificationService');

/**
 * Social Features Service
 * Friends, Following, Activity Feed
 */

class SocialService {
  /**
   * Send friend request
   */
  async sendFriendRequest(userId, friendId) {
    if (userId.toString() === friendId.toString()) {
      throw new Error('Cannot add yourself as friend');
    }

    // Check if friendship already exists
    const existing = await Friendship.findOne({
      $or: [
        { user_id: userId, friend_id: friendId },
        { user_id: friendId, friend_id: userId }
      ]
    });

    if (existing) {
      if (existing.status === 'accepted') {
        throw new Error('Already friends');
      }
      if (existing.status === 'pending') {
        throw new Error('Friend request already sent');
      }
      if (existing.status === 'blocked') {
        throw new Error('Cannot send friend request');
      }
    }

    // Create friendship request
    const friendship = await Friendship.create({
      user_id: userId,
      friend_id: friendId,
      status: 'pending'
    });

    // Notify friend
    await this.notifyFriendRequest(friendId, userId);

    // Award points
    await gamificationService.awardPoints(userId, 'INVITE_FRIEND');

    return friendship;
  }

  /**
   * Accept friend request
   */
  async acceptFriendRequest(userId, friendshipId) {
    const friendship = await Friendship.findById(friendshipId);
    
    if (!friendship) {
      throw new Error('Friend request not found');
    }

    if (friendship.friend_id.toString() !== userId.toString()) {
      throw new Error('Not authorized to accept this request');
    }

    if (friendship.status !== 'pending') {
      throw new Error('Friend request is not pending');
    }

    friendship.status = 'accepted';
    friendship.accepted_at = new Date();
    await friendship.save();

    // Update stats for both users
    await this.updateFriendCount(friendship.user_id, 1);
    await this.updateFriendCount(friendship.friend_id, 1);

    // Notify requester
    await this.notifyFriendRequestAccepted(friendship.user_id, userId);

    return friendship;
  }

  /**
   * Get friends list
   */
  async getFriends(userId) {
    const friendships = await Friendship.find({
      $or: [
        { user_id: userId, status: 'accepted' },
        { friend_id: userId, status: 'accepted' }
      ]
    })
      .populate('user_id', 'name email')
      .populate('friend_id', 'name email')
      .lean();

    // Extract friend info
    const friends = friendships.map(f => {
      const friend = f.user_id._id.toString() === userId.toString() ? f.friend_id : f.user_id;
      return {
        ...friend,
        friendship_id: f._id,
        friends_since: f.accepted_at,
        common_matches: f.common_matches
      };
    });

    return friends;
  }

  /**
   * Get pending friend requests
   */
  async getPendingRequests(userId) {
    const requests = await Friendship.find({
      friend_id: userId,
      status: 'pending'
    })
      .populate('user_id', 'name email')
      .sort({ requested_at: -1 })
      .lean();

    return requests.map(r => ({
      request_id: r._id,
      from: r.user_id,
      requested_at: r.requested_at
    }));
  }

  /**
   * Find friends in a match
   */
  async getFriendsInMatch(userId, matchId) {
    // Get user's friends
    const friends = await this.getFriends(userId);
    const friendIds = friends.map(f => f._id);

    // Get participants in the match
    const participants = await Participation.find({
      match_id: matchId,
      user_id: { $in: friendIds }
    })
      .populate('user_id', 'name email')
      .lean();

    return participants.map(p => p.user_id);
  }

  /**
   * Get activity feed (friends' activities)
   */
  async getActivityFeed(userId, limit = 50) {
    const friends = await this.getFriends(userId);
    const friendIds = friends.map(f => f._id);

    // Get recent participations by friends
    const activities = await Participation.find({
      user_id: { $in: friendIds }
    })
      .populate('user_id', 'name email')
      .populate('match_id')
      .sort({ joined_at: -1 })
      .limit(limit)
      .lean();

    return activities.map(activity => ({
      type: 'friend_joined_match',
      user: activity.user_id,
      match: activity.match_id,
      timestamp: activity.joined_at
    }));
  }

  /**
   * Suggest friends (users from common matches)
   */
  async suggestFriends(userId, limit = 10) {
    // Get matches user participated in
    const userMatches = await Participation.find({ user_id: userId })
      .select('match_id')
      .lean();

    const matchIds = userMatches.map(p => p.match_id);

    // Get other participants from same matches
    const commonParticipants = await Participation.find({
      match_id: { $in: matchIds },
      user_id: { $ne: userId }
    })
      .populate('user_id', 'name email')
      .lean();

    // Count common matches per user
    const userMatchCount = {};
    commonParticipants.forEach(p => {
      const uid = p.user_id._id.toString();
      userMatchCount[uid] = (userMatchCount[uid] || 0) + 1;
    });

    // Get current friends to exclude
    const friends = await this.getFriends(userId);
    const friendIds = friends.map(f => f._id.toString());

    // Sort by common matches and filter
    const suggestions = Object.entries(userMatchCount)
      .filter(([uid]) => !friendIds.includes(uid))
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(async ([uid, count]) => {
        const user = await MatchUser.findById(uid).select('name email').lean();
        return {
          user,
          common_matches: count,
          reason: `لعبتم معاً ${count} مرة`
        };
      });

    return await Promise.all(suggestions);
  }

  /**
   * Update friend count in stats
   */
  async updateFriendCount(userId, increment) {
    const UserStats = require('../models/UserStats');
    await UserStats.findOneAndUpdate(
      { user_id: userId },
      { $inc: { friends_count: increment } },
      { upsert: true }
    );
  }

  /**
   * Notify friend request
   */
  async notifyFriendRequest(recipientId, senderId) {
    await MatchNotification.create({
      user_id: recipientId,
      type: 'friend_request',
      payload: {
        from_user_id: senderId,
        timestamp: new Date()
      }
    });

    if (global.io) {
      global.io.to(`user:${recipientId}`).emit('friend_request', {
        from_user_id: senderId
      });
    }
  }

  /**
   * Notify friend request accepted
   */
  async notifyFriendRequestAccepted(recipientId, accepterId) {
    await MatchNotification.create({
      user_id: recipientId,
      type: 'friend_request_accepted',
      payload: {
        accepter_id: accepterId,
        timestamp: new Date()
      }
    });

    if (global.io) {
      global.io.to(`user:${recipientId}`).emit('friend_request_accepted', {
        accepter_id: accepterId
      });
    }
  }
}

module.exports = new SocialService();

