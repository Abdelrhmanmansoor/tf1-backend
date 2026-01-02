const matchService = require('../services/matchService');
const invitationService = require('../services/invitationService');
const ratingService = require('../services/ratingService');

class MatchController {
  async createMatch(req, res) {
    try {
      const userId = req.matchUser._id;
      const { title, sport, city, area, location, date, time, level, max_players, cost_per_player, currency, notes, starts_at, venue, team_size, mode, location_id } = req.body;

      // Check if using new API format (title, sport, etc.) or legacy format (starts_at, venue, etc.)
      const isNewFormat = !!(title && sport && date && time && level);
      const isLegacyFormat = !!(starts_at && venue && team_size && mode);

      if (!isNewFormat && !isLegacyFormat) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields. New format requires: title, sport, city, area, location, date, time, level, max_players. Legacy format requires: starts_at, venue, max_players, team_size, mode'
        });
      }

      if (isNewFormat) {
        const dateObj = new Date(date);
        const today = new Date();
        today.setHours(0,0,0,0);
        if (isNaN(dateObj.getTime()) || dateObj < today) {
          return res.status(400).json({
            success: false,
            message: 'date must be a valid future date'
          });
        }
      }

      // Validate max_players
      if (!max_players || max_players < 2) {
        return res.status(400).json({
          success: false,
          message: 'max_players must be at least 2'
        });
      }

      // Validate level (if using new format)
      if (isNewFormat && !['beginner', 'intermediate', 'advanced'].includes(level)) {
        return res.status(400).json({
          success: false,
          message: 'level must be "beginner", "intermediate", or "advanced"'
        });
      }

      // Validate location_id and derive area/city/location strings
      let resolvedArea = area;
      let resolvedCity = city;
      let resolvedLocation = location;
      if (isNewFormat) {
        const Location = require('../../../models/Location');
        if (!location_id) {
          return res.status(400).json({
            success: false,
            message: 'location_id is required'
          });
        }
        const loc = await Location.findById(location_id);
        if (!loc) {
          return res.status(400).json({
            success: false,
            message: 'Invalid location_id'
          });
        }
        if (loc.level === 'region') {
          resolvedArea = loc.name_ar || loc.name_en || 'منطقة';
          resolvedCity = loc.name_ar || loc.name_en || 'مدينة';
          resolvedLocation = loc.slug || (loc.name_en || loc.name_ar);
        } else if (loc.level === 'city' || loc.level === 'governorate') {
          resolvedCity = loc.name_ar || loc.name_en || 'مدينة';
          if (loc.parent_id) {
            const parent = await Location.findById(loc.parent_id);
            resolvedArea = parent?.name_ar || parent?.name_en || 'منطقة';
          } else {
            resolvedArea = 'منطقة';
          }
          resolvedLocation = loc.slug || (loc.name_en || loc.name_ar);
        } else if (loc.level === 'district') {
          resolvedLocation = loc.name_ar || loc.name_en || 'حي';
          if (loc.parent_id) {
            const cityParent = await Location.findById(loc.parent_id);
            resolvedCity = cityParent?.name_ar || cityParent?.name_en || 'مدينة';
            if (cityParent?.parent_id) {
              const regionParent = await Location.findById(cityParent.parent_id);
              resolvedArea = regionParent?.name_ar || regionParent?.name_en || 'منطقة';
            }
          }
        }
      }

      // Create match data
      let matchData;
      if (isNewFormat) {
        matchData = {
          owner_id: userId,
          title,
          sport,
          city: resolvedCity,
          area: resolvedArea,
          location: resolvedLocation,
          date: new Date(date),
          time,
          level,
          max_players,
          cost_per_player,
          currency,
          notes: notes || '',
          venue: venue || '',
          status: 'open',
          current_players: 0,
          location_id
        };
      } else {
        // Legacy format
        matchData = {
          created_by: userId,
          starts_at,
          venue,
          max_players,
          team_size,
          mode,
          state: 'draft',
          visibility: 'public',
          current_players: 0
        };
      }

      const match = await matchService.createMatch(userId, matchData, isNewFormat);

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
      const { state, visibility, limit = '20', page = '1', sport, city, area, level, dateFrom, dateTo } = req.query;

      const filters = {};
      if (state) filters.state = state;
      if (visibility) filters.visibility = visibility;
      filters.limit = parseInt(limit);
      filters.page = parseInt(page);
      if (sport) filters.sport = sport;
      if (city) filters.city = city;
      if (area) filters.area = area;
      if (level) filters.level = level;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;

      const { matches, total } = await matchService.listMatches(filters);

      res.status(200).json({
        success: true,
        data: { matches, total, page: filters.page, pages: Math.ceil(total / filters.limit) }
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

  async getMyMatches(req, res) {
    try {
      const userId = req.matchUser._id;

      const myMatches = await matchService.getMyMatches(userId);

      res.status(200).json({
        success: true,
        data: {
          created: myMatches.created,
          joined: myMatches.joined
        }
      });
    } catch (error) {
      console.error('Get my matches error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error retrieving your matches'
      });
    }
  }
}

module.exports = new MatchController();
