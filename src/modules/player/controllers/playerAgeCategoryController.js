/**
 * Player Age Category Controller
 * Handles all age category related operations for players
 * Integrates Player role with Age Group Supervisor functionality
 */

const { 
  PlayerAgeGroupAssignment, 
  Match, 
  TrainingSession,
  PlayerMatchPerformance,
  AgeCategoryAnnouncement,
  AgeGroup
} = require('../../../models/admin');
const User = require('../../shared/models/User');
const logger = require('../../../utils/logger');

class PlayerAgeCategoryController {
  
  /**
   * Get player's age category and team information
   * GET /api/v1/players/age-category
   */
  async getMyAgeCategory(req, res) {
    try {
      const playerId = req.user._id;
      
      // Get active assignment with populated references
      const assignment = await PlayerAgeGroupAssignment.findOne({
        playerId,
        status: 'active',
        isDeleted: false
      })
        .populate('ageGroupId')
        .populate('teamId')
        .populate('assignedCoachId', 'firstName lastName avatar email phone');
      
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'You are not assigned to any age category yet',
          messageAr: 'لم يتم تعيينك في أي فئة عمرية بعد',
          data: null
        });
      }
      
      // Format response
      const ageCategory = assignment.ageGroupId;
      const response = {
        id: assignment._id,
        ageCategory: {
          id: ageCategory._id,
          name: ageCategory.name,
          nameAr: ageCategory.nameAr,
          ageRange: ageCategory.ageRange,
          sport: ageCategory.sport,
          description: ageCategory.description,
          descriptionAr: ageCategory.descriptionAr
        },
        team: assignment.teamId ? {
          id: assignment.teamId._id,
          name: assignment.teamId.name,
          nameAr: assignment.teamId.nameAr,
          totalPlayers: await PlayerAgeGroupAssignment.countDocuments({
            teamId: assignment.teamId._id,
            status: 'active',
            isDeleted: false
          })
        } : null,
        assignedCoach: assignment.assignedCoachId ? {
          id: assignment.assignedCoachId._id,
          name: `${assignment.assignedCoachId.firstName} ${assignment.assignedCoachId.lastName}`,
          nameAr: assignment.assignedCoachId.firstNameAr 
            ? `${assignment.assignedCoachId.firstNameAr} ${assignment.assignedCoachId.lastNameAr}`
            : null,
          avatar: assignment.assignedCoachId.avatar,
          email: assignment.assignedCoachId.email,
          phone: assignment.assignedCoachId.phone
        } : null,
        position: assignment.position,
        positionAr: assignment.positionAr,
        jerseyNumber: assignment.jerseyNumber,
        joinedAt: assignment.joinedAt,
        status: assignment.status,
        isCaptain: assignment.isCaptain,
        isViceCaptain: assignment.isViceCaptain,
        attendanceRate: assignment.attendanceRate
      };
      
      res.json({
        success: true,
        data: response
      });
      
    } catch (error) {
      logger.error('Get my age category error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch age category information',
        messageAr: 'فشل في جلب معلومات الفئة العمرية',
        error: error.message
      });
    }
  }
  
  /**
   * Get team members (teammates)
   * GET /api/v1/players/team/members
   */
  async getTeamMembers(req, res) {
    try {
      const playerId = req.user._id;
      
      // Get player's assignment
      const myAssignment = await PlayerAgeGroupAssignment.findOne({
        playerId,
        status: 'active',
        isDeleted: false
      });
      
      if (!myAssignment || !myAssignment.teamId) {
        return res.status(404).json({
          success: false,
          message: 'You are not assigned to any team',
          messageAr: 'لم يتم تعيينك في أي فريق',
          data: []
        });
      }
      
      // Get all team members
      const teammates = await PlayerAgeGroupAssignment.find({
        teamId: myAssignment.teamId,
        status: 'active',
        isDeleted: false
      })
        .populate('playerId', 'firstName lastName firstNameAr lastNameAr avatar email')
        .sort({ isCaptain: -1, isViceCaptain: -1, jerseyNumber: 1 });
      
      // Format response
      const members = teammates.map(teammate => ({
        id: teammate._id,
        playerId: teammate.playerId._id,
        name: `${teammate.playerId.firstName} ${teammate.playerId.lastName}`,
        nameAr: teammate.playerId.firstNameAr 
          ? `${teammate.playerId.firstNameAr} ${teammate.playerId.lastNameAr}`
          : null,
        avatar: teammate.playerId.avatar,
        position: teammate.position,
        positionAr: teammate.positionAr,
        jerseyNumber: teammate.jerseyNumber,
        isCaptain: teammate.isCaptain,
        isViceCaptain: teammate.isViceCaptain,
        isMe: teammate.playerId._id.toString() === playerId.toString()
      }));
      
      res.json({
        success: true,
        data: members
      });
      
    } catch (error) {
      logger.error('Get team members error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch team members',
        messageAr: 'فشل في جلب أعضاء الفريق',
        error: error.message
      });
    }
  }
  
  /**
   * Get assigned coach information
   * GET /api/v1/players/coach
   */
  async getMyCoach(req, res) {
    try {
      const playerId = req.user._id;
      
      const assignment = await PlayerAgeGroupAssignment.findOne({
        playerId,
        status: 'active',
        isDeleted: false
      }).populate('assignedCoachId');
      
      if (!assignment || !assignment.assignedCoachId) {
        return res.status(404).json({
          success: false,
          message: 'No coach assigned yet',
          messageAr: 'لم يتم تعيين مدرب بعد',
          data: null
        });
      }
      
      const coach = assignment.assignedCoachId;
      
      // Get coach profile for additional details
      const CoachProfile = require('../../coach/models/CoachProfile');
      const coachProfile = await CoachProfile.findOne({ userId: coach._id });
      
      const response = {
        id: coach._id,
        name: `${coach.firstName} ${coach.lastName}`,
        nameAr: coach.firstNameAr 
          ? `${coach.firstNameAr} ${coach.lastNameAr}`
          : null,
        avatar: coach.avatar,
        email: coach.email,
        phone: coach.phone,
        specialization: coachProfile?.primarySport,
        specializationAr: coachProfile?.specializationsAr?.[0],
        yearsOfExperience: coachProfile?.yearsOfExperience,
        certifications: coachProfile?.certifications?.map(cert => ({
          name: cert.name,
          nameAr: cert.nameAr,
          level: cert.level
        })),
        rating: coachProfile?.ratingStats?.averageRating
      };
      
      res.json({
        success: true,
        data: response
      });
      
    } catch (error) {
      logger.error('Get my coach error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch coach information',
        messageAr: 'فشل في جلب معلومات المدرب',
        error: error.message
      });
    }
  }
  
  /**
   * Get matches for player's age category
   * GET /api/v1/players/matches?status=upcoming|completed|all
   */
  async getAgeCategoryMatches(req, res) {
    try {
      const playerId = req.user._id;
      const { status = 'upcoming' } = req.query;
      
      // Get player's age group
      const assignment = await PlayerAgeGroupAssignment.findOne({
        playerId,
        status: 'active',
        isDeleted: false
      });
      
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'You are not assigned to any age category',
          messageAr: 'لم يتم تعيينك في أي فئة عمرية',
          data: []
        });
      }
      
      // Build match query
      const matchQuery = {
        ageGroupId: assignment.ageGroupId,
        isDeleted: { $ne: true }
      };
      
      if (status === 'upcoming') {
        matchQuery.date = { $gte: new Date() };
        matchQuery.status = { $in: ['scheduled', 'in-progress'] };
      } else if (status === 'completed') {
        matchQuery.status = 'completed';
      }
      // 'all' means no additional filters
      
      // Get matches
      const matches = await Match.find(matchQuery)
        .sort({ date: status === 'upcoming' ? 1 : -1 })
        .limit(20);
      
      // Get player's performance for each match
      const matchIds = matches.map(m => m._id);
      const performances = await PlayerMatchPerformance.find({
        matchId: { $in: matchIds },
        playerId
      });
      
      const performanceMap = {};
      performances.forEach(perf => {
        performanceMap[perf.matchId.toString()] = perf;
      });
      
      // Format response
      const formattedMatches = matches.map(match => {
        const performance = performanceMap[match._id.toString()];
        
        return {
          id: match._id,
          title: `${match.ageGroupName} vs ${match.opponent}`,
          titleAr: match.opponentAr 
            ? `${match.ageGroupName} ضد ${match.opponentAr}`
            : null,
          ageCategory: match.ageGroupName,
          ageCategoryId: match.ageGroupId,
          homeTeam: match.ageGroupName,
          awayTeam: match.opponent,
          awayTeamAr: match.opponentAr,
          opponent: match.opponent,
          opponentAr: match.opponentAr,
          opponentLogo: match.opponentLogo,
          date: match.date,
          time: match.time,
          venue: match.location,
          venueAr: match.locationAr,
          location: match.location,
          locationAr: match.locationAr,
          homeAway: match.homeAway,
          isHomeGame: match.homeAway === 'home',
          type: match.competition || 'friendly',
          status: match.status,
          result: match.result,
          homeScore: match.result?.our,
          awayScore: match.result?.opponent,
          playerStatus: performance?.status || 'not-selected',
          myPerformance: performance ? {
            status: performance.status,
            position: performance.position,
            jerseyNumber: performance.jerseyNumber,
            minutesPlayed: performance.minutesPlayed,
            goals: performance.stats.goals,
            assists: performance.stats.assists,
            rating: performance.rating.average,
            cards: performance.cards
          } : null
        };
      });
      
      res.json({
        success: true,
        data: formattedMatches
      });
      
    } catch (error) {
      logger.error('Get age category matches error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch matches',
        messageAr: 'فشل في جلب المباريات',
        error: error.message
      });
    }
  }
  
  /**
   * Get specific match details with player's status
   * GET /api/v1/players/matches/:id/my-status
   */
  async getMyMatchStatus(req, res) {
    try {
      const playerId = req.user._id;
      const { id: matchId } = req.params;
      
      // Get match
      const match = await Match.findOne({
        _id: matchId,
        isDeleted: { $ne: true }
      });
      
      if (!match) {
        return res.status(404).json({
          success: false,
          message: 'Match not found',
          messageAr: 'المباراة غير موجودة'
        });
      }
      
      // Verify player has access to this match
      const assignment = await PlayerAgeGroupAssignment.findOne({
        playerId,
        ageGroupId: match.ageGroupId,
        status: 'active',
        isDeleted: false
      });
      
      if (!assignment) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this match',
          messageAr: 'ليس لديك صلاحية للوصول لهذه المباراة'
        });
      }
      
      // Get player's performance
      const performance = await PlayerMatchPerformance.findOne({
        matchId,
        playerId
      });
      
      // Get full lineup
      const lineup = await PlayerMatchPerformance.getMatchLineup(matchId);
      
      res.json({
        success: true,
        data: {
          matchDetails: {
            id: match._id,
            opponent: match.opponent,
            opponentAr: match.opponentAr,
            date: match.date,
            time: match.time,
            location: match.location,
            locationAr: match.locationAr,
            homeAway: match.homeAway,
            status: match.status,
            result: match.result
          },
          myStatus: performance ? {
            status: performance.status,
            position: performance.position,
            positionAr: performance.positionAr,
            jerseyNumber: performance.jerseyNumber,
            minutesPlayed: performance.minutesPlayed,
            performance: {
              goals: performance.stats.goals,
              assists: performance.stats.assists,
              shots: performance.stats.shots,
              passes: performance.stats.passes,
              passCompletionPercentage: performance.passCompletionPercentage,
              rating: performance.rating.average
            },
            cards: performance.cards,
            substitution: performance.substitution,
            injury: performance.injury,
            coachNotes: performance.coachNotes,
            coachNotesAr: performance.coachNotesAr
          } : {
            status: 'not-selected'
          },
          lineup: {
            starting: lineup.starting.map(p => ({
              playerId: p.playerId._id,
              name: `${p.playerId.firstName} ${p.playerId.lastName}`,
              position: p.position,
              jerseyNumber: p.jerseyNumber,
              isMe: p.playerId._id.toString() === playerId.toString()
            })),
            substitutes: lineup.substitutes.map(p => ({
              playerId: p.playerId._id,
              name: `${p.playerId.firstName} ${p.playerId.lastName}`,
              position: p.position,
              jerseyNumber: p.jerseyNumber,
              isMe: p.playerId._id.toString() === playerId.toString()
            }))
          }
        }
      });
      
    } catch (error) {
      logger.error('Get my match status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch match status',
        messageAr: 'فشل في جلب حالة المباراة',
        error: error.message
      });
    }
  }
  
  /**
   * Get training sessions for player's age category
   * GET /api/v1/players/training-sessions?limit=10&upcoming=true
   */
  async getTrainingSessions(req, res) {
    try {
      const playerId = req.user._id;
      const { limit = 10, upcoming = 'true' } = req.query;
      
      // Get player's age group
      const assignment = await PlayerAgeGroupAssignment.findOne({
        playerId,
        status: 'active',
        isDeleted: false
      });
      
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'You are not assigned to any age category',
          messageAr: 'لم يتم تعيينك في أي فئة عمرية',
          data: []
        });
      }
      
      // Build query
      const query = {
        ageGroupId: assignment.ageGroupId,
        isDeleted: { $ne: true }
      };
      
      if (upcoming === 'true') {
        query.date = { $gte: new Date() };
        query.status = 'scheduled';
      }
      
      // Get training sessions
      const sessions = await TrainingSession.find(query)
        .populate('coachId', 'firstName lastName avatar')
        .sort({ date: 1, time: 1 })
        .limit(parseInt(limit));
      
      // Format response
      const formattedSessions = sessions.map(session => ({
        id: session._id,
        date: session.date,
        time: session.time,
        duration: session.duration,
        location: session.location,
        locationAr: session.locationAr,
        type: session.type,
        description: session.description,
        descriptionAr: session.descriptionAr,
        coachName: session.coachId 
          ? `${session.coachId.firstName} ${session.coachId.lastName}`
          : session.coachName,
        status: session.status,
        // TODO: Add attendance tracking
        myAttendance: 'pending'
      }));
      
      res.json({
        success: true,
        data: formattedSessions
      });
      
    } catch (error) {
      logger.error('Get training sessions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch training sessions',
        messageAr: 'فشل في جلب جلسات التدريب',
        error: error.message
      });
    }
  }
  
  /**
   * Get training programs
   * GET /api/v1/players/training-programs
   */
  async getTrainingPrograms(req, res) {
    try {
      const playerId = req.user._id;
      
      // Get player's age group
      const assignment = await PlayerAgeGroupAssignment.findOne({
        playerId,
        status: 'active',
        isDeleted: false
      });
      
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'You are not assigned to any age category',
          messageAr: 'لم يتم تعيينك في أي فئة عمرية',
          data: []
        });
      }
      
      // TODO: Get training programs from Program model
      // For now, return empty array
      res.json({
        success: true,
        data: []
      });
      
    } catch (error) {
      logger.error('Get training programs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch training programs',
        messageAr: 'فشل في جلب برامج التدريب',
        error: error.message
      });
    }
  }
  
  /**
   * Get player performance statistics
   * GET /api/v1/players/performance
   */
  async getPerformanceStats(req, res) {
    try {
      const playerId = req.user._id;
      
      // Get player's age group
      const assignment = await PlayerAgeGroupAssignment.findOne({
        playerId,
        status: 'active',
        isDeleted: false
      });
      
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'You are not assigned to any age category',
          messageAr: 'لم يتم تعيينك في أي فئة عمرية',
          data: null
        });
      }
      
      // Get performance stats
      const stats = await PlayerMatchPerformance.getPlayerStats(playerId, {
        ageGroupId: assignment.ageGroupId
      });
      
      // Format response
      const response = {
        id: playerId,
        playerId,
        matchesPlayed: stats.matchesPlayed,
        matchesStarted: stats.matchesStarted,
        totalMinutes: stats.totalMinutes,
        goals: stats.totalGoals,
        assists: stats.totalAssists,
        averageRating: stats.averageRating,
        yellowCards: stats.yellowCards,
        redCards: stats.redCards,
        manOfTheMatchAwards: stats.manOfTheMatchAwards,
        attendanceRate: assignment.attendanceRate,
        trainingSessionsAttended: 0, // TODO: Implement training attendance
        skillLevels: [], // TODO: Implement skill tracking
        recentMatches: stats.performances.slice(0, 5).map(perf => ({
          matchId: perf.matchId._id,
          opponent: perf.matchId.opponent,
          date: perf.matchId.date,
          result: perf.matchId.result,
          myPerformance: {
            minutesPlayed: perf.minutesPlayed,
            goals: perf.stats.goals,
            assists: perf.stats.assists,
            rating: perf.rating.average
          }
        }))
      };
      
      res.json({
        success: true,
        data: response
      });
      
    } catch (error) {
      logger.error('Get performance stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch performance statistics',
        messageAr: 'فشل في جلب إحصائيات الأداء',
        error: error.message
      });
    }
  }
  
  /**
   * Get announcements for player's age category
   * GET /api/v1/players/announcements?unread=true
   */
  async getAnnouncements(req, res) {
    try {
      const playerId = req.user._id;
      const { unread, type, limit = 20 } = req.query;
      
      // Get player's age group
      const assignment = await PlayerAgeGroupAssignment.findOne({
        playerId,
        status: 'active',
        isDeleted: false
      });
      
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'You are not assigned to any age category',
          messageAr: 'لم يتم تعيينك في أي فئة عمرية',
          data: []
        });
      }
      
      // Get announcements
      const announcements = await AgeCategoryAnnouncement.getPlayerAnnouncements(
        playerId,
        assignment.ageGroupId,
        {
          includeRead: unread !== 'true',
          type,
          limit: parseInt(limit)
        }
      );
      
      res.json({
        success: true,
        data: announcements
      });
      
    } catch (error) {
      logger.error('Get announcements error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch announcements',
        messageAr: 'فشل في جلب الإعلانات',
        error: error.message
      });
    }
  }
  
  /**
   * Mark announcement as read
   * POST /api/v1/players/announcements/:id/mark-read
   */
  async markAnnouncementRead(req, res) {
    try {
      const playerId = req.user._id;
      const { id: announcementId } = req.params;
      
      const announcement = await AgeCategoryAnnouncement.findById(announcementId);
      
      if (!announcement) {
        return res.status(404).json({
          success: false,
          message: 'Announcement not found',
          messageAr: 'الإعلان غير موجود'
        });
      }
      
      await announcement.markAsRead(playerId);
      
      res.json({
        success: true,
        message: 'Announcement marked as read',
        messageAr: 'تم تعليم الإعلان كمقروء'
      });
      
    } catch (error) {
      logger.error('Mark announcement read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark announcement as read',
        messageAr: 'فشل في تعليم الإعلان كمقروء',
        error: error.message
      });
    }
  }
  
  /**
   * Acknowledge announcement (for important announcements requiring confirmation)
   * POST /api/v1/players/announcements/:id/acknowledge
   */
  async acknowledgeAnnouncement(req, res) {
    try {
      const playerId = req.user._id;
      const { id: announcementId } = req.params;
      
      const announcement = await AgeCategoryAnnouncement.findById(announcementId);
      
      if (!announcement) {
        return res.status(404).json({
          success: false,
          message: 'Announcement not found',
          messageAr: 'الإعلان غير موجود'
        });
      }
      
      if (!announcement.requireAcknowledgment) {
        return res.status(400).json({
          success: false,
          message: 'This announcement does not require acknowledgment',
          messageAr: 'هذا الإعلان لا يتطلب تأكيد'
        });
      }
      
      await announcement.acknowledge(playerId);
      
      res.json({
        success: true,
        message: 'Announcement acknowledged',
        messageAr: 'تم تأكيد الإعلان'
      });
      
    } catch (error) {
      logger.error('Acknowledge announcement error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to acknowledge announcement',
        messageAr: 'فشل في تأكيد الإعلان',
        error: error.message
      });
    }
  }
  
}

module.exports = new PlayerAgeCategoryController();


