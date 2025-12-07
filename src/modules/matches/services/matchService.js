const mongoose = require('mongoose');
const Match = require('../models/Match');
const Participation = require('../models/Participation');
const MatchNotification = require('../models/MatchNotification');
const StateMachine = require('../utils/stateMachine');

class MatchService {
  async createMatch(userId, data) {
    const match = await Match.create({
      created_by: userId,
      starts_at: data.starts_at,
      venue: data.venue,
      max_players: data.max_players,
      team_size: data.team_size,
      mode: data.mode,
      state: 'draft',
      visibility: data.visibility || 'public',
      current_players: 0
    });

    return match;
  }

  async getMatch(matchId) {
    const match = await Match.findById(matchId)
      .populate('created_by', 'display_name email');
    return match;
  }

  async listMatches(filters = {}) {
    const query = {};
    
    if (filters.state) {
      query.state = filters.state;
    }
    
    if (filters.visibility) {
      query.visibility = filters.visibility;
    }

    const matches = await Match.find(query)
      .populate('created_by', 'display_name email')
      .sort({ created_at: -1 })
      .limit(filters.limit || 50);

    return matches;
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

      // Check if match is joinable
      if (!['open', 'full'].includes(match.state)) {
        throw new Error(`Cannot join match in state: ${match.state}`);
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
        status: { $in: ['confirmed', 'checked_in'] }
      }).session(session);

      let status = 'confirmed';
      
      if (currentCount >= match.max_players) {
        status = 'waitlisted';
      }

      // Create participation
      const participation = await Participation.create([{
        match_id: matchId,
        user_id: userId,
        team_id: teamId,
        status: status
      }], { session });

      // Update current_players count
      if (status === 'confirmed') {
        match.current_players = currentCount + 1;

        // Auto-transition to full if capacity reached
        if (match.current_players >= match.max_players && match.state === 'open') {
          StateMachine.validateTransition(match.state, 'full');
          match.state = 'full';
        }

        await match.save({ session });

        // Notify match full
        if (match.state === 'full') {
          await this.notifyMatchFull(match, session);
        }
      }

      await session.commitTransaction();

      // Send notification asynchronously
      this.notifyPlayerJoined(match, userId).catch(console.error);

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

      // Cannot leave if match is in progress or finished
      if (['in_progress', 'finished'].includes(match.state)) {
        throw new Error('Cannot leave match in current state');
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
      if (participation.status === 'confirmed') {
        match.current_players = Math.max(0, match.current_players - 1);

        // If was full and now has space, move to open
        if (match.state === 'full' && match.current_players < match.max_players) {
          StateMachine.validateTransition(match.state, 'open');
          match.state = 'open';
        }

        await match.save({ session });
      }

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
      .populate('user_id', 'display_name email')
      .populate('team_id', 'name logo_url')
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
