const matchService = require('../services/matchService');
const invitationService = require('../services/invitationService');
const ratingService = require('../services/ratingService');
const locationService = require('../services/locationService');
const { asyncHandler } = require('../utils/errorHandler');
const { validateMatchCreation, validateRating, validateInvitation } = require('../utils/validators');
const { ValidationError } = require('../utils/errorHandler');

class MatchController {
  createMatch = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { title, sport, city, area, location, date, time, level, max_players, cost_per_player, currency, notes, starts_at, venue, team_size, mode, location_id } = req.body;

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

    res.status(201).json({
      success: true,
      message: 'Match created successfully',
      data: { match }
    });
  });

  publishMatch = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { id } = req.params;

    const match = await matchService.publishMatch(id, userId);

    res.status(200).json({
      success: true,
      message: 'Match published successfully',
      data: { match }
    });
  });

  listMatches = asyncHandler(async (req, res) => {
    const { state, visibility, limit, page, sport, city, area, level, dateFrom, dateTo, search, status } = req.query;

    const filters = {};
    if (state) filters.state = state;
    if (status) filters.status = status;
    if (visibility) filters.visibility = visibility;
    if (limit) filters.limit = limit;
    if (page) filters.page = page;
    if (sport) filters.sport = sport;
    if (city) filters.city = city;
    if (area) filters.area = area;
    if (level) filters.level = level;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    if (search) filters.search = search;

    const result = await matchService.listMatches(filters);

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
  });

  getMatch = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { NotFoundError } = require('../utils/errorHandler');

    const match = await matchService.getMatch(id);
    
    if (!match) {
      throw new NotFoundError('Match');
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
  });

  joinMatch = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { id } = req.params;
    const { team_id } = req.body;

    const result = await matchService.joinMatch(id, userId, team_id);

    res.status(200).json({
      success: true,
      message: 'Successfully joined match',
      data: result
    });
  });

  leaveMatch = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { id } = req.params;

    const result = await matchService.leaveMatch(id, userId);

    res.status(200).json({
      success: true,
      message: 'Successfully left match',
      data: result
    });
  });

  inviteToMatch = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { id } = req.params;
    const { invitee_id, team_id } = req.body;

    validateInvitation(invitee_id);

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
  });

  respondToInvitation = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { id, inv_id } = req.params;
    const { action } = req.body;
    const { ValidationError } = require('../utils/errorHandler');

    if (!action || !['accept', 'decline'].includes(action)) {
      throw new ValidationError('action must be "accept" or "decline"');
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
  });

  startMatch = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { id } = req.params;

    const match = await matchService.startMatch(id, userId);

    res.status(200).json({
      success: true,
      message: 'Match started successfully',
      data: { match }
    });
  });

  finishMatch = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { id } = req.params;

    const match = await matchService.finishMatch(id, userId);

    res.status(200).json({
      success: true,
      message: 'Match finished successfully',
      data: { match }
    });
  });

  cancelMatch = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { id } = req.params;

    const match = await matchService.cancelMatch(id, userId);

    res.status(200).json({
      success: true,
      message: 'Match canceled successfully',
      data: { match }
    });
  });

  ratePlayer = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;
    const { id } = req.params;
    const { ratee_id, score, comment } = req.body;
    const { ValidationError } = require('../utils/errorHandler');

    if (!ratee_id) {
      throw new ValidationError('ratee_id is required');
    }

    validateRating(score, comment);

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
  });

  getMyMatches = asyncHandler(async (req, res) => {
    const userId = req.matchUser._id;

    const myMatches = await matchService.getMyMatches(userId);

    res.status(200).json({
      success: true,
      data: {
        created: myMatches.created,
        joined: myMatches.joined
      }
    });
  });
}

module.exports = new MatchController();
