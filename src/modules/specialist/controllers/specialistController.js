const SpecialistProfile = require('../models/SpecialistProfile');
const SpecialistAvailability = require('../models/SpecialistAvailability');
const ConsultationRequest = require('../models/ConsultationRequest');
const ConsultationSession = require('../models/ConsultationSession');
const SpecialistClient = require('../models/SpecialistClient');
const SpecialistProgram = require('../models/SpecialistProgram');
const User = require('../../shared/models/User');
const { uploadSpecialistAvatar, uploadSpecialistBanner, cleanupOldImage } = require('../../../config/cloudinary');

// ============================================
// PROFILE MANAGEMENT
// ============================================

// Create specialist profile
exports.createProfile = async (req, res) => {
  try {
    const existingProfile = await SpecialistProfile.findOne({ userId: req.user._id });
    if (existingProfile) {
      return res.status(409).json({
        success: false,
        message: 'Specialist profile already exists for this user'
      });
    }

    const profileData = {
      userId: req.user._id,
      ...req.body
    };

    const profile = new SpecialistProfile(profileData);
    await profile.save();

    // Create default availability
    await SpecialistAvailability.createDefault(req.user._id);

    res.status(201).json({
      success: true,
      message: 'Specialist profile created successfully',
      profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating specialist profile',
      error: error.message
    });
  }
};

// Get my specialist profile
exports.getMyProfile = async (req, res) => {
  try {
    const profile = await SpecialistProfile.findOne({ userId: req.user._id, isDeleted: false });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Specialist profile not found'
      });
    }

    res.json({
      success: true,
      profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching specialist profile',
      error: error.message
    });
  }
};

// Get specialist profile by ID
exports.getProfileById = async (req, res) => {
  try {
    const profile = await SpecialistProfile.findById(req.params.id)
      .populate('userId', 'fullName email phoneNumber');

    if (!profile || profile.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Specialist profile not found'
      });
    }

    // Increment profile views
    profile.profileViews += 1;
    await profile.save();

    const publicProfile = profile.getPublicProfile();

    res.json({
      success: true,
      profile: publicProfile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching specialist profile',
      error: error.message
    });
  }
};

// Update specialist profile
exports.updateProfile = async (req, res) => {
  try {
    const profile = await SpecialistProfile.findOne({ userId: req.user._id, isDeleted: false });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Specialist profile not found'
      });
    }

    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        profile[key] = req.body[key];
      }
    });

    await profile.save();

    res.json({
      success: true,
      message: 'Specialist profile updated successfully',
      profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating specialist profile',
      error: error.message
    });
  }
};

// Delete specialist profile
exports.deleteProfile = async (req, res) => {
  try {
    const profile = await SpecialistProfile.findOne({ userId: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Specialist profile not found'
      });
    }

    profile.isDeleted = true;
    profile.isActive = false;
    await profile.save();

    res.json({
      success: true,
      message: 'Specialist profile deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting specialist profile',
      error: error.message
    });
  }
};

// ============================================
// SEARCH & DISCOVERY
// ============================================

// Search specialists
exports.searchSpecialists = async (req, res) => {
  try {
    const {
      specialization,
      sport,
      city,
      minRating,
      experienceYears,
      language,
      verified,
      page = 1,
      limit = 20,
      sortBy = 'rating',
      search
    } = req.query;

    const query = {
      isActive: true,
      isDeleted: false,
      status: 'active',
      'privacy.profileVisibility': { $in: ['public', 'registered_only'] }
    };

    if (specialization) query.primarySpecialization = specialization;
    if (sport) query.sportsSpecializedIn = new RegExp(sport, 'i');
    if (city) query['serviceLocations.city'] = new RegExp(city, 'i');
    if (minRating) query['ratingStats.averageRating'] = { $gte: parseFloat(minRating) };
    if (experienceYears) query.experienceYears = { $gte: parseInt(experienceYears) };
    if (language) query.languages = language;
    if (verified === 'true') query['verification.isVerified'] = true;

    if (search) {
      query.$or = [
        { bio: new RegExp(search, 'i') },
        { bioAr: new RegExp(search, 'i') },
        { searchKeywords: new RegExp(search, 'i') }
      ];
    }

    const sortOptions = {
      rating: { 'ratingStats.averageRating': -1 },
      experience: { experienceYears: -1 },
      clients: { 'clientStats.totalClients': -1 },
      createdAt: { createdAt: -1 }
    };

    const skip = (page - 1) * limit;
    const specialists = await SpecialistProfile.find(query)
      .populate('userId', 'fullName profilePicture')
      .sort(sortOptions[sortBy] || sortOptions.rating)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await SpecialistProfile.countDocuments(query);

    res.json({
      success: true,
      specialists: specialists.map(s => s.getPublicProfile()),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalSpecialists: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching specialists',
      error: error.message
    });
  }
};

// Get nearby specialists
exports.getNearbySpecialists = async (req, res) => {
  try {
    const { latitude, longitude, radius = 10, specialization, page = 1, limit = 20 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const query = {
      isActive: true,
      isDeleted: false,
      status: 'active',
      'serviceLocations.coordinates.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: radius * 1000
        }
      }
    };

    if (specialization) query.primarySpecialization = specialization;

    const skip = (page - 1) * limit;
    const specialists = await SpecialistProfile.find(query)
      .populate('userId', 'fullName profilePicture')
      .limit(parseInt(limit))
      .skip(skip);

    const total = await SpecialistProfile.countDocuments(query);

    res.json({
      success: true,
      specialists: specialists.map(s => s.getPublicProfile()),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalSpecialists: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error finding nearby specialists',
      error: error.message
    });
  }
};

// ============================================
// AVAILABILITY MANAGEMENT
// ============================================

// Get my availability
exports.getMyAvailability = async (req, res) => {
  try {
    const availability = await SpecialistAvailability.findOne({ specialistId: req.user._id });

    if (!availability) {
      return res.status(404).json({
        success: false,
        message: 'Availability not found'
      });
    }

    res.json({
      success: true,
      availability
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching availability',
      error: error.message
    });
  }
};

// Update weekly schedule
exports.updateWeeklySchedule = async (req, res) => {
  try {
    const { weeklySchedule } = req.body;
    const availability = await SpecialistAvailability.findOne({ specialistId: req.user._id });

    if (!availability) {
      return res.status(404).json({
        success: false,
        message: 'Availability not found'
      });
    }

    availability.weeklySchedule = weeklySchedule;
    availability.lastUpdated = new Date();
    await availability.save();

    res.json({
      success: true,
      message: 'Weekly schedule updated successfully',
      availability
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating weekly schedule',
      error: error.message
    });
  }
};

// Block date
exports.blockDate = async (req, res) => {
  try {
    const { date, reason, reasonAr } = req.body;
    const availability = await SpecialistAvailability.findOne({ specialistId: req.user._id });

    if (!availability) {
      return res.status(404).json({
        success: false,
        message: 'Availability not found'
      });
    }

    availability.blockDate(new Date(date), reason, reasonAr);
    await availability.save();

    res.json({
      success: true,
      message: 'Date blocked successfully',
      availability
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error blocking date',
      error: error.message
    });
  }
};

// Unblock date
exports.unblockDate = async (req, res) => {
  try {
    const { date } = req.body;
    const availability = await SpecialistAvailability.findOne({ specialistId: req.user._id });

    if (!availability) {
      return res.status(404).json({
        success: false,
        message: 'Availability not found'
      });
    }

    availability.unblockDate(new Date(date));
    await availability.save();

    res.json({
      success: true,
      message: 'Date unblocked successfully',
      availability
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error unblocking date',
      error: error.message
    });
  }
};

// Block period
exports.blockPeriod = async (req, res) => {
  try {
    const { startDate, endDate, reason, reasonAr, type } = req.body;
    const availability = await SpecialistAvailability.findOne({ specialistId: req.user._id });

    if (!availability) {
      return res.status(404).json({
        success: false,
        message: 'Availability not found'
      });
    }

    availability.blockPeriod(new Date(startDate), new Date(endDate), reason, reasonAr, type);
    await availability.save();

    res.json({
      success: true,
      message: 'Period blocked successfully',
      availability
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error blocking period',
      error: error.message
    });
  }
};

// Get available slots for date
exports.getAvailableSlots = async (req, res) => {
  try {
    const { date, specialistId } = req.query;

    if (!date || !specialistId) {
      return res.status(400).json({
        success: false,
        message: 'Date and specialistId are required'
      });
    }

    const availability = await SpecialistAvailability.findOne({ specialistId });

    if (!availability) {
      return res.status(404).json({
        success: false,
        message: 'Availability not found'
      });
    }

    const slots = availability.getAvailableSlotsForDate(new Date(date));

    res.json({
      success: true,
      date,
      ...slots
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching available slots',
      error: error.message
    });
  }
};

// ============================================
// CONSULTATION REQUESTS
// ============================================

// Get my consultation requests
exports.getConsultationRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const requests = await ConsultationRequest.find({
      specialistId: req.user._id,
      ...(status && { status })
    })
    .populate('clientId', 'fullName profilePicture email phoneNumber')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      requests,
      total: requests.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching consultation requests',
      error: error.message
    });
  }
};

// Accept consultation request
exports.acceptRequest = async (req, res) => {
  try {
    const { message, suggestedDate, suggestedTime } = req.body;
    const request = await ConsultationRequest.findOne({
      _id: req.params.requestId,
      specialistId: req.user._id
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Consultation request not found'
      });
    }

    request.accept(req.user._id, message, suggestedDate, suggestedTime);
    await request.save();

    res.json({
      success: true,
      message: 'Consultation request accepted',
      request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error accepting consultation request',
      error: error.message
    });
  }
};

// Reject consultation request
exports.rejectRequest = async (req, res) => {
  try {
    const { reason } = req.body;
    const request = await ConsultationRequest.findOne({
      _id: req.params.requestId,
      specialistId: req.user._id
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Consultation request not found'
      });
    }

    request.reject(req.user._id, reason);
    await request.save();

    res.json({
      success: true,
      message: 'Consultation request rejected',
      request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error rejecting consultation request',
      error: error.message
    });
  }
};

// Confirm consultation booking
exports.confirmBooking = async (req, res) => {
  try {
    const { date, time, duration, location } = req.body;
    const request = await ConsultationRequest.findOne({
      _id: req.params.requestId,
      specialistId: req.user._id
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Consultation request not found'
      });
    }

    await request.confirm(date, time, duration, 0, location);

    // Create consultation session
    const session = new ConsultationSession({
      specialistId: req.user._id,
      clientId: request.clientId,
      sessionType: request.serviceType,
      specialization: request.specialization,
      scheduledDate: date,
      startTime: time,
      duration,
      locationType: location.type,
      location,
      price: 0,
      requestId: request._id
    });

    await session.save();
    request.complete(session._id);
    await request.save();

    res.json({
      success: true,
      message: 'Consultation booking confirmed',
      request,
      session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error confirming booking',
      error: error.message
    });
  }
};

// ============================================
// SESSION MANAGEMENT
// ============================================

// Get my sessions
exports.getSessions = async (req, res) => {
  try {
    const sessions = await ConsultationSession.getSpecialistSessions(req.user._id, req.query);

    res.json({
      success: true,
      sessions,
      total: sessions.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching sessions',
      error: error.message
    });
  }
};

// Get today's sessions
exports.getTodaySessions = async (req, res) => {
  try {
    const sessions = await ConsultationSession.getTodaySessions(req.user._id);

    res.json({
      success: true,
      sessions,
      total: sessions.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching today\'s sessions',
      error: error.message
    });
  }
};

// Create session manually
exports.createSession = async (req, res) => {
  try {
    const sessionData = {
      specialistId: req.user._id,
      ...req.body,
      price: 0 // Free platform
    };

    const session = new ConsultationSession(sessionData);
    await session.save();

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating session',
      error: error.message
    });
  }
};

// Update session
exports.updateSession = async (req, res) => {
  try {
    const session = await ConsultationSession.findOne({
      _id: req.params.sessionId,
      specialistId: req.user._id,
      isDeleted: false
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        session[key] = req.body[key];
      }
    });

    await session.save();

    res.json({
      success: true,
      message: 'Session updated successfully',
      session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating session',
      error: error.message
    });
  }
};

// Complete session
exports.completeSession = async (req, res) => {
  try {
    const { sessionNotes, progress } = req.body;
    const session = await ConsultationSession.findOne({
      _id: req.params.sessionId,
      specialistId: req.user._id,
      isDeleted: false
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    session.complete(sessionNotes, progress);
    await session.save();

    res.json({
      success: true,
      message: 'Session marked as completed',
      session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error completing session',
      error: error.message
    });
  }
};

// Cancel session
exports.cancelSession = async (req, res) => {
  try {
    const { reason, reasonAr } = req.body;
    const session = await ConsultationSession.findOne({
      _id: req.params.sessionId,
      specialistId: req.user._id,
      isDeleted: false
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    session.cancel(req.user._id, reason, reasonAr, 0);
    await session.save();

    res.json({
      success: true,
      message: 'Session cancelled successfully',
      session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cancelling session',
      error: error.message
    });
  }
};

// Reschedule session
exports.rescheduleSession = async (req, res) => {
  try {
    const { newDate, newTime, reason } = req.body;
    const session = await ConsultationSession.findOne({
      _id: req.params.sessionId,
      specialistId: req.user._id,
      isDeleted: false
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    session.reschedule(req.user._id, newDate, newTime, reason);
    await session.save();

    res.json({
      success: true,
      message: 'Session rescheduled successfully',
      session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error rescheduling session',
      error: error.message
    });
  }
};

// ============================================
// CLIENT MANAGEMENT
// ============================================

// Get my clients
exports.getClients = async (req, res) => {
  try {
    const clients = await SpecialistClient.getSpecialistClients(req.user._id, req.query);

    res.json({
      success: true,
      clients,
      total: clients.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching clients',
      error: error.message
    });
  }
};

// Get client by ID
exports.getClientById = async (req, res) => {
  try {
    const client = await SpecialistClient.findOne({
      _id: req.params.clientId,
      specialistId: req.user._id,
      isDeleted: false
    }).populate('clientId', 'fullName profilePicture email phoneNumber');

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    res.json({
      success: true,
      client
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching client',
      error: error.message
    });
  }
};

// Add client note
exports.addClientNote = async (req, res) => {
  try {
    const { note, category } = req.body;
    const client = await SpecialistClient.findOne({
      _id: req.params.clientId,
      specialistId: req.user._id,
      isDeleted: false
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    client.addNote(note, category);
    await client.save();

    res.json({
      success: true,
      message: 'Note added successfully',
      client
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding client note',
      error: error.message
    });
  }
};

// Add client measurement
exports.addClientMeasurement = async (req, res) => {
  try {
    const client = await SpecialistClient.findOne({
      _id: req.params.clientId,
      specialistId: req.user._id,
      isDeleted: false
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    client.addMeasurement(req.body);
    await client.save();

    res.json({
      success: true,
      message: 'Measurement added successfully',
      client
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding client measurement',
      error: error.message
    });
  }
};

// ============================================
// PROGRAM MANAGEMENT
// ============================================

// Create program
exports.createProgram = async (req, res) => {
  try {
    const programData = {
      specialistId: req.user._id,
      createdBy: req.user._id,
      ...req.body
    };

    const program = new SpecialistProgram(programData);
    await program.save();

    res.status(201).json({
      success: true,
      message: 'Program created successfully',
      program
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating program',
      error: error.message
    });
  }
};

// Get my programs
exports.getPrograms = async (req, res) => {
  try {
    const programs = await SpecialistProgram.getSpecialistPrograms(req.user._id, req.query);

    res.json({
      success: true,
      programs,
      total: programs.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching programs',
      error: error.message
    });
  }
};

// Get program by ID
exports.getProgramById = async (req, res) => {
  try {
    const program = await SpecialistProgram.findOne({
      _id: req.params.programId,
      specialistId: req.user._id,
      isDeleted: false
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    res.json({
      success: true,
      program
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching program',
      error: error.message
    });
  }
};

// Update program
exports.updateProgram = async (req, res) => {
  try {
    const program = await SpecialistProgram.findOne({
      _id: req.params.programId,
      specialistId: req.user._id,
      isDeleted: false
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        program[key] = req.body[key];
      }
    });

    await program.save();

    res.json({
      success: true,
      message: 'Program updated successfully',
      program
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating program',
      error: error.message
    });
  }
};

// Delete program
exports.deleteProgram = async (req, res) => {
  try {
    const program = await SpecialistProgram.findOne({
      _id: req.params.programId,
      specialistId: req.user._id
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    program.isDeleted = true;
    await program.save();

    res.json({
      success: true,
      message: 'Program deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting program',
      error: error.message
    });
  }
};

// Assign program to client
exports.assignProgramToClient = async (req, res) => {
  try {
    const { clientId } = req.body;
    const program = await SpecialistProgram.findOne({
      _id: req.params.programId,
      specialistId: req.user._id,
      isDeleted: false
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    await program.assignToClient(clientId);

    res.json({
      success: true,
      message: 'Program assigned to client successfully',
      program
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error assigning program to client',
      error: error.message
    });
  }
};

// ============================================
// DASHBOARD & ANALYTICS
// ============================================

// Get dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const profile = await SpecialistProfile.findOne({ userId: req.user._id, isDeleted: false });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Specialist profile not found'
      });
    }

    const todaySessions = await ConsultationSession.getTodaySessions(req.user._id);
    const pendingRequests = await ConsultationRequest.getPendingRequests(req.user._id);

    const stats = {
      profile: {
        specialization: profile.primarySpecialization,
        completionPercentage: profile.completionPercentage,
        isVerified: profile.verification.isVerified,
        rating: profile.ratingStats.averageRating,
        totalReviews: profile.ratingStats.totalReviews
      },
      clients: profile.clientStats,
      sessions: {
        ...profile.sessionStats,
        todaySessions: todaySessions.length
      },
      requests: {
        pending: pendingRequests.length
      },
      activity: {
        profileViews: profile.profileViews,
        lastActivityDate: profile.lastActivityDate
      }
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
};

// ============================================
// MEDIA GALLERY
// ============================================

// Add photo
exports.addPhoto = async (req, res) => {
  try {
    const { url, caption, captionAr, type } = req.body;
    const profile = await SpecialistProfile.findOne({ userId: req.user._id, isDeleted: false });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Specialist profile not found'
      });
    }

    if (profile.photos.length >= 20) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 20 photos allowed'
      });
    }

    profile.photos.push({ url, caption, captionAr, type, uploadedAt: new Date() });
    await profile.save();

    res.json({
      success: true,
      message: 'Photo added successfully',
      profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding photo',
      error: error.message
    });
  }
};

// Remove photo
exports.removePhoto = async (req, res) => {
  try {
    const profile = await SpecialistProfile.findOne({ userId: req.user._id, isDeleted: false });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Specialist profile not found'
      });
    }

    profile.photos = profile.photos.filter(photo => photo._id.toString() !== req.params.photoId);
    await profile.save();

    res.json({
      success: true,
      message: 'Photo removed successfully',
      profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing photo',
      error: error.message
    });
  }
};

// Add video
exports.addVideo = async (req, res) => {
  try {
    const { url, thumbnail, title, titleAr, description, descriptionAr, duration, type } = req.body;
    const profile = await SpecialistProfile.findOne({ userId: req.user._id, isDeleted: false });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Specialist profile not found'
      });
    }

    if (profile.videos.length >= 10) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 10 videos allowed'
      });
    }

    profile.videos.push({ url, thumbnail, title, titleAr, description, descriptionAr, duration, type, uploadedAt: new Date() });
    await profile.save();

    res.json({
      success: true,
      message: 'Video added successfully',
      profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding video',
      error: error.message
    });
  }
};

// Remove video
exports.removeVideo = async (req, res) => {
  try {
    const profile = await SpecialistProfile.findOne({ userId: req.user._id, isDeleted: false });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Specialist profile not found'
      });
    }

    profile.videos = profile.videos.filter(video => video._id.toString() !== req.params.videoId);
    await profile.save();

    res.json({
      success: true,
      message: 'Video removed successfully',
      profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing video',
      error: error.message
    });
  }
};

// ============================================
// SETTINGS
// ============================================

// Update privacy settings
exports.updatePrivacySettings = async (req, res) => {
  try {
    const profile = await SpecialistProfile.findOne({ userId: req.user._id, isDeleted: false });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Specialist profile not found'
      });
    }

    profile.privacy = { ...profile.privacy, ...req.body.privacy };
    await profile.save();

    res.json({
      success: true,
      message: 'Privacy settings updated successfully',
      profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating privacy settings',
      error: error.message
    });
  }
};

// Update notification settings
exports.updateNotificationSettings = async (req, res) => {
  try {
    const profile = await SpecialistProfile.findOne({ userId: req.user._id, isDeleted: false });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Specialist profile not found'
      });
    }

    profile.notificationPreferences = { ...profile.notificationPreferences, ...req.body.notifications };
    await profile.save();

    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating notification settings',
      error: error.message
    });
  }
};

// ============================================
// MISSING SESSION METHODS
// ============================================

// Get session by ID
exports.getSessionById = async (req, res) => {
  try {
    const session = await ConsultationSession.findOne({
      _id: req.params.sessionId,
      $or: [
        { specialistId: req.user._id },
        { clientId: req.user._id }
      ],
      isDeleted: false
    })
      .populate('specialistId', 'firstName lastName email phone profileImage')
      .populate('clientId', 'firstName lastName email phone profileImage');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    res.json({
      success: true,
      session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching session',
      error: error.message
    });
  }
};

// ============================================
// MISSING CLIENT METHODS
// ============================================

// Update client goals
exports.updateClientGoals = async (req, res) => {
  try {
    const { goals } = req.body;
    const client = await SpecialistClient.findOne({
      specialistId: req.user._id,
      clientId: req.params.clientId,
      isDeleted: false
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    client.goals = goals;
    await client.save();

    res.json({
      success: true,
      message: 'Client goals updated successfully',
      client
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating client goals',
      error: error.message
    });
  }
};

// Add pain tracking
exports.addPainTracking = async (req, res) => {
  try {
    const { area, painLevel, description } = req.body;
    const client = await SpecialistClient.findOne({
      specialistId: req.user._id,
      clientId: req.params.clientId,
      isDeleted: false
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    client.painTracking.push({
      date: new Date(),
      area,
      painLevel,
      description
    });

    await client.save();

    res.json({
      success: true,
      message: 'Pain tracking added successfully',
      client
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding pain tracking',
      error: error.message
    });
  }
};

// Add fitness metrics
exports.addFitnessMetrics = async (req, res) => {
  try {
    const metrics = req.body;
    const client = await SpecialistClient.findOne({
      specialistId: req.user._id,
      clientId: req.params.clientId,
      isDeleted: false
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    client.fitnessMetrics.push({
      date: new Date(),
      ...metrics
    });

    await client.save();

    res.json({
      success: true,
      message: 'Fitness metrics added successfully',
      client
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding fitness metrics',
      error: error.message
    });
  }
};

// ============================================
// MISSING PROGRAM METHODS
// ============================================

// Get program templates
exports.getProgramTemplates = async (req, res) => {
  try {
    const { programType } = req.query;
    const templates = await SpecialistProgram.getTemplates(req.user._id, programType);

    res.json({
      success: true,
      count: templates.length,
      templates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching program templates',
      error: error.message
    });
  }
};

// Clone program as template
exports.cloneProgramAsTemplate = async (req, res) => {
  try {
    const program = await SpecialistProgram.findOne({
      _id: req.params.programId,
      specialistId: req.user._id,
      isDeleted: false
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    const template = await program.cloneAsTemplate();

    res.status(201).json({
      success: true,
      message: 'Program cloned as template successfully',
      template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cloning program as template',
      error: error.message
    });
  }
};

// ============================================
// MISSING ANALYTICS METHOD
// ============================================

// Get analytics
exports.getAnalytics = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const profile = await SpecialistProfile.findOne({ userId: req.user._id, isDeleted: false });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Specialist profile not found'
      });
    }

    let startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === 'year') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    const sessions = await ConsultationSession.find({
      specialistId: req.user._id,
      createdAt: { $gte: startDate },
      isDeleted: false
    });

    const clients = await SpecialistClient.find({
      specialistId: req.user._id,
      createdAt: { $gte: startDate },
      isDeleted: false
    });

    const completedSessions = sessions.filter(s => s.attendance.status === 'completed');
    const cancelledSessions = sessions.filter(s => s.attendance.status === 'cancelled');

    const analytics = {
      period,
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      cancelledSessions: cancelledSessions.length,
      noShowSessions: sessions.filter(s => s.attendance.status === 'no_show').length,
      newClients: clients.length,
      totalClients: profile.clientStats.totalClients,
      activeClients: profile.clientStats.activeClients,
      averageRating: profile.rating.average,
      totalReviews: profile.rating.count,
      sessionTypes: {
        individual: sessions.filter(s => s.sessionType === 'individual').length,
        group: sessions.filter(s => s.sessionType === 'group').length,
        online: sessions.filter(s => s.location.type === 'online').length
      }
    };

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
};

// ============================================
// IMAGE UPLOADS (CLOUDINARY)
// ============================================

// Upload avatar
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const profile = await SpecialistProfile.findOne({ userId: req.user._id, isDeleted: false });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Specialist profile not found'
      });
    }

    // Upload new avatar to Cloudinary
    const userId = req.user._id;
    const result = await uploadSpecialistAvatar(req.file.buffer, userId);

    // Cleanup old avatar if exists
    if (profile.avatar?.publicId) {
      await cleanupOldImage(profile.avatar.url);
    }

    // Update profile with new avatar
    profile.avatar = {
      url: result.url,
      publicId: result.publicId,
      thumbnailUrl: result.thumbnailUrl,
      mediumUrl: result.mediumUrl,
      largeUrl: result.largeUrl
    };

    await profile.save();

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      avatar: profile.avatar
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading avatar',
      error: error.message
    });
  }
};

// Upload banner
exports.uploadBanner = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const profile = await SpecialistProfile.findOne({ userId: req.user._id, isDeleted: false });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Specialist profile not found'
      });
    }

    // Upload new banner to Cloudinary
    const userId = req.user._id;
    const result = await uploadSpecialistBanner(req.file.buffer, userId);

    // Cleanup old banner if exists
    if (profile.banner?.publicId) {
      await cleanupOldImage(profile.banner.url);
    }

    // Update profile with new banner
    profile.banner = {
      url: result.url,
      publicId: result.publicId,
      mobileUrl: result.mobileUrl,
      tabletUrl: result.tabletUrl,
      desktopUrl: result.desktopUrl
    };

    await profile.save();

    res.json({
      success: true,
      message: 'Banner uploaded successfully',
      banner: profile.banner
    });
  } catch (error) {
    console.error('Banner upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading banner',
      error: error.message
    });
  }
};

// Delete avatar
exports.deleteAvatar = async (req, res) => {
  try {
    const profile = await SpecialistProfile.findOne({ userId: req.user._id, isDeleted: false });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Specialist profile not found'
      });
    }

    if (!profile.avatar?.publicId) {
      return res.status(404).json({
        success: false,
        message: 'No avatar to delete'
      });
    }

    // Delete from Cloudinary
    await cleanupOldImage(profile.avatar.url);

    // Remove from profile
    profile.avatar = undefined;
    await profile.save();

    res.json({
      success: true,
      message: 'Avatar deleted successfully'
    });
  } catch (error) {
    console.error('Avatar delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting avatar',
      error: error.message
    });
  }
};

// Delete banner
exports.deleteBanner = async (req, res) => {
  try {
    const profile = await SpecialistProfile.findOne({ userId: req.user._id, isDeleted: false });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Specialist profile not found'
      });
    }

    if (!profile.banner?.publicId) {
      return res.status(404).json({
        success: false,
        message: 'No banner to delete'
      });
    }

    // Delete from Cloudinary
    await cleanupOldImage(profile.banner.url);

    // Remove from profile
    profile.banner = undefined;
    await profile.save();

    res.json({
      success: true,
      message: 'Banner deleted successfully'
    });
  } catch (error) {
    console.error('Banner delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting banner',
      error: error.message
    });
  }
};

module.exports = exports;
