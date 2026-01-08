const Match = require('../models/Match');
const cache = require('../utils/cache');

/**
 * Advanced Search Service
 * Powerful search with multiple filters and sorting options
 */

class AdvancedSearchService {
  /**
   * Advanced search with multiple filters
   */
  async advancedSearch(filters = {}, userId = null) {
    try {
      const query = this.buildAdvancedQuery(filters, userId);
      const sort = this.buildSortOptions(filters.sortBy, filters.sortOrder);
      
      const limit = Math.min(Math.max(parseInt(filters.limit) || 20, 1), 100);
      const page = Math.max(parseInt(filters.page) || 1, 1);
      const skip = (page - 1) * limit;

      const [matches, total] = await Promise.all([
        Match.find(query)
          .populate('owner_id', 'name email')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Match.countDocuments(query)
      ]);

      // Enrich matches with additional data
      const enrichedMatches = await this.enrichMatches(matches, userId);

      return {
        matches: enrichedMatches,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        },
        filters: this.getAppliedFilters(filters)
      };
    } catch (error) {
      console.error('Advanced search error:', error);
      throw error;
    }
  }

  /**
   * Build advanced query from filters
   */
  buildAdvancedQuery(filters, userId) {
    const query = {};

    // Status filter
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query.status = { $in: filters.status };
      } else {
        query.status = filters.status;
      }
    } else {
      query.status = { $in: ['open', 'full'] }; // Default: exclude finished/cancelled
    }

    // Sport filter (can be array)
    if (filters.sport) {
      if (Array.isArray(filters.sport)) {
        query.sport = { $in: filters.sport };
      } else {
        query.sport = { $regex: new RegExp(filters.sport, 'i') };
      }
    }

    // City filter (can be array)
    if (filters.city) {
      if (Array.isArray(filters.city)) {
        query.city = { $in: filters.city };
      } else {
        query.city = { $regex: new RegExp(filters.city, 'i') };
      }
    }

    // Area filter
    if (filters.area) {
      query.area = { $regex: new RegExp(filters.area, 'i') };
    }

    // Level filter (can be array)
    if (filters.level) {
      if (Array.isArray(filters.level)) {
        query.level = { $in: filters.level };
      } else {
        query.level = filters.level;
      }
    }

    // Date range
    if (filters.dateFrom || filters.dateTo) {
      query.date = {};
      if (filters.dateFrom) {
        query.date.$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        query.date.$lte = new Date(filters.dateTo);
      }
    } else {
      // Default: future matches only
      query.date = { $gte: new Date() };
    }

    // Time range
    if (filters.timeFrom || filters.timeTo) {
      query.time = {};
      if (filters.timeFrom) {
        query.time.$gte = filters.timeFrom;
      }
      if (filters.timeTo) {
        query.time.$lte = filters.timeTo;
      }
    }

    // Players range
    if (filters.minPlayers) {
      query.max_players = { $gte: parseInt(filters.minPlayers) };
    }
    if (filters.maxPlayers) {
      query.max_players = query.max_players || {};
      query.max_players.$lte = parseInt(filters.maxPlayers);
    }

    // Availability filter
    if (filters.availableSpots) {
      query.$expr = {
        $gte: [
          { $subtract: ['$max_players', '$current_players'] },
          parseInt(filters.availableSpots)
        ]
      };
    }

    // Has space filter
    if (filters.hasSpace === 'true' || filters.hasSpace === true) {
      query.$expr = {
        $lt: ['$current_players', '$max_players']
      };
    }

    // Cost range
    if (filters.minCost !== undefined) {
      query.cost_per_player = { $gte: parseFloat(filters.minCost) };
    }
    if (filters.maxCost !== undefined) {
      query.cost_per_player = query.cost_per_player || {};
      query.cost_per_player.$lte = parseFloat(filters.maxCost);
    }

    // Free only
    if (filters.freeOnly === 'true' || filters.freeOnly === true) {
      query.$or = [
        { cost_per_player: 0 },
        { cost_per_player: { $exists: false } }
      ];
    }

    // Text search in title/notes
    if (filters.search) {
      query.$or = [
        { title: { $regex: new RegExp(filters.search, 'i') } },
        { notes: { $regex: new RegExp(filters.search, 'i') } }
      ];
    }

    // Location ID
    if (filters.locationId) {
      query.location_id = filters.locationId;
    }

    // Owner filter
    if (filters.ownerId) {
      query.owner_id = filters.ownerId;
    }

    // Nearby (within X days)
    if (filters.withinDays) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + parseInt(filters.withinDays));
      query.date = query.date || {};
      query.date.$lte = futureDate;
      if (!query.date.$gte) {
        query.date.$gte = new Date();
      }
    }

    return query;
  }

  /**
   * Build sort options
   */
  buildSortOptions(sortBy = 'date', sortOrder = 'asc') {
    const sortOptions = {};
    
    const validSortFields = {
      date: 'date',
      created: 'created_at',
      players: 'current_players',
      spots: { $subtract: ['$max_players', '$current_players'] },
      cost: 'cost_per_player',
      relevance: 'relevance_score'
    };

    const field = validSortFields[sortBy] || 'date';
    const order = sortOrder === 'desc' ? -1 : 1;

    if (typeof field === 'string') {
      sortOptions[field] = order;
    }

    // Secondary sort
    if (sortBy !== 'date') {
      sortOptions.date = 1; // Always sort by date as secondary
    }

    return sortOptions;
  }

  /**
   * Enrich matches with additional data
   */
  async enrichMatches(matches, userId) {
    if (!userId) return matches;

    // Get user's participations
    const Participation = require('../models/Participation');
    const userParticipations = await Participation.find({ user_id: userId })
      .select('match_id')
      .lean();
    
    const joinedMatchIds = new Set(userParticipations.map(p => p.match_id.toString()));

    // Get user's swipes
    const SwipeAction = require('../models/SwipeAction');
    const userSwipes = await SwipeAction.find({ user_id: userId })
      .lean();
    
    const swipeMap = {};
    userSwipes.forEach(s => {
      swipeMap[s.match_id.toString()] = s.direction;
    });

    // Enrich each match
    return matches.map(match => ({
      ...match,
      user_joined: joinedMatchIds.has(match._id.toString()),
      user_swiped: swipeMap[match._id.toString()] || null,
      spots_left: match.max_players - match.current_players,
      fill_percentage: Math.round((match.current_players / match.max_players) * 100),
      days_until: Math.ceil((new Date(match.date) - new Date()) / (1000 * 60 * 60 * 24))
    }));
  }

  /**
   * Get applied filters summary
   */
  getAppliedFilters(filters) {
    const applied = [];

    if (filters.sport) applied.push({ type: 'sport', value: filters.sport });
    if (filters.city) applied.push({ type: 'city', value: filters.city });
    if (filters.level) applied.push({ type: 'level', value: filters.level });
    if (filters.freeOnly) applied.push({ type: 'cost', value: 'free' });
    if (filters.withinDays) applied.push({ type: 'date', value: `${filters.withinDays} days` });

    return applied;
  }

  /**
   * Get saved searches for user
   */
  async getSavedSearches(userId) {
    const SavedSearch = require('../models/SavedSearch');
    return await SavedSearch.find({ user_id: userId })
      .sort({ created_at: -1 })
      .lean();
  }

  /**
   * Save search
   */
  async saveSearch(userId, name, filters) {
    const SavedSearch = require('../models/SavedSearch');
    
    const search = await SavedSearch.create({
      user_id: userId,
      name,
      filters
    });

    return search;
  }

  /**
   * Get facets (aggregated filter options)
   */
  async getFacets(baseQuery = {}) {
    const cacheKey = `facets:${JSON.stringify(baseQuery)}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const facets = await Match.aggregate([
      { $match: baseQuery },
      {
        $facet: {
          sports: [
            { $group: { _id: '$sport', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          cities: [
            { $group: { _id: '$city', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          levels: [
            { $group: { _id: '$level', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          costRanges: [
            {
              $bucket: {
                groupBy: '$cost_per_player',
                boundaries: [0, 50, 100, 200, 500, 1000],
                default: 'high',
                output: { count: { $sum: 1 } }
              }
            }
          ]
        }
      }
    ]);

    const result = facets[0];
    await cache.set(cacheKey, result, 600); // 10 minutes
    return result;
  }
}

module.exports = new AdvancedSearchService();


