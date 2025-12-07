const matchService = require('../services/matchService');
const invitationService = require('../services/invitationService');
const ratingService = require('../services/ratingService');

class MatchController {
  async createMatch(req, res) {
    try {
      const userId = req.matchUser._id;
      const { starts_at, venue, max_players, team_size, mode, visibility } = req.body;

      // Validation
      if (!starts_at || !venue || !max_players || !team_size || !mode) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      if (max_players < 2) {
        return res.status(400).json({
          success: false,
          message: 'max_players must be at least 2'
        });
      }

      if (team_size < 1) {
        return res.status(400).json({
          success: false,
          message: 'team_size must be at least 1'
        });
      }

      if (!['player_pool', 'teams'].includes(mode)) {
        return res.status(400).json({
          success: false,
          message: 'mode must be "player_pool" or "teams"'
        });
      }

      const match = await matchService.createMatch(userId, {
        starts_at,
        venue,
        max_players,
        team_size,
        mode,
        visibility
      });

      res.status(201).json({
        success: true,
        message: 'Match created successfully',
        data: { match }
      });
    } catch (error) {
      console.error('Create match error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error creating match'
      });
    }
  }

  async publishMatch(req, res) {
    try {
      const userId = req.matchUser._id;
      const { id } = req.params;

      const match = await matchService.publishMatch(id, userId);

      res.status(200).json({
        success: true,
        message: 'Match published successfully',
        data: { match }
      });
    } catch (error) {
      console.error('Publish match error:', error);
      const statusCode = error.message.includes('Invalid state transition') ? 409 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error publishing match'
      });
    }
  }

  async listMatches(req, res) {
    try {
      const { state, visibility, limit } = req.query;

      const filters = {};
      if (state) filters.state = state;
      if (visibility) filters.visibility = visibility;
      if (limit) filters.limit = parseInt(limit);

      const matches = await matchService.listMatches(filters);

      res.status(200).json({
        success: true,
        data: { matches }
      });
    } catch (error) {
      console.error('List matches error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error listing matches'
      });
    }
  }

  async getMatch(req, res) {
    try {
      const { id } = req.params;

      const match = await matchService.getMatch(id);
      
      if (!match) {
        return res.status(404).json({
          success: false,
          message: 'Match not found'
        });
      }

      // Get participants
      const participants = await matchService.getMatchParticipants(id);

      res.status(200).json({
        success: true,
        data: {
          match,
          participants
        }
      });
    } catch (error) {
      console.error('Get match error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error retrieving match'
      });
    }
  }

  async joinMatch(req, res) {
    try {
      const userId = req.matchUser._id;
      const { id } = req.params;
      const { team_id } = req.body;

      const result = await matchService.joinMatch(id, userId, team_id);

      res.status(200).json({
        success: true,
        message: 'Successfully joined match',
        data: result
      });
    } catch (error) {
      console.error('Join match error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error joining match'
      });
    }
  }

  async leaveMatch(req, res) {
    try {
      const userId = req.matchUser._id;
      const { id } = req.params;

      const result = await matchService.leaveMatch(id, userId);

      res.status(200).json({
        success: true,
        message: 'Successfully left match',
        data: result
      });
    } catch (error) {
      console.error('Leave match error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error leaving match'
      });
    }
  }

  async inviteToMatch(req, res) {
    try {
      const userId = req.matchUser._id;
      const { id } = req.params;
      const { invitee_id, team_id } = req.body;

      if (!invitee_id) {
        return res.status(400).json({
          success: false,
          message: 'invitee_id is required'
        });
      }

      const invitation = await invitationService.createInvitation(
        id,
        userId,
        invitee_id,
        team_id
      );

      res.status(201).json({
        success: true,
        message: 'Invitation sent successfully',
        data: { invitation }
      });
    } catch (error) {
      console.error('Invite to match error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error sending invitation'
      });
    }
  }

  async respondToInvitation(req, res) {
    try {
      const userId = req.matchUser._id;
      const { id, inv_id } = req.params;
      const { action } = req.body;

      if (!action || !['accept', 'decline'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'action must be "accept" or "decline"'
        });
      }

      const invitation = await invitationService.respondToInvitation(
        inv_id,
        userId,
        action
      );

      res.status(200).json({
        success: true,
        message: `Invitation ${action}ed successfully`,
        data: { invitation }
      });
    } catch (error) {
      console.error('Respond to invitation error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error responding to invitation'
      });
    }
  }

  async startMatch(req, res) {
    try {
      const userId = req.matchUser._id;
      const { id } = req.params;

      const match = await matchService.startMatch(id, userId);

      res.status(200).json({
        success: true,
        message: 'Match started successfully',
        data: { match }
      });
    } catch (error) {
      console.error('Start match error:', error);
      const statusCode = error.message.includes('Invalid state transition') ? 409 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error starting match'
      });
    }
  }

  async finishMatch(req, res) {
    try {
      const userId = req.matchUser._id;
      const { id } = req.params;

      const match = await matchService.finishMatch(id, userId);

      res.status(200).json({
        success: true,
        message: 'Match finished successfully',
        data: { match }
      });
    } catch (error) {
      console.error('Finish match error:', error);
      const statusCode = error.message.includes('Invalid state transition') ? 409 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error finishing match'
      });
    }
  }

  async cancelMatch(req, res) {
    try {
      const userId = req.matchUser._id;
      const { id } = req.params;

      const match = await matchService.cancelMatch(id, userId);

      res.status(200).json({
        success: true,
        message: 'Match canceled successfully',
        data: { match }
      });
    } catch (error) {
      console.error('Cancel match error:', error);
      const statusCode = error.message.includes('Invalid state transition') ? 409 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error canceling match'
      });
    }
  }

  async ratePlayer(req, res) {
    try {
      const userId = req.matchUser._id;
      const { id } = req.params;
      const { ratee_id, score, comment } = req.body;

      if (!ratee_id || !score) {
        return res.status(400).json({
          success: false,
          message: 'ratee_id and score are required'
        });
      }

      const rating = await ratingService.createRating(
        id,
        userId,
        ratee_id,
        score,
        comment
      );

      res.status(201).json({
        success: true,
        message: 'Rating submitted successfully',
        data: { rating }
      });
    } catch (error) {
      console.error('Rate player error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error submitting rating'
      });
    }
  }
}

module.exports = new MatchController();
