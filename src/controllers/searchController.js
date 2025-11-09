const User = require('../modules/shared/models/User');
const PlayerProfile = require('../modules/player/models/PlayerProfile');
const CoachProfile = require('../modules/coach/models/CoachProfile');
const SpecialistProfile = require('../modules/specialist/models/SpecialistProfile');
const ClubProfile = require('../modules/club/models/ClubProfile');
const Job = require('../modules/club/models/Job');
const SearchHistory = require('../models/SearchHistory');
const SavedSearch = require('../models/SavedSearch');
const { sanitizeSearchQuery } = require('../utils/sanitize');

// Helper function to save search history
const saveSearchHistory = async (userId, searchQuery, searchType, filters, resultsCount) => {
  try {
    if (userId && searchQuery) {
      await SearchHistory.create({
        userId,
        searchQuery,
        searchType,
        filters: filters || {},
        resultsCount
      });
    }
  } catch (error) {
    console.error('Error saving search history:', error);
  }
};

// ============================================
// USER SEARCH (ALL ROLES)
// ============================================

exports.searchUsers = async (req, res) => {
  try {
    const {
      q, // search query
      role, // player, coach, specialist, club
      sport,
      location,
      minRating,
      maxPrice,
      minPrice,
      availability,
      verified,
      experienceLevel,
      specialization,
      certifications,
      language,
      page = 1,
      limit = 20,
      sortBy = 'relevance' // relevance, rating, date
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build user query
    const userQuery = {
      isEmailVerified: true
    };

    if (role) {
      userQuery.role = role;
    }

    // Text search on user fields
    if (q) {
      const sanitizedQuery = sanitizeSearchQuery(q);
      userQuery.$or = [
        { firstName: { $regex: sanitizedQuery, $options: 'i' } },
        { lastName: { $regex: sanitizedQuery, $options: 'i' } },
        { email: { $regex: sanitizedQuery, $options: 'i' } }
      ];
    }

    const users = await User.find(userQuery)
      .select('_id firstName lastName email profileImage role createdAt')
      .limit(parseInt(limit))
      .skip(skip);

    // Get profile details based on role
    const results = await Promise.all(users.map(async (user) => {
      let profileModel;
      let profileData = null;

      if (user.role === 'player') {
        profileModel = PlayerProfile;
      } else if (user.role === 'coach') {
        profileModel = CoachProfile;
      } else if (user.role === 'specialist') {
        profileModel = SpecialistProfile;
      } else if (user.role === 'club') {
        profileModel = ClubProfile;
      }

      if (profileModel) {
        profileData = await profileModel.findOne({ userId: user._id })
          .select('sports primarySport specializations location rating level verified');
      }

      return {
        _id: user._id,
        role: user.role,
        fullName: `${user.firstName} ${user.lastName}`,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.profileImage,
        ...profileData?.toObject()
      };
    }));

    // Apply additional filters on profile data
    let filteredResults = results.filter(r => r !== null);

    if (sport) {
      filteredResults = filteredResults.filter(r =>
        r.sports?.includes(sport) || r.primarySport === sport
      );
    }

    if (location) {
      filteredResults = filteredResults.filter(r =>
        r.location?.city?.toLowerCase().includes(location.toLowerCase()) ||
        r.location?.country?.toLowerCase().includes(location.toLowerCase())
      );
    }

    if (minRating) {
      filteredResults = filteredResults.filter(r =>
        r.rating?.average >= parseFloat(minRating)
      );
    }

    if (verified === 'true') {
      filteredResults = filteredResults.filter(r => r.verified === true);
    }

    // Sort results
    if (sortBy === 'rating') {
      filteredResults.sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0));
    } else if (sortBy === 'date') {
      filteredResults.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    const total = filteredResults.length;

    // Save search history
    await saveSearchHistory(req.user?._id, q, 'users', req.query, total);

    res.json({
      success: true,
      results: filteredResults.slice(skip, skip + parseInt(limit)),
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      hasMore: total > parseInt(page) * parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching users',
      error: error.message
    });
  }
};

// ============================================
// COACH SEARCH
// ============================================

exports.searchCoaches = async (req, res) => {
  try {
    const {
      q,
      sport,
      specialization,
      location,
      minRating,
      maxPrice,
      minPrice,
      experienceLevel,
      coachingLevel,
      certifications,
      language,
      availability,
      page = 1,
      limit = 20,
      sortBy = 'relevance'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = {
      isDeleted: false
    };

    // Text search
    if (q) {
      const sanitizedQuery = sanitizeSearchQuery(q);
      const userQuery = {
        role: 'coach',
        $or: [
          { firstName: { $regex: sanitizedQuery, $options: 'i' } },
          { lastName: { $regex: sanitizedQuery, $options: 'i' } }
        ]
      };

      // Exclude current user only if authenticated
      if (req.user && req.user._id) {
        userQuery._id = { $ne: req.user._id };
      }

      const users = await User.find(userQuery).select('_id');

      query.userId = { $in: users.map(u => u._id) };
    } else if (req.user && req.user._id) {
      // Even without search query, exclude current user if authenticated
      query.userId = { $ne: req.user._id };
    }

    // Filters
    if (sport) {
      query.$or = [
        { primarySport: sport },
        { sports: sport }
      ];
    }

    if (specialization) {
      query.specializations = specialization;
    }

    if (location) {
      query.$or = [
        { 'location.city': { $regex: location, $options: 'i' } },
        { 'location.country': { $regex: location, $options: 'i' } }
      ];
    }

    if (minRating) {
      query['rating.average'] = { $gte: parseFloat(minRating) };
    }

    if (maxPrice || minPrice) {
      const priceQuery = {};
      if (maxPrice) priceQuery.$lte = parseFloat(maxPrice);
      if (minPrice) priceQuery.$gte = parseFloat(minPrice);
      query['pricing.sessionPrice'] = priceQuery;
    }

    if (experienceLevel) {
      query.experienceLevel = experienceLevel;
    }

    if (coachingLevel) {
      query.coachingLevel = { $in: Array.isArray(coachingLevel) ? coachingLevel : [coachingLevel] };
    }

    if (language) {
      query.languages = language;
    }

    // Sort
    let sort = {};
    if (sortBy === 'rating') {
      sort = { 'rating.average': -1, 'rating.count': -1 };
    } else if (sortBy === 'price_low') {
      sort = { 'pricing.sessionPrice': 1 };
    } else if (sortBy === 'price_high') {
      sort = { 'pricing.sessionPrice': -1 };
    } else {
      sort = { createdAt: -1 };
    }

    const coaches = await CoachProfile.find(query)
      .populate('userId', 'firstName lastName email profileImage')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await CoachProfile.countDocuments(query);

    // Format results
    const results = coaches.map(coach => ({
      _id: coach._id,
      userId: coach.userId._id,
      role: 'coach',
      fullName: `${coach.userId.firstName} ${coach.userId.lastName}`,
      avatar: coach.userId.profileImage,
      sport: coach.primarySport,
      sports: coach.sports,
      location: coach.location?.city + ', ' + coach.location?.country,
      rating: coach.rating.average,
      reviewCount: coach.rating.count,
      specializations: coach.specializations,
      priceRange: coach.pricing?.sessionPrice ? `$${coach.pricing.sessionPrice}` : 'Contact for price',
      availability: coach.availability?.isAvailable ? 'Available' : 'Busy',
      experienceYears: coach.yearsOfExperience,
      verified: coach.verified
    }));

    // Save search history
    await saveSearchHistory(req.user?._id, q, 'coaches', req.query, total);

    res.json({
      success: true,
      results,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      hasMore: total > parseInt(page) * parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching coaches',
      error: error.message
    });
  }
};

// ============================================
// PLAYER SEARCH
// ============================================

exports.searchPlayers = async (req, res) => {
  try {
    const {
      q,
      sport,
      position,
      level,
      location,
      ageMin,
      ageMax,
      page = 1,
      limit = 20,
      sortBy = 'relevance'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
      isDeleted: false
    };

    // Text search
    if (q) {
      const sanitizedQuery = sanitizeSearchQuery(q);
      const userQuery = {
        role: 'player',
        $or: [
          { firstName: { $regex: sanitizedQuery, $options: 'i' } },
          { lastName: { $regex: sanitizedQuery, $options: 'i' } }
        ]
      };

      // Exclude current user only if authenticated
      if (req.user && req.user._id) {
        userQuery._id = { $ne: req.user._id };
      }

      const users = await User.find(userQuery).select('_id');

      query.userId = { $in: users.map(u => u._id) };
    } else if (req.user && req.user._id) {
      // Even without search query, exclude current user if authenticated
      query.userId = { $ne: req.user._id };
    }

    // Filters
    if (sport) {
      query.$or = [
        { primarySport: sport },
        { sports: sport }
      ];
    }

    if (position) {
      query.position = position;
    }

    if (level) {
      query.level = level;
    }

    if (location) {
      query.$or = [
        { 'location.city': { $regex: location, $options: 'i' } },
        { 'location.country': { $regex: location, $options: 'i' } }
      ];
    }

    // Sort
    let sort = { createdAt: -1 };
    if (sortBy === 'rating') {
      sort = { 'stats.overallRating': -1 };
    }

    const players = await PlayerProfile.find(query)
      .populate('userId', 'firstName lastName email profileImage dateOfBirth')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await PlayerProfile.countDocuments(query);

    // Format results
    const results = players.map(player => ({
      _id: player._id,
      userId: player.userId._id,
      role: 'player',
      fullName: `${player.userId.firstName} ${player.userId.lastName}`,
      avatar: player.userId.profileImage,
      sport: player.primarySport,
      position: player.position,
      level: player.level,
      location: player.location?.city + ', ' + player.location?.country,
      age: player.userId.dateOfBirth ? new Date().getFullYear() - new Date(player.userId.dateOfBirth).getFullYear() : null
    }));

    // Save search history
    await saveSearchHistory(req.user?._id, q, 'players', req.query, total);

    res.json({
      success: true,
      results,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      hasMore: total > parseInt(page) * parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching players',
      error: error.message
    });
  }
};

// ============================================
// SPECIALIST SEARCH
// ============================================

exports.searchSpecialists = async (req, res) => {
  try {
    const {
      q,
      specialization,
      sport,
      location,
      minRating,
      language,
      page = 1,
      limit = 20,
      sortBy = 'relevance'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
      isDeleted: false
    };

    // Text search
    if (q) {
      const sanitizedQuery = sanitizeSearchQuery(q);
      const userQuery = {
        role: 'specialist',
        $or: [
          { firstName: { $regex: sanitizedQuery, $options: 'i' } },
          { lastName: { $regex: sanitizedQuery, $options: 'i' } }
        ]
      };

      // Exclude current user only if authenticated
      if (req.user && req.user._id) {
        userQuery._id = { $ne: req.user._id };
      }

      const users = await User.find(userQuery).select('_id');

      query.userId = { $in: users.map(u => u._id) };
    } else if (req.user && req.user._id) {
      // Even without search query, exclude current user if authenticated
      query.userId = { $ne: req.user._id };
    }

    // Filters
    if (specialization) {
      query.$or = [
        { primarySpecialization: specialization },
        { additionalSpecializations: specialization }
      ];
    }

    if (sport) {
      query['specializations.sports'] = sport;
    }

    if (location) {
      query['serviceLocations.address.city'] = { $regex: location, $options: 'i' };
    }

    if (minRating) {
      query['rating.average'] = { $gte: parseFloat(minRating) };
    }

    if (language) {
      query.languages = language;
    }

    // Sort
    let sort = {};
    if (sortBy === 'rating') {
      sort = { 'rating.average': -1 };
    } else {
      sort = { createdAt: -1 };
    }

    const specialists = await SpecialistProfile.find(query)
      .populate('userId', 'firstName lastName email profileImage')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await SpecialistProfile.countDocuments(query);

    // Format results
    const results = specialists.map(spec => ({
      _id: spec._id,
      userId: spec.userId._id,
      role: 'specialist',
      fullName: `${spec.userId.firstName} ${spec.userId.lastName}`,
      avatar: spec.userId.profileImage,
      specialization: spec.primarySpecialization,
      location: spec.serviceLocations?.[0]?.address?.city + ', ' + spec.serviceLocations?.[0]?.address?.country,
      rating: spec.rating.average,
      reviewCount: spec.rating.count,
      verified: spec.verified,
      experienceYears: spec.yearsOfExperience
    }));

    // Save search history
    await saveSearchHistory(req.user?._id, q, 'specialists', req.query, total);

    res.json({
      success: true,
      results,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      hasMore: total > parseInt(page) * parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching specialists',
      error: error.message
    });
  }
};

// ============================================
// CLUB SEARCH
// ============================================

exports.searchClubs = async (req, res) => {
  try {
    const {
      q,
      sport,
      location,
      verified,
      organizationType,
      minRating,
      hasOpenPositions,
      facilityType,
      programType,
      page = 1,
      limit = 20,
      sortBy = 'relevance'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
      isDeleted: false
    };

    // Exclude current user's club only if authenticated
    if (req.user && req.user._id) {
      query.userId = { $ne: req.user._id };
    }

    // Text search
    if (q) {
      const sanitizedQuery = sanitizeSearchQuery(q);
      query.$or = [
        { organizationName: { $regex: sanitizedQuery, $options: 'i' } },
        { description: { $regex: sanitizedQuery, $options: 'i' } }
      ];
    }

    // Filters
    if (sport) {
      query.$or = [
        { primarySport: sport },
        { sports: sport }
      ];
    }

    if (location) {
      query.$or = [
        { 'location.city': { $regex: location, $options: 'i' } },
        { 'location.country': { $regex: location, $options: 'i' } }
      ];
    }

    if (verified === 'true') {
      query.verified = true;
    }

    if (organizationType) {
      query.organizationType = organizationType;
    }

    if (minRating) {
      query['rating.average'] = { $gte: parseFloat(minRating) };
    }

    // Sort
    let sort = {};
    if (sortBy === 'rating') {
      sort = { 'rating.average': -1 };
    } else if (sortBy === 'members') {
      sort = { 'memberCount': -1 };
    } else {
      sort = { createdAt: -1 };
    }

    const clubs = await ClubProfile.find(query)
      .populate('userId', 'firstName lastName email profileImage')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await ClubProfile.countDocuments(query);

    // Check for open positions if requested
    let results = clubs;
    if (hasOpenPositions === 'true') {
      const clubsWithJobs = await Promise.all(clubs.map(async (club) => {
        const openJobs = await Job.countDocuments({
          clubId: club._id,
          status: 'active',
          applicationDeadline: { $gte: new Date() }
        });

        return openJobs > 0 ? { ...club.toObject(), openPositions: openJobs } : null;
      }));

      results = clubsWithJobs.filter(c => c !== null);
    }

    // Format results
    const formattedResults = results.map(club => ({
      _id: club._id,
      userId: club.userId?._id,
      role: 'club',
      name: club.organizationName,
      logo: club.logo,
      location: club.location?.city + ', ' + club.location?.country,
      sports: club.sports,
      rating: club.rating?.average,
      memberCount: club.memberCount,
      verified: club.verified,
      facilities: club.facilities?.map(f => f.name),
      programs: club.programs?.map(p => p.name),
      openPositions: club.openPositions || 0
    }));

    // Save search history
    await saveSearchHistory(req.user?._id, q, 'clubs', req.query, total);

    res.json({
      success: true,
      results: formattedResults,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      hasMore: total > parseInt(page) * parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching clubs',
      error: error.message
    });
  }
};

// ============================================
// JOB SEARCH
// ============================================

exports.searchJobs = async (req, res) => {
  try {
    const {
      q,
      role,
      sport,
      location,
      jobType,
      salaryMin,
      salaryMax,
      postedWithin,
      clubId,
      page = 1,
      limit = 20,
      sortBy = 'date'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
      status: 'active',
      applicationDeadline: { $gte: new Date() }
    };

    // Text search
    if (q) {
      const sanitizedQuery = sanitizeSearchQuery(q);
      query.$or = [
        { title: { $regex: sanitizedQuery, $options: 'i' } },
        { description: { $regex: sanitizedQuery, $options: 'i' } }
      ];
    }

    // Filters - Auto-filter by authenticated user's role
    // If user is authenticated, show only jobs matching their role
    // If role parameter is provided, use that instead (for admins/clubs)
    if (role) {
      query.category = role;
    } else if (req.user && req.user.role && req.user.role !== 'club') {
      // Automatically filter by user's role (player, coach, specialist)
      query.category = req.user.role;
    }

    if (sport) {
      query.sport = sport;
    }

    if (location) {
      query['location.city'] = { $regex: location, $options: 'i' };
    }

    if (jobType) {
      query.jobType = jobType;
    }

    if (salaryMin || salaryMax) {
      query['salary.amount'] = {};
      if (salaryMin) query['salary.amount'].$gte = parseFloat(salaryMin);
      if (salaryMax) query['salary.amount'].$lte = parseFloat(salaryMax);
    }

    if (postedWithin) {
      const days = parseInt(postedWithin.replace('d', ''));
      const date = new Date();
      date.setDate(date.getDate() - days);
      query.createdAt = { $gte: date };
    }

    if (clubId) {
      query.clubId = clubId;
    }

    // Sort
    let sort = {};
    if (sortBy === 'salary_high') {
      sort = { 'salary.amount': -1 };
    } else if (sortBy === 'salary_low') {
      sort = { 'salary.amount': 1 };
    } else if (sortBy === 'deadline') {
      sort = { applicationDeadline: 1 };
    } else {
      sort = { createdAt: -1 };
    }

    const jobs = await Job.find(query)
      .populate('clubId', 'organizationName logo location')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Job.countDocuments(query);

    // Format results
    const results = jobs.map(job => ({
      _id: job._id,
      title: job.title,
      club: {
        _id: job.clubId._id,
        name: job.clubId.organizationName,
        logo: job.clubId.logo
      },
      jobType: job.jobType,
      sport: job.sport,
      position: job.position,
      location: job.location?.city + ', ' + job.location?.country,
      salaryRange: job.salary?.amount ? `${job.salary.currency} ${job.salary.amount}/${job.salary.period}` : 'Not specified',
      deadline: job.applicationDeadline,
      applicationCount: job.applicationCount || 0,
      postedAt: job.createdAt
    }));

    // Save search history
    await saveSearchHistory(req.user?._id, q, 'jobs', req.query, total);

    res.json({
      success: true,
      results,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      hasMore: total > parseInt(page) * parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching jobs',
      error: error.message
    });
  }
};

// ============================================
// GLOBAL SEARCH (ALL ENTITIES)
// ============================================

exports.searchAll = async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const sanitizedQuery = sanitizeSearchQuery(q);

    // First, find matching users by name (exclude current user if authenticated)
    const userQuery = {
      $or: [
        { firstName: { $regex: sanitizedQuery, $options: 'i' } },
        { lastName: { $regex: sanitizedQuery, $options: 'i' } }
      ]
    };

    // Exclude current user only if authenticated
    if (req.user && req.user._id) {
      userQuery._id = { $ne: req.user._id };
    }

    const matchingUsers = await User.find(userQuery).select('_id role');

    const coachUserIds = matchingUsers.filter(u => u.role === 'coach').map(u => u._id);
    const playerUserIds = matchingUsers.filter(u => u.role === 'player').map(u => u._id);
    const specialistUserIds = matchingUsers.filter(u => u.role === 'specialist').map(u => u._id);

    // Search in parallel
    const [coaches, players, specialists, clubs, jobs] = await Promise.all([
      // Coaches
      coachUserIds.length > 0
        ? CoachProfile.find({
            isDeleted: false,
            userId: { $in: coachUserIds }
          }).populate('userId').limit(5)
        : Promise.resolve([]),

      // Players
      playerUserIds.length > 0
        ? PlayerProfile.find({
            isDeleted: false,
            userId: { $in: playerUserIds }
          }).populate('userId').limit(5)
        : Promise.resolve([]),

      // Specialists
      specialistUserIds.length > 0
        ? SpecialistProfile.find({
            isDeleted: false,
            userId: { $in: specialistUserIds }
          }).populate('userId').limit(5)
        : Promise.resolve([]),

      // Clubs
      ClubProfile.find({
        isDeleted: false,
        $or: [
          { organizationName: { $regex: sanitizedQuery, $options: 'i' } },
          { description: { $regex: sanitizedQuery, $options: 'i' } }
        ]
      }).populate('userId').limit(5),

      // Jobs
      Job.find({
        status: 'active',
        applicationDeadline: { $gte: new Date() },
        $or: [
          { title: { $regex: sanitizedQuery, $options: 'i' } },
          { description: { $regex: sanitizedQuery, $options: 'i' } }
        ]
      }).populate('clubId', 'organizationName logo').limit(5)
    ]);

    const results = {
      users: {
        coaches: coaches.map(c => ({
          _id: c._id,
          type: 'coach',
          name: `${c.userId.firstName} ${c.userId.lastName}`,
          avatar: c.userId.profileImage,
          sport: c.primarySport,
          rating: c.rating?.average || 0
        })),
        players: players.map(p => ({
          _id: p._id,
          type: 'player',
          name: `${p.userId.firstName} ${p.userId.lastName}`,
          avatar: p.userId.profileImage,
          sport: p.primarySport,
          position: p.position,
          rating: p.ratingStats?.averageRating || 0
        })),
        specialists: specialists.map(s => ({
          _id: s._id,
          type: 'specialist',
          name: `${s.userId.firstName} ${s.userId.lastName}`,
          avatar: s.userId.profileImage,
          specialization: s.primarySpecialization,
          rating: s.rating?.average || 0
        }))
      },
      clubs: clubs.map(c => ({
        _id: c._id,
        type: 'club',
        name: c.organizationName,
        logo: c.logo,
        location: c.location?.city,
        rating: c.rating?.average || 0
      })),
      jobs: jobs.map(j => ({
        _id: j._id,
        type: 'job',
        title: j.title,
        club: j.clubId.organizationName,
        sport: j.sport,
        deadline: j.applicationDeadline
      }))
    };

    const total = {
      users: coaches.length + players.length + specialists.length,
      clubs: clubs.length,
      jobs: jobs.length
    };

    // Save search history
    await saveSearchHistory(req.user?._id, q, 'all', req.query, total.users + total.clubs + total.jobs);

    res.json({
      success: true,
      results,
      total
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error performing global search',
      error: error.message
    });
  }
};

// ============================================
// AUTOCOMPLETE
// ============================================

exports.autocomplete = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        suggestions: []
      });
    }

    const sanitizedQuery = sanitizeSearchQuery(q);

    // Get suggestions from different sources
    const [userSuggestions, clubSuggestions, jobSuggestions, popularSearches] = await Promise.all([
      // User names
      User.find({
        isEmailVerified: true,
        $or: [
          { firstName: { $regex: sanitizedQuery, $options: 'i' } },
          { lastName: { $regex: sanitizedQuery, $options: 'i' } }
        ]
      }).select('firstName lastName role').limit(5),

      // Club names
      ClubProfile.find({
        organizationName: { $regex: sanitizedQuery, $options: 'i' },
        isDeleted: false
      }).select('organizationName').limit(5),

      // Job titles
      Job.find({
        title: { $regex: sanitizedQuery, $options: 'i' },
        status: 'active'
      }).select('title sport').limit(5),

      // Popular searches
      SearchHistory.getPopularSearches(null, 5)
    ]);

    const suggestions = [
      ...userSuggestions.map(u => ({
        text: `${u.firstName} ${u.lastName}`,
        type: 'user',
        role: u.role
      })),
      ...clubSuggestions.map(c => ({
        text: c.organizationName,
        type: 'club'
      })),
      ...jobSuggestions.map(j => ({
        text: j.title,
        type: 'job',
        sport: j.sport
      })),
      ...popularSearches.filter(ps =>
        ps.query.toLowerCase().includes(q.toLowerCase())
      ).map(ps => ({
        text: ps.query,
        type: 'popular',
        count: ps.count
      }))
    ].slice(0, 10);

    res.json({
      success: true,
      suggestions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting autocomplete suggestions',
      error: error.message
    });
  }
};

// ============================================
// SEARCH HISTORY
// ============================================

exports.getSearchHistory = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const history = await SearchHistory.getRecentSearches(req.user._id, parseInt(limit));

    res.json({
      success: true,
      history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching search history',
      error: error.message
    });
  }
};

exports.clearSearchHistory = async (req, res) => {
  try {
    await SearchHistory.deleteMany({ userId: req.user._id });

    res.json({
      success: true,
      message: 'Search history cleared'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error clearing search history',
      error: error.message
    });
  }
};

// ============================================
// SAVED SEARCHES
// ============================================

exports.saveSearch = async (req, res) => {
  try {
    const { name, searchQuery, searchType, filters, notifyOnNewResults } = req.body;

    const savedSearch = await SavedSearch.create({
      userId: req.user._id,
      name,
      searchQuery,
      searchType,
      filters,
      notifyOnNewResults: notifyOnNewResults || false
    });

    res.status(201).json({
      success: true,
      message: 'Search saved successfully',
      savedSearch
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error saving search',
      error: error.message
    });
  }
};

exports.getSavedSearches = async (req, res) => {
  try {
    const savedSearches = await SavedSearch.getActiveSearches(req.user._id);

    res.json({
      success: true,
      savedSearches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching saved searches',
      error: error.message
    });
  }
};

exports.deleteSavedSearch = async (req, res) => {
  try {
    const savedSearch = await SavedSearch.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!savedSearch) {
      return res.status(404).json({
        success: false,
        message: 'Saved search not found'
      });
    }

    await savedSearch.deleteOne();

    res.json({
      success: true,
      message: 'Saved search deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting saved search',
      error: error.message
    });
  }
};

// ============================================
// TRENDING/SUGGESTIONS
// ============================================

exports.getTrendingSearches = async (req, res) => {
  try {
    const { type, limit = 10 } = req.query;

    const trending = await SearchHistory.getPopularSearches(type, parseInt(limit));

    res.json({
      success: true,
      trending
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching trending searches',
      error: error.message
    });
  }
};

// ============================================
// RECENT JOBS
// ============================================

exports.getRecentJobs = async (req, res) => {
  try {
    const { limit = 3 } = req.query;

    const jobs = await Job.find({
      status: 'active',
      isDeleted: false,
      applicationDeadline: { $gte: new Date() }
    })
      .populate('clubId', 'organizationName logo location')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const total = jobs.length;

    // Format results
    const results = jobs.map(job => ({
      _id: job._id,
      title: job.title,
      titleAr: job.titleAr,
      description: job.description,
      descriptionAr: job.descriptionAr,
      club: {
        _id: job.clubId._id,
        name: job.clubId.organizationName,
        logo: job.clubId.logo,
        location: job.clubId.location
      },
      jobType: job.jobType,
      category: job.category,
      sport: job.sport,
      position: job.position,
      employmentType: job.employmentType,
      location: job.location,
      salary: job.salary,
      numberOfPositions: job.numberOfPositions,
      applicationDeadline: job.applicationDeadline,
      expectedStartDate: job.expectedStartDate,
      applicationStats: job.applicationStats,
      isFeatured: job.isFeatured,
      createdAt: job.createdAt
    }));

    // Save search history if user is authenticated
    await saveSearchHistory(req.user?._id, 'recent_jobs', 'jobs', req.query, total);

    res.json({
      success: true,
      jobs: results,
      total
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching recent jobs',
      error: error.message
    });
  }
};

// ============================================
// TOP RATED PLAYERS
// ============================================

exports.getTopRatedPlayers = async (req, res) => {
  try {
    const { limit = 3, sport, minReviews = 1 } = req.query;

    // Build query
    const query = {
      isDeleted: false,
      'ratingStats.totalReviews': { $gte: parseInt(minReviews) },
      'ratingStats.averageRating': { $gt: 0 }
    };

    // Filter by sport if provided
    if (sport) {
      query.$or = [
        { primarySport: sport },
        { additionalSports: sport }
      ];
    }

    const players = await PlayerProfile.find(query)
      .populate('userId', 'firstName lastName email profileImage dateOfBirth')
      .sort({
        'ratingStats.averageRating': -1,
        'ratingStats.totalReviews': -1
      })
      .limit(parseInt(limit));

    const total = players.length;

    // Format results
    const results = players.map(player => ({
      _id: player._id,
      userId: player.userId._id,
      fullName: `${player.userId.firstName} ${player.userId.lastName}`,
      firstName: player.userId.firstName,
      lastName: player.userId.lastName,
      avatar: player.userId.profileImage,
      primarySport: player.primarySport,
      additionalSports: player.additionalSports,
      position: player.position,
      positionAr: player.positionAr,
      level: player.level,
      location: player.location,
      bio: player.bio,
      bioAr: player.bioAr,
      ratingStats: {
        averageRating: player.ratingStats.averageRating,
        totalReviews: player.ratingStats.totalReviews
      },
      verified: player.verified,
      age: player.userId.dateOfBirth
        ? new Date().getFullYear() - new Date(player.userId.dateOfBirth).getFullYear()
        : null
    }));

    // Save search history if user is authenticated
    await saveSearchHistory(req.user?._id, 'top_rated_players', 'players', req.query, total);

    res.json({
      success: true,
      players: results,
      total
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching top rated players',
      error: error.message
    });
  }
};

module.exports = exports;
