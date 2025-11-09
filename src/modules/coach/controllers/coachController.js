const CoachProfile = require('../models/CoachProfile');
const CoachAvailability = require('../models/CoachAvailability');
const TrainingSession = require('../models/TrainingSession');
const CoachStudent = require('../models/CoachStudent');
const User = require('../../shared/models/User');
const { uploadAvatar, uploadPortfolioImage, uploadToCloudinary, cleanupOldImage, extractPublicId, deleteFromCloudinary } = require('../../../config/cloudinary');

class CoachController {

  // ==================== PROFILE MANAGEMENT ====================

  /**
   * Create coach profile
   * POST /coaches/profile
   */
  async createProfile(req, res) {
    try {
      const userId = req.user._id;

      // Check if profile already exists
      const existingProfile = await CoachProfile.findOne({ userId });
      if (existingProfile) {
        return res.status(400).json({
          success: false,
          message: 'Coach profile already exists',
          code: 'PROFILE_EXISTS'
        });
      }

      // Create new profile
      const profileData = {
        userId,
        ...req.body
      };

      const coachProfile = new CoachProfile(profileData);
      await coachProfile.save();

      // Create default availability schedule
      const availability = new CoachAvailability({
        coachId: userId,
        weeklySchedule: [
          { day: 'monday', isAvailable: false, slots: [] },
          { day: 'tuesday', isAvailable: false, slots: [] },
          { day: 'wednesday', isAvailable: false, slots: [] },
          { day: 'thursday', isAvailable: false, slots: [] },
          { day: 'friday', isAvailable: false, slots: [] },
          { day: 'saturday', isAvailable: false, slots: [] },
          { day: 'sunday', isAvailable: false, slots: [] }
        ]
      });
      await availability.save();

      res.status(201).json({
        success: true,
        message: 'Coach profile created successfully',
        profile: coachProfile
      });

    } catch (error) {
      console.error('Create coach profile error:', error);

      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors,
          code: 'VALIDATION_ERROR'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create coach profile',
        code: 'CREATE_PROFILE_FAILED'
      });
    }
  }

  /**
   * Get own profile
   * GET /coaches/profile/me
   */
  async getMyProfile(req, res) {
    try {
      const userId = req.user._id;

      const profile = await CoachProfile.findOne({ userId })
        .populate('userId', 'firstName lastName email phone avatar isVerified')
        .populate('currentClub.clubId', 'organizationName logo location');

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Coach profile not found',
          code: 'PROFILE_NOT_FOUND'
        });
      }

      res.status(200).json({
        success: true,
        profile
      });

    } catch (error) {
      console.error('Get my profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch profile',
        code: 'FETCH_PROFILE_FAILED'
      });
    }
  }

  /**
   * Get coach profile by ID (public view)
   * GET /coaches/profile/:id
   */
  async getProfileById(req, res) {
    try {
      const { id } = req.params;

      const profile = await CoachProfile.findById(id)
        .populate('userId', 'firstName lastName avatar isVerified')
        .populate('currentClub.clubId', 'organizationName logo location');

      if (!profile || profile.isDeleted) {
        return res.status(404).json({
          success: false,
          message: 'Coach profile not found',
          code: 'PROFILE_NOT_FOUND'
        });
      }

      // Increment profile views
      await profile.incrementProfileViews();

      // Return public profile (respects privacy settings)
      const publicProfile = profile.getPublicProfile();

      res.status(200).json({
        success: true,
        profile: publicProfile
      });

    } catch (error) {
      console.error('Get profile by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch profile',
        code: 'FETCH_PROFILE_FAILED'
      });
    }
  }

  /**
   * Update coach profile
   * PUT /coaches/profile
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user._id;

      const profile = await CoachProfile.findOne({ userId });

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Coach profile not found',
          code: 'PROFILE_NOT_FOUND'
        });
      }

      // Update fields
      const allowedUpdates = [
        'bio', 'bioAr', 'birthDate', 'nationality', 'languages',
        'location', 'socialMedia', 'primarySport', 'additionalSports',
        'specializations', 'specializationsAr', 'certifications', 'licenseNumber',
        'yearsOfExperience', 'coachingLevel', 'currentClub', 'previousExperience',
        'achievements', 'coachingPhilosophy', 'coachingPhilosophyAr', 'methodologies',
        'trainingTypes', 'ageGroups', 'levels', 'trainingLocations',
        'serviceRadius', 'willingToTravel', 'avatar', 'bannerImage', 'photos', 'videos',
        'highlightVideoUrl', 'status', 'acceptingNewStudents', 'maxStudents', 'privacy'
      ];

      Object.keys(req.body).forEach(key => {
        if (allowedUpdates.includes(key)) {
          profile[key] = req.body[key];
        }
      });

      await profile.save();

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        profile
      });

    } catch (error) {
      console.error('Update profile error:', error);

      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors,
          code: 'VALIDATION_ERROR'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        code: 'UPDATE_PROFILE_FAILED'
      });
    }
  }

  /**
   * Delete coach profile (soft delete)
   * DELETE /coaches/profile
   */
  async deleteProfile(req, res) {
    try {
      const userId = req.user._id;

      const profile = await CoachProfile.findOne({ userId });

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Coach profile not found',
          code: 'PROFILE_NOT_FOUND'
        });
      }

      profile.isDeleted = true;
      profile.deletedAt = new Date();
      profile.isActive = false;
      await profile.save();

      res.status(200).json({
        success: true,
        message: 'Profile deleted successfully'
      });

    } catch (error) {
      console.error('Delete profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete profile',
        code: 'DELETE_PROFILE_FAILED'
      });
    }
  }

  // ==================== SEARCH & DISCOVERY ====================

  /**
   * Search coaches (for players to find coaches)
   * GET /coaches/search
   */
  async searchCoaches(req, res) {
    try {
      const {
        sport,
        specialization,
        level,
        city,
        country,
        status,
        minRating,
        maxPrice,
        minPrice,
        trainingType,
        ageGroup,
        acceptingStudents,
        verified,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build query
      const query = {
        isActive: true,
        isDeleted: false
      };

      if (sport) {
        query.$or = [
          { primarySport: new RegExp(sport, 'i') },
          { additionalSports: new RegExp(sport, 'i') }
        ];
      }

      if (specialization) {
        query.specializations = new RegExp(specialization, 'i');
      }

      if (level) {
        query.coachingLevel = level;
      }

      if (city) {
        query['location.city'] = new RegExp(city, 'i');
      }

      if (country) {
        query['location.country'] = new RegExp(country, 'i');
      }

      if (status) {
        query.status = status;
      }

      if (minRating) {
        query['ratingStats.averageRating'] = { $gte: Number(minRating) };
      }

      if (trainingType) {
        query.trainingTypes = trainingType;
      }

      if (ageGroup) {
        query.ageGroups = ageGroup;
      }

      if (acceptingStudents === 'true') {
        query.acceptingNewStudents = true;
      }

      if (verified === 'true') {
        query.isVerified = true;
      }

      const coaches = await CoachProfile.find(query)
        .populate('userId', 'firstName lastName avatar isVerified')
        .populate('currentClub.clubId', 'organizationName logo')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

      const total = await CoachProfile.countDocuments(query);

      res.status(200).json({
        success: true,
        coaches: coaches.map(c => c.getPublicProfile()),
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit)
        }
      });

    } catch (error) {
      console.error('Search coaches error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search coaches',
        code: 'SEARCH_FAILED'
      });
    }
  }

  /**
   * Get nearby coaches (proximity search)
   * GET /coaches/nearby
   */
  async getNearbyCoaches(req, res) {
    try {
      const { lat, lng, radius = 10, sport, level, page = 1, limit = 20 } = req.query;

      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required',
          code: 'MISSING_COORDINATES'
        });
      }

      const query = {
        isActive: true,
        isDeleted: false,
        'location.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [Number(lng), Number(lat)]
            },
            $maxDistance: Number(radius) * 1000 // Convert km to meters
          }
        }
      };

      if (sport) {
        query.primarySport = new RegExp(sport, 'i');
      }

      if (level) {
        query.coachingLevel = level;
      }

      const coaches = await CoachProfile.find(query)
        .populate('userId', 'firstName lastName avatar isVerified')
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

      const total = await CoachProfile.countDocuments(query);

      res.status(200).json({
        success: true,
        coaches: coaches.map(c => c.getPublicProfile()),
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit)
        }
      });

    } catch (error) {
      console.error('Get nearby coaches error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch nearby coaches',
        code: 'NEARBY_SEARCH_FAILED'
      });
    }
  }

  // ==================== AVAILABILITY MANAGEMENT ====================

  /**
   * Get coach availability
   * GET /coaches/availability
   */
  async getAvailability(req, res) {
    try {
      const userId = req.user._id;

      const availability = await CoachAvailability.findOne({ coachId: userId });

      if (!availability) {
        return res.status(404).json({
          success: false,
          message: 'Availability not found',
          code: 'AVAILABILITY_NOT_FOUND'
        });
      }

      res.status(200).json({
        success: true,
        availability
      });

    } catch (error) {
      console.error('Get availability error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch availability',
        code: 'FETCH_AVAILABILITY_FAILED'
      });
    }
  }

  /**
   * Update weekly schedule
   * PUT /coaches/availability/schedule
   */
  async updateWeeklySchedule(req, res) {
    try {
      const userId = req.user._id;
      const { weeklySchedule } = req.body;

      if (!weeklySchedule || !Array.isArray(weeklySchedule)) {
        return res.status(400).json({
          success: false,
          message: 'Weekly schedule is required',
          code: 'INVALID_SCHEDULE'
        });
      }

      const availability = await CoachAvailability.findOne({ coachId: userId });

      if (!availability) {
        return res.status(404).json({
          success: false,
          message: 'Availability not found',
          code: 'AVAILABILITY_NOT_FOUND'
        });
      }

      availability.weeklySchedule = weeklySchedule;
      await availability.save();

      res.status(200).json({
        success: true,
        message: 'Weekly schedule updated successfully',
        availability
      });

    } catch (error) {
      console.error('Update weekly schedule error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update schedule',
        code: 'UPDATE_SCHEDULE_FAILED'
      });
    }
  }

  /**
   * Block a date (vacation, personal)
   * POST /coaches/availability/block-date
   */
  async blockDate(req, res) {
    try {
      const userId = req.user._id;
      const { date, reason, reasonAr } = req.body;

      if (!date) {
        return res.status(400).json({
          success: false,
          message: 'Date is required',
          code: 'MISSING_DATE'
        });
      }

      const availability = await CoachAvailability.findOne({ coachId: userId });

      if (!availability) {
        return res.status(404).json({
          success: false,
          message: 'Availability not found',
          code: 'AVAILABILITY_NOT_FOUND'
        });
      }

      await availability.blockDate(new Date(date), reason, reasonAr);

      res.status(200).json({
        success: true,
        message: 'Date blocked successfully',
        availability
      });

    } catch (error) {
      console.error('Block date error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to block date',
        code: 'BLOCK_DATE_FAILED'
      });
    }
  }

  /**
   * Unblock a date
   * POST /coaches/availability/unblock-date
   */
  async unblockDate(req, res) {
    try {
      const userId = req.user._id;
      const { date } = req.body;

      if (!date) {
        return res.status(400).json({
          success: false,
          message: 'Date is required',
          code: 'MISSING_DATE'
        });
      }

      const availability = await CoachAvailability.findOne({ coachId: userId });

      if (!availability) {
        return res.status(404).json({
          success: false,
          message: 'Availability not found',
          code: 'AVAILABILITY_NOT_FOUND'
        });
      }

      await availability.unblockDate(new Date(date));

      res.status(200).json({
        success: true,
        message: 'Date unblocked successfully',
        availability
      });

    } catch (error) {
      console.error('Unblock date error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unblock date',
        code: 'UNBLOCK_DATE_FAILED'
      });
    }
  }

  /**
   * Get available slots for a specific date
   * GET /coaches/availability/slots/:date
   */
  async getAvailableSlots(req, res) {
    try {
      const { coachId } = req.query;
      const { date } = req.params;

      if (!coachId) {
        return res.status(400).json({
          success: false,
          message: 'Coach ID is required',
          code: 'MISSING_COACH_ID'
        });
      }

      const availability = await CoachAvailability.findOne({ coachId });

      if (!availability) {
        return res.status(404).json({
          success: false,
          message: 'Availability not found',
          code: 'AVAILABILITY_NOT_FOUND'
        });
      }

      const slots = availability.getAvailableSlotsForDate(new Date(date));

      res.status(200).json({
        success: true,
        date,
        availableSlots: slots
      });

    } catch (error) {
      console.error('Get available slots error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch available slots',
        code: 'FETCH_SLOTS_FAILED'
      });
    }
  }

  /**
   * Update booking settings
   * PUT /coaches/availability/settings
   */
  async updateBookingSettings(req, res) {
    try {
      const userId = req.user._id;

      const availability = await CoachAvailability.findOne({ coachId: userId });

      if (!availability) {
        return res.status(404).json({
          success: false,
          message: 'Availability not found',
          code: 'AVAILABILITY_NOT_FOUND'
        });
      }

      const allowedSettings = [
        'minimumNotice', 'maximumAdvance', 'sessionDurations', 'defaultDuration',
        'breakBetweenSessions', 'maxSessionsPerDay', 'allowBackToBack'
      ];

      Object.keys(req.body).forEach(key => {
        if (allowedSettings.includes(key)) {
          availability.bookingSettings[key] = req.body[key];
        }
      });

      await availability.save();

      res.status(200).json({
        success: true,
        message: 'Booking settings updated successfully',
        bookingSettings: availability.bookingSettings
      });

    } catch (error) {
      console.error('Update booking settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update booking settings',
        code: 'UPDATE_SETTINGS_FAILED'
      });
    }
  }

  /**
   * Update cancellation policy
   * PUT /coaches/availability/cancellation-policy
   */
  async updateCancellationPolicy(req, res) {
    try {
      const userId = req.user._id;

      const availability = await CoachAvailability.findOne({ coachId: userId });

      if (!availability) {
        return res.status(404).json({
          success: false,
          message: 'Availability not found',
          code: 'AVAILABILITY_NOT_FOUND'
        });
      }

      const allowedFields = [
        'allowCancellation', 'minimumNoticePeriod', 'chargeCancellationFee',
        'cancellationFeePercentage', 'policyText', 'policyTextAr'
      ];

      Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
          availability.cancellationPolicy[key] = req.body[key];
        }
      });

      await availability.save();

      res.status(200).json({
        success: true,
        message: 'Cancellation policy updated successfully',
        cancellationPolicy: availability.cancellationPolicy
      });

    } catch (error) {
      console.error('Update cancellation policy error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update cancellation policy',
        code: 'UPDATE_POLICY_FAILED'
      });
    }
  }

  // ==================== DASHBOARD & STATISTICS ====================

  /**
   * Get dashboard stats
   * GET /coaches/dashboard/stats
   */
  async getDashboardStats(req, res) {
    try {
      const userId = req.user._id;

      const profile = await CoachProfile.findOne({ userId });

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Coach profile not found',
          code: 'PROFILE_NOT_FOUND'
        });
      }

      // Get students who joined this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const newThisMonth = await CoachStudent.countDocuments({
        coachId: userId,
        joinedDate: { $gte: startOfMonth },
        isDeleted: false
      });

      // Calculate completion rate
      const completionRate = profile.sessionStats.totalSessions > 0
        ? Math.round((profile.sessionStats.completedSessions / profile.sessionStats.totalSessions) * 100)
        : 0;

      // Get availability info
      const availability = await CoachAvailability.findOne({ coachId: userId });
      let availabilityStats = {
        nextAvailableSlot: null,
        totalWeeklySlots: 0,
        bookedSlotsThisWeek: 0
      };

      if (availability) {
        // Calculate total weekly slots
        availability.weeklySchedule.forEach(day => {
          if (day.isAvailable) {
            availabilityStats.totalWeeklySlots += day.slots.length;
          }
        });

        // Find next available slot (simplified - just get the next available day)
        const today = new Date().getDay();
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        for (let i = 0; i < 7; i++) {
          const dayIndex = (today + i) % 7;
          const dayName = daysOfWeek[dayIndex];
          const daySchedule = availability.weeklySchedule.find(d => d.day === dayName);

          if (daySchedule && daySchedule.isAvailable && daySchedule.slots.length > 0) {
            // Found next available day with slots
            const nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + i);
            nextDate.setHours(
              parseInt(daySchedule.slots[0].startTime.split(':')[0]),
              parseInt(daySchedule.slots[0].startTime.split(':')[1]),
              0,
              0
            );
            availabilityStats.nextAvailableSlot = nextDate;
            break;
          }
        }

        // Get booked slots this week
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 7);

        availabilityStats.bookedSlotsThisWeek = await TrainingSession.countDocuments({
          coachId: userId,
          date: { $gte: startOfWeek, $lt: endOfWeek },
          status: { $in: ['upcoming', 'completed'] },
          isDeleted: false
        });
      }

      // Get recent activity (last 5 sessions)
      const recentSessions = await TrainingSession.find({
        coachId: userId,
        isDeleted: false
      })
      .populate('studentId', 'firstName lastName avatar')
      .sort({ date: -1 })
      .limit(5)
      .select('date duration status studentId');

      const recentActivity = recentSessions.map(session => ({
        type: 'session',
        action: session.status,
        date: session.date,
        student: session.studentId ? {
          firstName: session.studentId.firstName,
          lastName: session.studentId.lastName,
          avatar: session.studentId.avatar
        } : null,
        duration: session.duration
      }));

      const stats = {
        profile: {
          completionPercentage: profile.profileCompletionPercentage,
          isVerified: profile.isVerified,
          rating: Math.round(profile.ratingStats.averageRating * 10) / 10,
          totalReviews: profile.ratingStats.totalReviews
        },
        students: {
          total: profile.studentStats.totalStudents,
          active: profile.studentStats.activeStudents,
          former: profile.studentStats.formerStudents,
          newThisMonth
        },
        sessions: {
          total: profile.sessionStats.totalSessions,
          completed: profile.sessionStats.completedSessions,
          upcoming: profile.sessionStats.upcomingSessions,
          cancelled: profile.sessionStats.cancelledSessions,
          completionRate
        },
        availability: availabilityStats,
        recentActivity
      };

      res.status(200).json({
        success: true,
        stats
      });

    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard stats',
        code: 'STATS_FETCH_FAILED'
      });
    }
  }

  // ==================== MEDIA GALLERY ====================

  /**
   * Add photo to gallery
   * POST /coaches/photos
   */
  async addPhoto(req, res) {
    try {
      const userId = req.user._id;
      const { caption, captionAr } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided',
          code: 'NO_FILE'
        });
      }

      const profile = await CoachProfile.findOne({ userId });

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Coach profile not found',
          code: 'PROFILE_NOT_FOUND'
        });
      }

      // Upload to Cloudinary
      const result = await uploadPortfolioImage(
        req.file.buffer,
        userId,
        'coach',
        'photo'
      );

      // Add photo to profile
      profile.photos.push({
        url: result.url,
        publicId: result.publicId,
        thumbnailUrl: result.thumbnailUrl,
        mediumUrl: result.mediumUrl,
        largeUrl: result.largeUrl,
        caption,
        captionAr,
        uploadedAt: new Date()
      });

      await profile.save();

      res.status(200).json({
        success: true,
        message: 'Photo added successfully',
        photo: {
          url: result.url,
          publicId: result.publicId,
          thumbnailUrl: result.thumbnailUrl,
          mediumUrl: result.mediumUrl,
          largeUrl: result.largeUrl,
          caption,
          captionAr
        },
        totalPhotos: profile.photos.length
      });

    } catch (error) {
      console.error('Add photo error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add photo',
        code: 'ADD_PHOTO_FAILED'
      });
    }
  }

  /**
   * Remove photo from gallery
   * DELETE /coaches/photos/:photoId
   */
  async removePhoto(req, res) {
    try {
      const userId = req.user._id;
      const { photoId } = req.params;

      const profile = await CoachProfile.findOne({ userId });

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Coach profile not found',
          code: 'PROFILE_NOT_FOUND'
        });
      }

      // Find the photo to get its URL for Cloudinary deletion
      const photoToRemove = profile.photos.find(photo => photo._id.toString() === photoId);

      if (!photoToRemove) {
        return res.status(404).json({
          success: false,
          message: 'Photo not found',
          code: 'PHOTO_NOT_FOUND'
        });
      }

      // Delete from Cloudinary
      if (photoToRemove.url) {
        const publicId = extractPublicId(photoToRemove.url);
        if (publicId) {
          await deleteFromCloudinary(publicId);
        }
      }

      // Remove from profile
      profile.photos = profile.photos.filter(photo => photo._id.toString() !== photoId);
      await profile.save();

      res.status(200).json({
        success: true,
        message: 'Photo removed successfully',
        totalPhotos: profile.photos.length
      });

    } catch (error) {
      console.error('Remove photo error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove photo',
        code: 'REMOVE_PHOTO_FAILED'
      });
    }
  }

  /**
   * Add video to gallery
   * POST /coaches/videos
   */
  async addVideo(req, res) {
    try {
      const userId = req.user._id;
      const { url, thumbnail, title, titleAr, description, descriptionAr, duration } = req.body;

      if (!url) {
        return res.status(400).json({
          success: false,
          message: 'Video URL is required',
          code: 'MISSING_URL'
        });
      }

      const profile = await CoachProfile.findOne({ userId });

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Coach profile not found',
          code: 'PROFILE_NOT_FOUND'
        });
      }

      profile.videos.push({
        url,
        thumbnail,
        title,
        titleAr,
        description,
        descriptionAr,
        duration,
        uploadedAt: new Date()
      });

      await profile.save();

      res.status(200).json({
        success: true,
        message: 'Video added successfully',
        videos: profile.videos
      });

    } catch (error) {
      console.error('Add video error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add video',
        code: 'ADD_VIDEO_FAILED'
      });
    }
  }

  /**
   * Remove video from gallery
   * DELETE /coaches/videos/:videoId
   */
  async removeVideo(req, res) {
    try {
      const userId = req.user._id;
      const { videoId } = req.params;

      const profile = await CoachProfile.findOne({ userId });

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Coach profile not found',
          code: 'PROFILE_NOT_FOUND'
        });
      }

      profile.videos = profile.videos.filter(video => video._id.toString() !== videoId);
      await profile.save();

      res.status(200).json({
        success: true,
        message: 'Video removed successfully',
        videos: profile.videos
      });

    } catch (error) {
      console.error('Remove video error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove video',
        code: 'REMOVE_VIDEO_FAILED'
      });
    }
  }

  // ==================== PRIVACY SETTINGS ====================

  /**
   * Update privacy settings
   * PUT /coaches/privacy
   */
  async updatePrivacySettings(req, res) {
    try {
      const userId = req.user._id;
      const {
        showContact,
        showLocation,
        showPricing,
        showEarnings,
        showStudentCount,
        profileVisibility
      } = req.body;

      const profile = await CoachProfile.findOne({ userId });

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Coach profile not found',
          code: 'PROFILE_NOT_FOUND'
        });
      }

      if (showContact !== undefined) profile.privacy.showContact = showContact;
      if (showLocation !== undefined) profile.privacy.showLocation = showLocation;
      if (showPricing !== undefined) profile.privacy.showPricing = showPricing;
      if (showEarnings !== undefined) profile.privacy.showEarnings = showEarnings;
      if (showStudentCount !== undefined) profile.privacy.showStudentCount = showStudentCount;
      if (profileVisibility) profile.privacy.profileVisibility = profileVisibility;

      await profile.save();

      res.status(200).json({
        success: true,
        message: 'Privacy settings updated successfully',
        privacy: profile.privacy
      });

    } catch (error) {
      console.error('Update privacy settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update privacy settings',
        code: 'UPDATE_PRIVACY_FAILED'
      });
    }
  }

  // ==================== STUDENTS MANAGEMENT ====================

  /**
   * Add a new student
   * POST /coaches/students
   */
  async addStudent(req, res) {
    try {
      const userId = req.user._id;
      const { email, sport, position, level, notes, goals } = req.body;

      // Validate required fields
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Student email is required',
          code: 'MISSING_EMAIL'
        });
      }

      // Find student user by email
      const studentUser = await User.findOne({ email: email.toLowerCase() });
      if (!studentUser) {
        return res.status(404).json({
          success: false,
          message: 'No user found with this email address',
          code: 'USER_NOT_FOUND'
        });
      }

      const studentUserId = studentUser._id;

      // Check if relationship already exists
      const existingRelation = await CoachStudent.findOne({
        coachId: userId,
        studentId: studentUserId,
        isDeleted: false
      });

      if (existingRelation) {
        return res.status(400).json({
          success: false,
          message: 'This student is already added to your students list',
          code: 'STUDENT_ALREADY_EXISTS'
        });
      }

      // Create coach-student relationship using getOrCreate
      // This will automatically link to PlayerProfile if it exists
      const studentData = {
        sport,
        position,
        level,
        notes,
        goals: goals || []
      };

      const relationship = await CoachStudent.getOrCreate(
        userId,
        studentUserId,
        studentData
      );

      // Populate the relationship with user data
      await relationship.populate({
        path: 'studentId',
        select: 'firstName lastName email phone avatar dateOfBirth'
      });

      await relationship.populate({
        path: 'playerProfileId',
        select: 'primarySport position level yearsOfExperience'
      });

      // Format response
      const sportInfo = relationship.playerProfileId ? {
        sport: relationship.playerProfileId.primarySport,
        position: relationship.playerProfileId.position,
        level: relationship.playerProfileId.level,
        yearsOfExperience: relationship.playerProfileId.yearsOfExperience,
        hasPlayerProfile: true,
        playerProfileId: relationship.playerProfileId._id
      } : {
        sport: relationship.sport,
        position: relationship.position,
        level: relationship.level,
        hasPlayerProfile: false
      };

      res.status(201).json({
        success: true,
        message: 'Student added successfully',
        student: {
          _id: relationship._id,
          userId: relationship.studentId,
          status: relationship.status,
          ...sportInfo,
          joinedDate: relationship.joinedDate,
          totalSessions: relationship.sessionStats.totalSessions,
          completedSessions: relationship.sessionStats.completedSessions,
          upcomingSessions: relationship.sessionStats.upcomingSessions,
          cancelledSessions: relationship.sessionStats.cancelledSessions,
          rating: relationship.rating,
          lastSessionDate: relationship.lastSessionDate,
          totalPaid: relationship.totalPaid,
          currency: relationship.currency,
          notes: relationship.notes,
          goals: relationship.goals
        }
      });

    } catch (error) {
      console.error('Add student error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add student',
        code: 'ADD_STUDENT_FAILED'
      });
    }
  }

  /**
   * Get coach's students list
   * GET /coaches/students
   */
  async getStudentsList(req, res) {
    try {
      const userId = req.user._id;
      const {
        status,
        search,
        page = 1,
        limit = 20
      } = req.query;

      // Build query
      const query = {
        coachId: userId,
        isDeleted: false
      };

      if (status && status !== 'all') {
        query.status = status;
      }

      // Execute query with pagination
      const skip = (Number(page) - 1) * Number(limit);

      let students = await CoachStudent.find(query)
        .populate({
          path: 'studentId',
          select: 'firstName lastName email phone avatar dateOfBirth'
        })
        .populate({
          path: 'playerProfileId',
          select: 'primarySport position level yearsOfExperience'
        })
        .sort({ joinedDate: -1 })
        .limit(Number(limit))
        .skip(skip);

      // Apply search filter if provided (after population)
      if (search) {
        students = students.filter(student => {
          const fullName = `${student.studentId?.firstName || ''} ${student.studentId?.lastName || ''}`.toLowerCase();
          return fullName.includes(search.toLowerCase());
        });
      }

      // Get total count for pagination
      const total = await CoachStudent.countDocuments(query);

      // Get stats
      const activeCount = await CoachStudent.countDocuments({ coachId: userId, status: 'active', isDeleted: false });
      const formerCount = await CoachStudent.countDocuments({ coachId: userId, status: 'former', isDeleted: false });

      // Format response
      const formattedStudents = students.map(student => {
        // Use PlayerProfile data if linked, otherwise use local fields
        const sportInfo = student.playerProfileId ? {
          sport: student.playerProfileId.primarySport,
          position: student.playerProfileId.position,
          level: student.playerProfileId.level,
          yearsOfExperience: student.playerProfileId.yearsOfExperience,
          hasPlayerProfile: true
        } : {
          sport: student.sport,
          position: student.position,
          level: student.level,
          hasPlayerProfile: false
        };

        return {
          _id: student._id,
          userId: student.studentId,
          status: student.status,
          ...sportInfo,
          joinedDate: student.joinedDate,
          totalSessions: student.sessionStats.totalSessions,
          completedSessions: student.sessionStats.completedSessions,
          upcomingSessions: student.sessionStats.upcomingSessions,
          cancelledSessions: student.sessionStats.cancelledSessions,
          rating: student.rating,
          lastSessionDate: student.lastSessionDate,
          totalPaid: student.totalPaid,
          currency: student.currency
        };
      });

      res.status(200).json({
        success: true,
        students: formattedStudents,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalStudents: total,
          hasMore: Number(page) < Math.ceil(total / Number(limit))
        },
        stats: {
          total,
          active: activeCount,
          former: formerCount
        }
      });

    } catch (error) {
      console.error('Get students list error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch students list',
        code: 'FETCH_STUDENTS_FAILED'
      });
    }
  }

  /**
   * Get single student details
   * GET /coaches/students/:studentId
   */
  async getSingleStudent(req, res) {
    try {
      const userId = req.user._id;
      const { studentId } = req.params;

      const studentRelation = await CoachStudent.findOne({
        coachId: userId,
        _id: studentId,
        isDeleted: false
      })
      .populate({
        path: 'studentId',
        select: 'firstName lastName email phone avatar dateOfBirth'
      })
      .populate({
        path: 'playerProfileId',
        select: 'primarySport position level yearsOfExperience currentClub previousClubs achievements statistics'
      });

      if (!studentRelation) {
        return res.status(404).json({
          success: false,
          message: 'Student not found',
          code: 'STUDENT_NOT_FOUND'
        });
      }

      // Get recent sessions
      const recentSessions = await TrainingSession.find({
        coachId: userId,
        studentId: studentRelation.studentId._id,
        isDeleted: false
      })
      .sort({ date: -1 })
      .limit(5)
      .select('_id date duration status rating');

      // Use PlayerProfile data if linked, otherwise use local fields
      const sportInfo = studentRelation.playerProfileId ? {
        sport: studentRelation.playerProfileId.primarySport,
        position: studentRelation.playerProfileId.position,
        level: studentRelation.playerProfileId.level,
        yearsOfExperience: studentRelation.playerProfileId.yearsOfExperience,
        currentClub: studentRelation.playerProfileId.currentClub,
        previousClubs: studentRelation.playerProfileId.previousClubs,
        achievements: studentRelation.playerProfileId.achievements,
        statistics: studentRelation.playerProfileId.statistics,
        hasPlayerProfile: true,
        playerProfileId: studentRelation.playerProfileId._id
      } : {
        sport: studentRelation.sport,
        position: studentRelation.position,
        level: studentRelation.level,
        hasPlayerProfile: false
      };

      res.status(200).json({
        success: true,
        student: {
          _id: studentRelation._id,
          userId: studentRelation.studentId,
          status: studentRelation.status,
          ...sportInfo,
          joinedDate: studentRelation.joinedDate,
          totalSessions: studentRelation.sessionStats.totalSessions,
          completedSessions: studentRelation.sessionStats.completedSessions,
          upcomingSessions: studentRelation.sessionStats.upcomingSessions,
          cancelledSessions: studentRelation.sessionStats.cancelledSessions,
          rating: studentRelation.rating,
          lastSessionDate: studentRelation.lastSessionDate,
          totalPaid: studentRelation.totalPaid,
          currency: studentRelation.currency,
          notes: studentRelation.notes,
          goals: studentRelation.goals,
          achievements: studentRelation.achievements,
          overallProgress: studentRelation.overallProgress,
          strengths: studentRelation.strengths,
          areasForImprovement: studentRelation.areasForImprovement
        },
        recentSessions
      });

    } catch (error) {
      console.error('Get single student error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch student details',
        code: 'FETCH_STUDENT_FAILED'
      });
    }
  }

  // ==================== SESSIONS MANAGEMENT ====================

  /**
   * Get coach's sessions list
   * GET /coaches/sessions
   */
  async getSessionsList(req, res) {
    try {
      const userId = req.user._id;
      const {
        status,
        search,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = req.query;

      // Build query
      const query = {
        coachId: userId,
        isDeleted: false
      };

      if (status && status !== 'all') {
        query.status = status;
      }

      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      }

      // Execute query with pagination
      const skip = (Number(page) - 1) * Number(limit);

      let sessions = await TrainingSession.find(query)
        .populate({
          path: 'studentId',
          select: 'firstName lastName avatar'
        })
        .sort({ date: -1 })
        .limit(Number(limit))
        .skip(skip);

      // Apply search filter if provided (after population)
      if (search) {
        sessions = sessions.filter(session => {
          const fullName = `${session.studentId?.firstName || ''} ${session.studentId?.lastName || ''}`.toLowerCase();
          return fullName.includes(search.toLowerCase());
        });
      }

      // Get total count for pagination
      const total = await TrainingSession.countDocuments(query);

      // Get stats
      const upcomingCount = await TrainingSession.countDocuments({ coachId: userId, status: 'upcoming', isDeleted: false });
      const completedCount = await TrainingSession.countDocuments({ coachId: userId, status: 'completed', isDeleted: false });
      const cancelledCount = await TrainingSession.countDocuments({ coachId: userId, status: 'cancelled', isDeleted: false });

      // Format response
      const formattedSessions = sessions.map(session => {
        // Find student relation to get student info
        const studentInfo = {
          _id: session.studentId?._id,
          firstName: session.studentId?.firstName,
          lastName: session.studentId?.lastName,
          avatar: session.studentId?.avatar
        };

        return {
          _id: session._id,
          student: {
            _id: session.studentId?._id,
            userId: studentInfo
          },
          date: session.date,
          duration: session.duration,
          type: session.type,
          location: session.location,
          status: session.status,
          price: session.price,
          currency: session.currency,
          notes: session.notes,
          createdAt: session.createdAt
        };
      });

      res.status(200).json({
        success: true,
        sessions: formattedSessions,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalSessions: total,
          hasMore: Number(page) < Math.ceil(total / Number(limit))
        },
        stats: {
          total,
          upcoming: upcomingCount,
          completed: completedCount,
          cancelled: cancelledCount
        }
      });

    } catch (error) {
      console.error('Get sessions list error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sessions list',
        code: 'FETCH_SESSIONS_FAILED'
      });
    }
  }

  /**
   * Get single session details
   * GET /coaches/sessions/:sessionId
   */
  async getSingleSession(req, res) {
    try {
      const userId = req.user._id;
      const { sessionId } = req.params;

      const session = await TrainingSession.findOne({
        _id: sessionId,
        coachId: userId,
        isDeleted: false
      })
      .populate({
        path: 'studentId',
        select: 'firstName lastName email phone avatar dateOfBirth'
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found',
          code: 'SESSION_NOT_FOUND'
        });
      }

      // Get student relation for additional info
      const studentRelation = await CoachStudent.findOne({
        coachId: userId,
        studentId: session.studentId._id,
        isDeleted: false
      });

      res.status(200).json({
        success: true,
        session: {
          _id: session._id,
          student: {
            _id: studentRelation?._id,
            userId: session.studentId,
            sport: studentRelation?.sport,
            level: studentRelation?.level
          },
          date: session.date,
          duration: session.duration,
          type: session.type,
          location: session.location,
          status: session.status,
          price: session.price,
          currency: session.currency,
          notes: session.notes,
          coachNotes: session.coachNotes,
          sessionGoals: session.sessionGoals,
          exercisesPerformed: session.exercisesPerformed,
          skillsPracticed: session.skillsPracticed,
          performance: session.performance,
          progress: session.progress,
          homework: session.homework,
          rating: session.rating,
          review: session.rating?.feedback,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt
        }
      });

    } catch (error) {
      console.error('Get single session error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch session details',
        code: 'FETCH_SESSION_FAILED'
      });
    }
  }

  /**
   * Update session status
   * PATCH /coaches/sessions/:sessionId/status
   */
  async updateSessionStatus(req, res) {
    try {
      const userId = req.user._id;
      const { sessionId } = req.params;
      const { status, coachNotes, cancellationReason, performance, progress } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required',
          code: 'MISSING_STATUS'
        });
      }

      const session = await TrainingSession.findOne({
        _id: sessionId,
        coachId: userId,
        isDeleted: false
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found',
          code: 'SESSION_NOT_FOUND'
        });
      }

      // Update based on status
      if (status === 'completed') {
        session.complete(coachNotes, performance, progress);
      } else if (status === 'cancelled') {
        if (!cancellationReason) {
          return res.status(400).json({
            success: false,
            message: 'Cancellation reason is required',
            code: 'MISSING_CANCELLATION_REASON'
          });
        }
        session.cancel(userId, cancellationReason);
      } else if (status === 'no_show') {
        session.markNoShow();
      } else {
        session.status = status;
      }

      if (coachNotes) {
        session.coachNotes = coachNotes;
      }

      await session.save();

      // Update student stats
      const studentRelation = await CoachStudent.findOne({
        coachId: userId,
        studentId: session.studentId,
        isDeleted: false
      });

      if (studentRelation) {
        await studentRelation.updateSessionStats();
        await studentRelation.save();
      }

      res.status(200).json({
        success: true,
        message: 'Session status updated successfully',
        session: {
          _id: session._id,
          status: session.status,
          coachNotes: session.coachNotes
        }
      });

    } catch (error) {
      console.error('Update session status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update session status',
        code: 'UPDATE_SESSION_FAILED'
      });
    }
  }

  // ==================== IMAGE UPLOADS ====================

  /**
   * Upload/Update avatar
   * POST /coaches/profile/avatar
   */
  async uploadProfileAvatar(req, res) {
    try {
      const userId = req.user._id;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided',
          code: 'NO_FILE'
        });
      }

      const profile = await CoachProfile.findOne({ userId });

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Coach profile not found',
          code: 'PROFILE_NOT_FOUND'
        });
      }

      // Upload to Cloudinary
      const result = await uploadAvatar(req.file.buffer, userId, 'coach');

      // Clean up old avatar if exists
      if (profile.avatar) {
        await cleanupOldImage(profile.avatar);
      }

      // Update profile with new avatar URL
      profile.avatar = result.url;
      await profile.save();

      res.status(200).json({
        success: true,
        message: 'Avatar uploaded successfully',
        avatar: {
          url: result.url,
          thumbnailUrl: result.thumbnailUrl,
          mediumUrl: result.mediumUrl,
          largeUrl: result.largeUrl
        }
      });

    } catch (error) {
      console.error('Upload avatar error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload avatar',
        code: 'UPLOAD_AVATAR_FAILED'
      });
    }
  }

  /**
   * Upload/Update banner image
   * POST /coaches/profile/banner
   */
  async uploadProfileBanner(req, res) {
    try {
      const userId = req.user._id;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided',
          code: 'NO_FILE'
        });
      }

      const profile = await CoachProfile.findOne({ userId });

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Coach profile not found',
          code: 'PROFILE_NOT_FOUND'
        });
      }

      // Upload banner to Cloudinary with specific transformations
      const options = {
        folder: `sportx-platform/banners/coach`,
        public_id: `banner_${userId}_${Date.now()}`,
        transformation: [
          {
            width: 1500,
            height: 500,
            crop: 'fill',
            quality: 'auto',
            fetch_format: 'auto'
          }
        ],
        eager: [
          { width: 800, height: 267, crop: 'fill' },  // Small
          { width: 1200, height: 400, crop: 'fill' }, // Medium
          { width: 1500, height: 500, crop: 'fill' }  // Large
        ],
        eager_async: true,
        tags: ['banner', 'coach', 'profile']
      };

      const result = await uploadToCloudinary(req.file.buffer, options);

      // Clean up old banner if exists
      if (profile.bannerImage) {
        await cleanupOldImage(profile.bannerImage);
      }

      // Update profile with new banner URL
      profile.bannerImage = result.secure_url;
      await profile.save();

      res.status(200).json({
        success: true,
        message: 'Banner uploaded successfully',
        banner: {
          url: result.secure_url,
          smallUrl: result.eager?.[0]?.secure_url || result.secure_url,
          mediumUrl: result.eager?.[1]?.secure_url || result.secure_url,
          largeUrl: result.eager?.[2]?.secure_url || result.secure_url
        }
      });

    } catch (error) {
      console.error('Upload banner error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload banner',
        code: 'UPLOAD_BANNER_FAILED'
      });
    }
  }
}

module.exports = new CoachController();
