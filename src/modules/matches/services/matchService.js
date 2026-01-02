const mongoose = require('mongoose');
const Match = require('../models/Match');
const Participation = require('../models/Participation');
const MatchNotification = require('../models/MatchNotification');
const StateMachine = require('../utils/stateMachine');

class MatchService {
  async createMatch(userId, data, isNewFormat = false) {
    let matchData;

    if (isNewFormat) {
      // New format with all required fields
      matchData = {
        owner_id: userId,
        created_by: userId, // For backward compatibility
        title: data.title,
        sport: data.sport,
        city: data.city,
        area: data.area,
        location: data.location,
        location_id: data.location_id, // Ensure location_id is passed
        date: data.date,
        time: data.time,
        level: data.level,
        max_players: data.max_players,
        cost_per_player: data.cost_per_player,
        currency: data.currency,
        notes: data.notes || '',
        venue: data.venue || '', // Include venue if provided
        status: data.status || 'open',
        current_players: 0
      };
    } else {
      // Legacy format
      matchData = {
        created_by: userId,
        starts_at: data.starts_at,
        venue: data.venue,
        max_players: data.max_players,
        team_size: data.team_size,
        mode: data.mode,
        state: data.state || 'draft',
        visibility: data.visibility || 'public',
        current_players: 0
      };
    }

    const match = await Match.create(matchData);
    return match;
  }

  async getMatch(matchId) {
    const match = await Match.findById(matchId)
      .populate('created_by', 'name email')
      .populate('owner_id', 'name email');
    return match;
  }

  async listMatches(filters = {}) {
    const query = {};
    
    // Support both old 'state' and new 'status' fields
    if (filters.state) {
      query.state = filters.state;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.visibility) {
      query.visibility = filters.visibility;
    }

    // New filter fields
    if (filters.sport) {
      query.sport = filters.sport;
    }
    if (filters.city) {
      query.city = filters.city;
    }
    if (filters.area) {
      query.area = filters.area;
    }
    if (filters.level) {
      query.level = filters.level;
    }

    // Date range filtering
    if (filters.dateFrom || filters.dateTo) {
      query.date = {};
      if (filters.dateFrom) {
        query.date.$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        query.date.$lte = new Date(filters.dateTo);
      }
    }

    const skip = Math.max(((filters.page || 1) - 1) * (filters.limit || 50), 0);
    const [matches, total] = await Promise.all([
      Match.find(query)
      .populate('created_by', 'name email')
      .populate('owner_id', 'name email')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(filters.limit || 50),
      Match.countDocuments(query)
    ]);

    return { matches, total };
  }

  async getMyMatches(userId) {
    // Get matches created by user
    const createdMatches = await Match.find({
      $or: [
        { created_by: userId },
        { owner_id: userId }
      ]
    })
      .populate('created_by', 'name email')
      .populate('owner_id', 'name email')
      .sort({ created_at: -1 });

    // Get matches joined by user
    const participations = await Participation.find({ user_id: userId })
      .populate({
        path: 'match_id',
        populate: [
          { path: 'created_by', select: 'name email' },
          { path: 'owner_id', select: 'name email' }
        ]
      })
      .sort({ joined_at: -1 });

    const joinedMatches = participations
      .map(p => p.match_id)
      .filter(match => match !== null);

    return {
      created: createdMatches,
      joined: joinedMatches
    };
  }

  async publishMatch(matchId, userId) {
    const match = await Match.findById(matchId);
    
    if (!match) {
      throw new Error('Match not found');
    }

    // Only creator can publish
    if (match.created_by.toString() !== userId.toString()) {
      throw new Error('Only the match creator can publish');
    }

    // Validate state transition
    StateMachine.validateTransition(match.state, 'open');

    match.state = 'open';
    await match.save();

    return match;
  }

  async transitionState(matchId, newState, userId) {
    const match = await Match.findById(matchId);
    
    if (!match) {
      throw new Error('Match not found');
    }

    // Validate state transition
    StateMachine.validateTransition(match.state, newState);

    match.state = newState;
    await match.save();

    return match;
  }

  async joinMatch(matchId, userId, teamId = null) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Lock the match document for update
      const match = await Match.findById(matchId).session(session);
      
      if (!match) {
        throw new Error('Match not found');
      }

      // Check if match is joinable (support both old 'state' and new 'status')
      const matchStatus = match.status || match.state;
      if (matchStatus === 'finished' || matchStatus === 'canceled') {
        throw new Error(`Cannot join match with status: ${matchStatus}`);
      }

      // Check if user already joined
      const existingParticipation = await Participation.findOne({
        match_id: matchId,
        user_id: userId
      }).session(session);

      if (existingParticipation) {
        throw new Error('User already joined this match');
      }

      // Check capacity
      const currentCount = await Participation.countDocuments({
        match_id: matchId,
        status: 'joined'
      }).session(session);

      if (currentCount >= match.max_players) {
        throw new Error('Match is full');
      }

      // Create participation
      const participation = await Participation.create([{
        match_id: matchId,
        user_id: userId,
        status: 'joined'
      }], { session });

      // Update current_players count
      match.current_players = currentCount + 1;

      // Auto-transition to full if capacity reached
      if (match.current_players >= match.max_players) {
        if (match.status) {
          match.status = 'full';
        }
        if (match.state) {
          match.state = 'full';
        }
      }

      await match.save({ session });

      // Notify match full
      if (match.current_players >= match.max_players) {
        await this.notifyMatchFull(match, session).catch(err => {
          console.error(`Failed to notify match full for match ${match._id}:`, err);
        });
      }

      await session.commitTransaction();

      // Send notification asynchronously
      this.notifyPlayerJoined(match, userId).catch(err => {
        console.error(`Failed to notify player joined for match ${match._id}, user ${userId}:`, err);
      });

      return { participation: participation[0], match };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async leaveMatch(matchId, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const match = await Match.findById(matchId).session(session);
      
      if (!match) {
        throw new Error('Match not found');
      }

      // Cannot leave if match is finished
      const matchStatus = match.status || match.state;
      if (matchStatus === 'finished') {
        throw new Error('Cannot leave finished match');
      }

      const participation = await Participation.findOne({
        match_id: matchId,
        user_id: userId
      }).session(session);

      if (!participation) {
        throw new Error('User is not participating in this match');
      }

      // Remove participation
      await Participation.deleteOne({ _id: participation._id }).session(session);

      // Update capacity
      match.current_players = Math.max(0, match.current_players - 1);

      // If was full and now has space, move to open
      if ((match.status === 'full' || match.state === 'full') && match.current_players < match.max_players) {
        if (match.status) {
          match.status = 'open';
        }
        if (match.state) {
          match.state = 'open';
        }
      }

      await match.save({ session });

      await session.commitTransaction();

      return { match };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async startMatch(matchId, userId) {
    const match = await Match.findById(matchId);
    
    if (!match) {
      throw new Error('Match not found');
    }

    // Only creator can start
    if (match.created_by.toString() !== userId.toString()) {
      throw new Error('Only the match creator can start the match');
    }

    // Validate state transition
    StateMachine.validateTransition(match.state, 'in_progress');

    match.state = 'in_progress';
    await match.save();

    // Notify players
    await this.notifyMatchStarted(match);

    return match;
  }

  async finishMatch(matchId, userId) {
    const match = await Match.findById(matchId);
    
    if (!match) {
      throw new Error('Match not found');
    }

    // Only creator can finish
    if (match.created_by.toString() !== userId.toString()) {
      throw new Error('Only the match creator can finish the match');
    }

    // Validate state transition
    StateMachine.validateTransition(match.state, 'finished');

    match.state = 'finished';
    await match.save();

    return match;
  }

  async cancelMatch(matchId, userId) {
    const match = await Match.findById(matchId);
    
    if (!match) {
      throw new Error('Match not found');
    }

    // Only creator can cancel
    if (match.created_by.toString() !== userId.toString()) {
      throw new Error('Only the match creator can cancel the match');
    }

    // Validate state transition
    StateMachine.validateTransition(match.state, 'canceled');

    match.state = 'canceled';
    await match.save();

    return match;
  }

  async getMatchParticipants(matchId) {
    const participants = await Participation.find({ match_id: matchId })
      .populate('user_id', 'name email')
      .sort({ joined_at: 1 });

    return participants;
  }

  // Notification helpers
  async notifyPlayerJoined(match, userId) {
    const participants = await Participation.find({ 
      match_id: match._id,
      user_id: { $ne: userId }
    });

    const notifications = participants.map(p => ({
      user_id: p.user_id,
      type: 'player_joined',
      match_id: match._id,
      payload: { match_id: match._id, user_id: userId }
    }));

    if (notifications.length > 0) {
      await MatchNotification.insertMany(notifications);
    }

    // Socket.io notification
    if (global.io) {
      global.io.to(`matches:${match._id}`).emit('player_joined', {
        match_id: match._id,
        user_id: userId
      });
    }
  }

  async notifyMatchFull(match, session) {
    const participants = await Participation.find({ 
      match_id: match._id
    }).session(session);

    const notifications = participants.map(p => ({
      user_id: p.user_id,
      type: 'match_full',
      match_id: match._id,
      payload: { match_id: match._id }
    }));

    if (notifications.length > 0) {
      await MatchNotification.insertMany(notifications, { session });
    }

    // Socket.io notification
    if (global.io) {
      global.io.to(`matches:${match._id}`).emit('match_full', {
        match_id: match._id
      });
    }
  }

  async notifyMatchStarted(match) {
    const participants = await Participation.find({ 
      match_id: match._id
    });

    const notifications = participants.map(p => ({
      user_id: p.user_id,
      type: 'match_started',
      match_id: match._id,
      payload: { match_id: match._id }
    }));

    if (notifications.length > 0) {
      await MatchNotification.insertMany(notifications);
    }

    // Socket.io notification
    if (global.io) {
      global.io.to(`matches:${match._id}`).emit('match_started', {
        match_id: match._id
      });
    }
  }
}

module.exports = new MatchService();
