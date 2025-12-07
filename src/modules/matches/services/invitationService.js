const mongoose = require('mongoose');
const Invitation = require('../models/Invitation');
const Match = require('../models/Match');
const Participation = require('../models/Participation');
const MatchNotification = require('../models/MatchNotification');
const matchService = require('./matchService');

class InvitationService {
  async createInvitation(matchId, inviterId, inviteeId, teamId = null) {
    // Check if match exists and is joinable
    const match = await Match.findById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    if (!['draft', 'open', 'full'].includes(match.state)) {
      throw new Error('Cannot invite to match in current state');
    }

    // Check if invitee already participated or invited
    const existingParticipation = await Participation.findOne({
      match_id: matchId,
      user_id: inviteeId
    });

    if (existingParticipation) {
      throw new Error('User already participating in this match');
    }

    const existingInvitation = await Invitation.findOne({
      match_id: matchId,
      invitee_id: inviteeId,
      status: 'pending'
    });

    if (existingInvitation) {
      throw new Error('User already has a pending invitation for this match');
    }

    // Create invitation with expiration (7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await Invitation.create({
      match_id: matchId,
      team_id: teamId,
      inviter_id: inviterId,
      invitee_id: inviteeId,
      status: 'pending',
      expires_at: expiresAt
    });

    // Create notification
    await MatchNotification.create({
      user_id: inviteeId,
      type: 'invitation',
      match_id: matchId,
      payload: {
        invitation_id: invitation._id,
        inviter_id: inviterId,
        match_id: matchId
      }
    });

    // Socket.io notification
    if (global.io) {
      global.io.to(`matchUser:${inviteeId}`).emit('invitation', {
        invitation_id: invitation._id,
        match_id: matchId
      });
    }

    return invitation;
  }

  async respondToInvitation(invitationId, inviteeId, action) {
    if (!['accept', 'decline'].includes(action)) {
      throw new Error('Invalid action. Must be "accept" or "decline"');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const invitation = await Invitation.findById(invitationId).session(session);

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      // Verify invitee
      if (invitation.invitee_id.toString() !== inviteeId.toString()) {
        throw new Error('Unauthorized to respond to this invitation');
      }

      // Check if already responded
      if (invitation.status !== 'pending') {
        throw new Error('Invitation already responded to');
      }

      // Check if expired
      if (new Date() > invitation.expires_at) {
        invitation.status = 'expired';
        await invitation.save({ session });
        throw new Error('Invitation has expired');
      }

      if (action === 'accept') {
        // Join the match using matchService with transaction
        const match = await Match.findById(invitation.match_id).session(session);
        
        if (!match) {
          throw new Error('Match not found');
        }

        // Check if match is still joinable
        if (!['open', 'full'].includes(match.state)) {
          throw new Error('Match is no longer joinable');
        }

        // Check if user already joined (race condition check)
        const existingParticipation = await Participation.findOne({
          match_id: invitation.match_id,
          user_id: inviteeId
        }).session(session);

        if (existingParticipation) {
          throw new Error('User already joined this match');
        }

        // Check capacity
        const currentCount = await Participation.countDocuments({
          match_id: invitation.match_id,
          status: { $in: ['confirmed', 'checked_in'] }
        }).session(session);

        let status = 'confirmed';
        
        if (currentCount >= match.max_players) {
          status = 'waitlisted';
        }

        // Create participation
        await Participation.create([{
          match_id: invitation.match_id,
          user_id: inviteeId,
          team_id: invitation.team_id,
          status: status
        }], { session });

        // Update current_players count
        if (status === 'confirmed') {
          match.current_players = currentCount + 1;

          // Auto-transition to full if capacity reached (with validation)
          if (match.current_players >= match.max_players && match.state === 'open') {
            StateMachine.validateTransition(match.state, 'full');
            match.state = 'full';
          }

          await match.save({ session });
        }

        invitation.status = 'accepted';
      } else {
        invitation.status = 'declined';
      }

      await invitation.save({ session });
      await session.commitTransaction();

      return invitation;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getInvitation(invitationId) {
    const invitation = await Invitation.findById(invitationId)
      .populate('match_id')
      .populate('inviter_id', 'display_name email')
      .populate('invitee_id', 'display_name email')
      .populate('team_id', 'name logo_url');

    return invitation;
  }

  async getUserInvitations(userId) {
    const invitations = await Invitation.find({
      invitee_id: userId,
      status: 'pending'
    })
      .populate('match_id')
      .populate('inviter_id', 'display_name email')
      .populate('team_id', 'name logo_url')
      .sort({ created_at: -1 });

    return invitations;
  }
}

module.exports = new InvitationService();
