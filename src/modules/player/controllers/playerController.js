const PlayerProfile = require('../models/PlayerProfile');
const User = require('../../shared/models/User');
const { uploadAvatar, uploadPortfolioImage, cleanupOldImage, extractPublicId, deleteFromCloudinary } = require('../../../config/cloudinary');

class PlayerController {

  // Create player profile (called after registration)
  async createProfile(req, res) {
    try {
      const userId = req.user._id;

      // Check if profile already exists
      const existingProfile = await PlayerProfile.findOne({ userId });
      if (existingProfile) {
        return res.status(400).json({
          success: false,
          message: 'Player profile already exists',
          code: 'PROFILE_EXISTS'
        });
      }

      // Create new profile
      const profileData = {
        userId,
        ...req.body
      };

      const playerProfile = new PlayerProfile(profileData);
      await playerProfile.save();

      res.status(201).json({
        success: true,
        message: 'Player profile created successfully',
        profile: playerProfile
      });

    } catch (error) {
      console.error('Create player profile error:', error);

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
        message: 'Failed to create player profile',
        code: 'CREATE_PROFILE_FAILED'
      });
    }
  }

  // Get own profile (authenticated user)
  async getMyProfile(req, res) {
    try {
      const userId = req.user._id;

      const profile = await PlayerProfile.findOne({ userId })
        .populate('userId', 'firstName lastName email phone avatar isVerified')
        .populate('currentClub.clubId', 'organizationName logo location');

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Player profile not found',
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

  // Get player profile by ID (public view)
  async getProfileById(req, res) {
    try {
      const { id } = req.params;

      const profile = await PlayerProfile.findById(id)
        .populate('userId', 'firstName lastName avatar isVerified')
        .populate('currentClub.clubId', 'organizationName logo location');

      if (!profile || profile.isDeleted) {
        return res.status(404).json({
          success: false,
          message: 'Player profile not found',
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

  // Update player profile
  async updateProfile(req, res) {
    try {
      const userId = req.user._id;

      const profile = await PlayerProfile.findOne({ userId });

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Player profile not found',
          code: 'PROFILE_NOT_FOUND'
        });
      }

      // Update fields
      const allowedUpdates = [
        'bio', 'bioAr', 'birthDate', 'nationality', 'languages',
        'location', 'socialMedia', 'primarySport', 'additionalSports',
        'position', 'positionAr', 'preferredFoot', 'height', 'weight',
        'level', 'yearsOfExperience', 'currentClub', 'previousClubs',
        'achievements', 'certificates', 'statistics', 'status',
        'availableForTraining', 'trainingAvailability', 'openToRelocation',
        'salaryExpectations', 'goals', 'goalsAr', 'avatar', 'bannerImage',
        'photos', 'videos', 'highlightVideoUrl', 'privacy'
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

  // Delete player profile (soft delete)
  async deleteProfile(req, res) {
    try {
      const userId = req.user._id;

      const profile = await PlayerProfile.findOne({ userId });

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Player profile not found',
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

  // Search players (for coaches/clubs to find players)
  async searchPlayers(req, res) {
    try {
      const {
        sport,
        position,
        level,
        city,
        country,
        status,
        minAge,
        maxAge,
        openToRelocation,
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

      if (position) {
        query.position = new RegExp(position, 'i');
      }

      if (level) {
        query.level = level;
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

      if (openToRelocation === 'true') {
        query.openToRelocation = true;
      }

      // Age filtering (requires calculation, so we'll filter after query)
      let players = await PlayerProfile.find(query)
        .populate('userId', 'firstName lastName avatar isVerified')
        .populate('currentClub.clubId', 'organizationName logo')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .limit(Number(limit) * Number(page))
        .skip((Number(page) - 1) * Number(limit));

      // Filter by age if specified
      if (minAge || maxAge) {
        players = players.filter(player => {
          const age = player.age;
          if (!age) return false;
          if (minAge && age < minAge) return false;
          if (maxAge && age > maxAge) return false;
          return true;
        });
      }

      const total = await PlayerProfile.countDocuments(query);

      res.status(200).json({
        success: true,
        players: players.map(p => p.getPublicProfile()),
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit)
        }
      });

    } catch (error) {
      console.error('Search players error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search players',
        code: 'SEARCH_FAILED'
      });
    }
  }

  // Get nearby players (proximity search)
  async getNearbyPlayers(req, res) {
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
        query.level = level;
      }

      const players = await PlayerProfile.find(query)
        .populate('userId', 'firstName lastName avatar isVerified')
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

      const total = await PlayerProfile.countDocuments(query);

      res.status(200).json({
        success: true,
        players: players.map(p => p.getPublicProfile()),
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit)
        }
      });

    } catch (error) {
      console.error('Get nearby players error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch nearby players',
        code: 'NEARBY_SEARCH_FAILED'
      });
    }
  }

  // Get player dashboard stats
  async getDashboardStats(req, res) {
    try {
      const userId = req.user._id;

      const profile = await PlayerProfile.findOne({ userId });

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Player profile not found',
          code: 'PROFILE_NOT_FOUND'
        });
      }

      // Get related data counts (will be implemented when those models exist)
      const stats = {
        profileCompletion: profile.profileCompletionPercentage,
        profileViews: profile.profileViews,
        totalSessions: profile.trainingStats.totalSessions,
        completedSessions: profile.trainingStats.completedSessions,
        averageRating: profile.ratingStats.averageRating,
        totalReviews: profile.ratingStats.totalReviews,
        // These will be populated when we implement related models:
        upcomingSessions: 0,
        activeRequests: 0,
        pendingApplications: 0,
        clubMemberships: 0
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

  // Add photo to gallery
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

      const profile = await PlayerProfile.findOne({ userId });

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Player profile not found',
          code: 'PROFILE_NOT_FOUND'
        });
      }

      // Upload to Cloudinary
      const result = await uploadPortfolioImage(
        req.file.buffer,
        userId,
        'player',
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

  // Remove photo from gallery
  async removePhoto(req, res) {
    try {
      const userId = req.user._id;
      const { photoId } = req.params;

      const profile = await PlayerProfile.findOne({ userId });

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Player profile not found',
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

  // Add video to gallery
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

      const profile = await PlayerProfile.findOne({ userId });

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Player profile not found',
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

  // Remove video from gallery
  async removeVideo(req, res) {
    try {
      const userId = req.user._id;
      const { videoId } = req.params;

      const profile = await PlayerProfile.findOne({ userId });

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Player profile not found',
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

  // Update privacy settings
  async updatePrivacySettings(req, res) {
    try {
      const userId = req.user._id;
      const { showContact, showLocation, showSalary, profileVisibility } = req.body;

      const profile = await PlayerProfile.findOne({ userId });

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Player profile not found',
          code: 'PROFILE_NOT_FOUND'
        });
      }

      if (showContact !== undefined) profile.privacy.showContact = showContact;
      if (showLocation !== undefined) profile.privacy.showLocation = showLocation;
      if (showSalary !== undefined) profile.privacy.showSalary = showSalary;
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

  // Upload/Update avatar
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

      const profile = await PlayerProfile.findOne({ userId });

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Player profile not found',
          code: 'PROFILE_NOT_FOUND'
        });
      }

      // Upload to Cloudinary
      const result = await uploadAvatar(req.file.buffer, userId, 'player');

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

  // Upload/Update banner image
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

      const profile = await PlayerProfile.findOne({ userId });

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Player profile not found',
          code: 'PROFILE_NOT_FOUND'
        });
      }

      // Upload banner to Cloudinary with specific transformations
      const { uploadToCloudinary } = require('../../../config/cloudinary');

      const options = {
        folder: `sportx-platform/banners/player`,
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
        tags: ['banner', 'player', 'profile']
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

module.exports = new PlayerController();
