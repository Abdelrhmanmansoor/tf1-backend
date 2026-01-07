const matchService = require('../services/matchService');
const invitationService = require('../services/invitationService');
const ratingService = require('../services/ratingService');
const locationService = require('../services/locationService');
const { asyncHandler } = require('../utils/errorHandler');
const { validateMatchCreation, validateRating, validateInvitation } = require('../utils/validators');
const { ValidationError, NotFoundError } = require('../utils/errorHandler');
const logger = require('../utils/logger');
const cache = require('../utils/cache');

class MatchController {
  /**
   * Create a new match
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  createMatch = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { title, sport, city, area, location, date, time, level, max_players, cost_per_player, currency, notes, starts_at, venue, team_size, mode, location_id } = req.body;

    try {
      // Check if using new API format (title, sport, etc.) or legacy format (starts_at, venue, etc.)
      const isNewFormat = !!(title && sport && date && time && level);

      // Validate based on format
      validateMatchCreation(req.body, isNewFormat);

      // Validate and resolve location
      let resolvedArea = area;
      let resolvedCity = city;
      let resolvedLocation = location || venue;
      let finalLocationId = location_id;

      if (isNewFormat) {
        // If location_id provided, use it
        if (location_id) {
          const Location = require('../../../models/Location');
          const loc = await Location.findById(location_id);
          
          if (!loc) {
            throw new ValidationError('Location ID not found');
          }

          if (loc.level === 'region') {
            resolvedArea = loc.name_ar || loc.name_en;
            resolvedCity = loc.name_ar || loc.name_en;
            resolvedLocation = loc.slug || loc.name_en || loc.name_ar;
          } else if (loc.level === 'city' || loc.level === 'governorate') {
            resolvedCity = loc.name_ar || loc.name_en;
            if (loc.parent_id) {
              const parent = await Location.findById(loc.parent_id);
              resolvedArea = parent?.name_ar || parent?.name_en || resolvedCity;
            } else {
              resolvedArea = resolvedCity;
            }
            resolvedLocation = loc.slug || loc.name_en || loc.name_ar;
          } else if (loc.level === 'district') {
            resolvedLocation = loc.name_ar || loc.name_en;
            if (loc.parent_id) {
              const cityParent = await Location.findById(loc.parent_id);
              resolvedCity = cityParent?.name_ar || cityParent?.name_en || 'مدينة';
              if (cityParent?.parent_id) {
                const regionParent = await Location.findById(cityParent.parent_id);
                resolvedArea = regionParent?.name_ar || regionParent?.name_en || resolvedCity;
              } else {
                resolvedArea = resolvedCity;
              }
            }
          }
          finalLocationId = location_id;
        } 
        // If city and area provided, validate and get/create location
        else if (city && area) {
          // Validate city exists
          const cityLocation = await locationService.validateCity(city);
          if (!cityLocation) {
            throw new ValidationError(`المدينة "${city}" غير موجودة. يرجى اختيار مدينة صحيحة`);
          }

          // Validate area exists for this city
          if (area) {
            const areaLocation = await locationService.validateArea(city, area);
            if (!areaLocation) {
              throw new ValidationError(`المنطقة "${area}" غير موجودة في مدينة "${city}"`);
            }
            finalLocationId = areaLocation._id;
            resolvedArea = areaLocation.name_ar || areaLocation.name_en;
          }
          
          resolvedCity = cityLocation.name_ar || cityLocation.name_en;
          resolvedLocation = location || area || cityLocation.name_ar;
        }
        // If only city provided
        else if (city) {
          const cityLocation = await locationService.validateCity(city);
          if (!cityLocation) {
            throw new ValidationError(`المدينة "${city}" غير موجودة. يرجى اختيار مدينة صحيحة`);
          }
          
          resolvedCity = cityLocation.name_ar || cityLocation.name_en;
          resolvedArea = resolvedCity;
          resolvedLocation = location || resolvedCity;
          finalLocationId = cityLocation._id;
        }
        // No location info provided
        else {
          throw new ValidationError('يجب تحديد المدينة على الأقل (city أو location_id)');
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
          cost_per_player: cost_per_player || 0,
          currency: currency || 'SAR',
          notes: notes || '',
          venue: venue || '',
          status: 'open',
          current_players: 0,
          location_id: finalLocationId
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

      // Log the action
      logger.info(`Match created: ${match._id} by user ${userId}`);

      res.status(201).json({
        success: true,
        message: 'تم إنشاء المباراة بنجاح',
        messageEn: 'Match created successfully',
        data: { match }
      });
    } catch (error) {
      logger.error('Error creating match:', error);
      throw error;
    }
  });

  /**
   * Publish a match (make it visible to others)
   */
  publishMatch = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { id } = req.params;

    try {
      const match = await matchService.publishMatch(id, userId);
      
      // Invalidate cache
      await cache.invalidateMatchCache(id);

      logger.info(`Match published: ${id}`);

      res.status(200).json({
        success: true,
        message: 'تم نشر المباراة بنجاح',
        messageEn: 'Match published successfully',
        data: { match }
      });
    } catch (error) {
      logger.error('Error publishing match:', error);
      throw error;
    }
  });

  /**
   * List all matches with filters
   */
  listMatches = asyncHandler(async (req, res) => {
    const { state, visibility, limit, page, sport, city, area, level, dateFrom, dateTo, search, status } = req.query;

    try {
      const filters = {};
      if (state) filters.state = state;
      if (status) filters.status = status;
      if (visibility) filters.visibility = visibility;
      if (limit) filters.limit = parseInt(limit) || 20;
      if (page) filters.page = parseInt(page) || 1;
      if (sport) filters.sport = sport;
      if (city) filters.city = city;
      if (area) filters.area = area;
      if (level) filters.level = level;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (search) filters.search = search;

      // Try to get from cache first
      const cacheKey = `matches:${JSON.stringify(filters)}`;
      const cached = await cache.get(cacheKey);
      
      if (cached) {
        return res.status(200).json({
          success: true,
          data: cached,
          fromCache: true
        });
      }

      const result = await matchService.listMatches(filters);

      // Cache for 5 minutes
      await cache.set(cacheKey, {
        matches: result.matches,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          pages: Math.ceil(result.total / result.limit)
        }
      }, 300);

      res.status(200).json({
        success: true,
        data: {
          matches: result.matches,
          pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            pages: Math.ceil(result.total / result.limit)
          }
        }
      });
    } catch (error) {
      logger.error('Error listing matches:', error);
      throw error;
    }
  });

  /**
   * Get a specific match
   */
  getMatch = asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      // Try to get from cache first
      const cached = await cache.get(`match:${id}`);
      if (cached) {
        return res.status(200).json({
          success: true,
          data: cached,
          fromCache: true
        });
      }

      const match = await matchService.getMatch(id);
      
      if (!match) {
        throw new NotFoundError('المباراة غير موجودة');
      }

      // Get participants
      const participants = await matchService.getMatchParticipants(id);

      const responseData = {
        match,
        participants
      };

      // Cache for 10 minutes
      await cache.set(`match:${id}`, responseData, 600);

      res.status(200).json({
        success: true,
        data: responseData
      });
    } catch (error) {
      logger.error(`Error getting match ${id}:`, error);
      throw error;
    }
  });

  /**
   * Join a match
   */
  joinMatch = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { id } = req.params;
    const { team_id } = req.body;

    try {
      const result = await matchService.joinMatch(id, userId, team_id);

      // Invalidate cache
      await cache.invalidateMatchCache(id);

      logger.info(`User ${userId} joined match ${id}`);

      res.status(200).json({
        success: true,
        message: 'تم الانضمام إلى المباراة بنجاح',
        messageEn: 'Successfully joined match',
        data: result
      });
    } catch (error) {
      logger.error('Error joining match:', error);
      throw error;
    }
  });

  /**
   * Leave a match
   */
  leaveMatch = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { id } = req.params;

    try {
      const result = await matchService.leaveMatch(id, userId);

      // Invalidate cache
      await cache.invalidateMatchCache(id);

      logger.info(`User ${userId} left match ${id}`);

      res.status(200).json({
        success: true,
        message: 'تم مغادرة المباراة بنجاح',
        messageEn: 'Successfully left match',
        data: result
      });
    } catch (error) {
      logger.error('Error leaving match:', error);
      throw error;
    }
  });

  /**
   * Invite a player to a match
   */
  inviteToMatch = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { id } = req.params;
    const { invitee_id, team_id } = req.body;

    try {
      validateInvitation(invitee_id);

      const invitation = await invitationService.createInvitation(
        id,
        userId,
        invitee_id,
        team_id
      );

      logger.info(`Invitation sent from ${userId} to ${invitee_id} for match ${id}`);

      res.status(201).json({
        success: true,
        message: 'تم إرسال الدعوة بنجاح',
        messageEn: 'Invitation sent successfully',
        data: { invitation }
      });
    } catch (error) {
      logger.error('Error sending invitation:', error);
      throw error;
    }
  });

  /**
   * Respond to a match invitation
   */
  respondToInvitation = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { id, inv_id } = req.params;
    const { action } = req.body;

    try {
      if (!action || !['accept', 'decline'].includes(action)) {
        throw new ValidationError('يجب أن يكون الإجراء "accept" أو "decline"');
      }

      const invitation = await invitationService.respondToInvitation(
        inv_id,
        userId,
        action
      );

      // Invalidate cache if accepted
      if (action === 'accept') {
        await cache.invalidateMatchCache(id);
      }

      logger.info(`Invitation ${action}ed: ${inv_id} by user ${userId}`);

      res.status(200).json({
        success: true,
        message: `تم ${action === 'accept' ? 'قبول' : 'رفض'} الدعوة بنجاح`,
        messageEn: `Invitation ${action}ed successfully`,
        data: { invitation }
      });
    } catch (error) {
      logger.error('Error responding to invitation:', error);
      throw error;
    }
  });

  /**
   * Start a match
   */
  startMatch = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { id } = req.params;

    try {
      const match = await matchService.startMatch(id, userId);

      // Invalidate cache
      await cache.invalidateMatchCache(id);

      logger.info(`Match started: ${id}`);

      res.status(200).json({
        success: true,
        message: 'تم بدء المباراة بنجاح',
        messageEn: 'Match started successfully',
        data: { match }
      });
    } catch (error) {
      logger.error('Error starting match:', error);
      throw error;
    }
  });

  /**
   * Finish a match
   */
  finishMatch = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { id } = req.params;

    try {
      const match = await matchService.finishMatch(id, userId);

      // Invalidate cache
      await cache.invalidateMatchCache(id);

      logger.info(`Match finished: ${id}`);

      res.status(200).json({
        success: true,
        message: 'تم إنهاء المباراة بنجاح',
        messageEn: 'Match finished successfully',
        data: { match }
      });
    } catch (error) {
      logger.error('Error finishing match:', error);
      throw error;
    }
  });

  /**
   * Cancel a match
   */
  cancelMatch = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { id } = req.params;

    try {
      const match = await matchService.cancelMatch(id, userId);

      // Invalidate cache
      await cache.invalidateMatchCache(id);

      logger.info(`Match canceled: ${id}`);

      res.status(200).json({
        success: true,
        message: 'تم إلغاء المباراة بنجاح',
        messageEn: 'Match canceled successfully',
        data: { match }
      });
    } catch (error) {
      logger.error('Error canceling match:', error);
      throw error;
    }
  });

  /**
   * Rate a player
   */
  ratePlayer = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { id } = req.params;
    const { ratee_id, score, comment } = req.body;

    try {
      if (!ratee_id) {
        throw new ValidationError('يجب تحديد معرف المستخدم المراد تقييمه');
      }

      validateRating(score, comment);

      const rating = await ratingService.createRating(
        id,
        userId,
        ratee_id,
        score,
        comment
      );

      logger.info(`Rating created: ${rating._id} from ${userId} to ${ratee_id}`);

      res.status(201).json({
        success: true,
        message: 'تم تقديم التقييم بنجاح',
        messageEn: 'Rating submitted successfully',
        data: { rating }
      });
    } catch (error) {
      logger.error('Error rating player:', error);
      throw error;
    }
  });

  /**
   * Get matches for current user (created and joined)
   */
  getMyMatches = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;

    try {
      // Try to get from cache first
      const cacheKey = `my-matches:${userId}`;
      const cached = await cache.get(cacheKey);
      
      if (cached) {
        return res.status(200).json({
          success: true,
          data: cached,
          fromCache: true
        });
      }

      const myMatches = await matchService.getMyMatches(userId);

      const responseData = {
        created: myMatches.created,
        joined: myMatches.joined
      };

      // Cache for 5 minutes
      await cache.set(cacheKey, responseData, 300);

      res.status(200).json({
        success: true,
        data: responseData
      });
    } catch (error) {
      logger.error('Error getting user matches:', error);
      throw error;
    }
  });

  /**
   * Search matches
   */
  searchMatches = asyncHandler(async (req, res) => {
    const { query, city, sport, level, dateFrom, dateTo } = req.query;

    try {
      if (!query || query.length < 2) {
        throw new ValidationError('يجب إدخال كلمة البحث (حد أدنى 2 أحرف)');
      }

      const filters = {
        search: query,
        city,
        sport,
        level,
        dateFrom,
        dateTo,
        limit: 20,
        page: 1
      };

      const result = await matchService.listMatches(filters);

      res.status(200).json({
        success: true,
        data: {
          matches: result.matches,
          total: result.total
        }
      });
    } catch (error) {
      logger.error('Error searching matches:', error);
      throw error;
    }
  });

  /**
   * Get match statistics
   */
  getMatchStats = asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      const match = await matchService.getMatch(id);
      
      if (!match) {
        throw new NotFoundError('المباراة غير موجودة');
      }

      const participants = await matchService.getMatchParticipants(id);
      const ratings = await ratingService.getMatchRatings(id);

      res.status(200).json({
        success: true,
        data: {
          match: {
            id: match._id,
            title: match.title,
            sport: match.sport,
            city: match.city,
            date: match.date,
            status: match.status
          },
          statistics: {
            totalParticipants: participants.length,
            totalRatings: ratings.length,
            averageRating: ratings.length > 0 
              ? (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length).toFixed(2)
              : 0,
            participationRate: `${Math.round((participants.length / match.max_players) * 100)}%`
          }
        }
      });
    } catch (error) {
      logger.error('Error getting match stats:', error);
      throw error;
    }
  });
}

module.exports = new MatchController();
