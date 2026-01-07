/**
 * Age Group Supervisor - Player Management Controller
 * Handles player assignment, lineup management, and performance tracking
 */

const { 
  PlayerAgeGroupAssignment, 
  Match,
  PlayerMatchPerformance,
  AgeCategoryAnnouncement,
  AgeGroup
} = require('../models/admin');
const User = require('../modules/shared/models/User');
const PlayerProfile = require('../modules/player/models/PlayerProfile');
const logger = require('../utils/logger');

class AgeGroupSupervisorPlayerManagementController {
  
  /**
   * Assign a player to an age group
   * POST /api/v1/age-group-supervisor/groups/:id/assign-player
   */
  async assignPlayerToAgeGroup(req, res) {
    try {
      const supervisorId = req.user._id;
      const { id: ageGroupId } = req.params;
      const {
        playerId,
        teamId,
        position,
        positionAr,
        jerseyNumber,
        notes,
        notesAr
      } = req.body;
      
      // Validate age group exists and supervisor has access
      const ageGroup = await AgeGroup.findOne({
        _id: ageGroupId,
        $or: [
          { supervisorId },
          { coachId: supervisorId }
        ],
        isDeleted: { $ne: true }
      });
      
      if (!ageGroup) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this age group',
          messageAr: 'ليس لديك صلاحية للوصول لهذه الفئة العمرية'
        });
      }
      
      // Validate player exists
      const player = await User.findOne({
        _id: playerId,
        role: 'player'
      });
      
      if (!player) {
        return res.status(404).json({
          success: false,
          message: 'Player not found',
          messageAr: 'اللاعب غير موجود'
        });
      }
      
      // Get player profile to check age
      const playerProfile = await PlayerProfile.findOne({ userId: playerId });
      
      if (playerProfile?.birthDate) {
        const age = this.calculateAge(playerProfile.birthDate);
        
        if (age < ageGroup.ageRange.min || age > ageGroup.ageRange.max) {
          return res.status(400).json({
            success: false,
            message: `Player age (${age}) is not within age group range (${ageGroup.ageRange.min}-${ageGroup.ageRange.max})`,
            messageAr: `عمر اللاعب (${age}) ليس ضمن نطاق الفئة العمرية (${ageGroup.ageRange.min}-${ageGroup.ageRange.max})`
          });
        }
      }
      
      // Check if player already has an active assignment
      const existingAssignment = await PlayerAgeGroupAssignment.findOne({
        playerId,
        status: 'active',
        isDeleted: false
      });
      
      if (existingAssignment) {
        return res.status(400).json({
          success: false,
          message: 'Player is already assigned to an age group',
          messageAr: 'اللاعب معين بالفعل في فئة عمرية'
        });
      }
      
      // Check jersey number uniqueness
      if (jerseyNumber) {
        const existingJersey = await PlayerAgeGroupAssignment.findOne({
          ageGroupId,
          jerseyNumber,
          status: 'active',
          isDeleted: false
        });
        
        if (existingJersey) {
          return res.status(400).json({
            success: false,
            message: `Jersey number ${jerseyNumber} is already taken`,
            messageAr: `رقم القميص ${jerseyNumber} محجوز بالفعل`
          });
        }
      }
      
      // Create assignment
      const assignment = await PlayerAgeGroupAssignment.create({
        playerId,
        ageGroupId,
        teamId: teamId || null,
        clubId: ageGroup.clubId,
        assignedCoachId: ageGroup.coachId,
        position: position || null,
        positionAr: positionAr || null,
        jerseyNumber: jerseyNumber || null,
        status: 'active',
        assignedBy: supervisorId,
        notes,
        notesAr
      });
      
      // Populate for response
      await assignment.populate('playerId', 'firstName lastName avatar email');
      await assignment.populate('ageGroupId');
      
      res.status(201).json({
        success: true,
        message: 'Player assigned successfully',
        messageAr: 'تم تعيين اللاعب بنجاح',
        data: assignment
      });
      
    } catch (error) {
      logger.error('Assign player to age group error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign player',
        messageAr: 'فشل في تعيين اللاعب',
        error: error.message
      });
    }
  }
  
  /**
   * Remove player from age group
   * DELETE /api/v1/age-group-supervisor/groups/:id/players/:playerId
   */
  async removePlayerFromAgeGroup(req, res) {
    try {
      const supervisorId = req.user._id;
      const { id: ageGroupId, playerId } = req.params;
      const { reason } = req.body;
      
      // Validate age group access
      const ageGroup = await AgeGroup.findOne({
        _id: ageGroupId,
        $or: [
          { supervisorId },
          { coachId: supervisorId }
        ],
        isDeleted: { $ne: true }
      });
      
      if (!ageGroup) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this age group',
          messageAr: 'ليس لديك صلاحية للوصول لهذه الفئة العمرية'
        });
      }
      
      // Find assignment
      const assignment = await PlayerAgeGroupAssignment.findOne({
        playerId,
        ageGroupId,
        status: 'active',
        isDeleted: false
      });
      
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'Player assignment not found',
          messageAr: 'تعيين اللاعب غير موجود'
        });
      }
      
      // Deactivate assignment
      await assignment.deactivate(reason);
      
      res.json({
        success: true,
        message: 'Player removed from age group',
        messageAr: 'تم إزالة اللاعب من الفئة العمرية'
      });
      
    } catch (error) {
      logger.error('Remove player from age group error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove player',
        messageAr: 'فشل في إزالة اللاعب',
        error: error.message
      });
    }
  }
  
  /**
   * Update player assignment details
   * PATCH /api/v1/age-group-supervisor/players/:assignmentId
   */
  async updatePlayerAssignment(req, res) {
    try {
      const supervisorId = req.user._id;
      const { assignmentId } = req.params;
      const {
        position,
        positionAr,
        jerseyNumber,
        status,
        isCaptain,
        isViceCaptain,
        notes,
        notesAr
      } = req.body;
      
      // Find assignment
      const assignment = await PlayerAgeGroupAssignment.findById(assignmentId)
        .populate('ageGroupId');
      
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'Assignment not found',
          messageAr: 'التعيين غير موجود'
        });
      }
      
      // Verify access
      const ageGroup = assignment.ageGroupId;
      if (ageGroup.supervisorId?.toString() !== supervisorId.toString() &&
          ageGroup.coachId?.toString() !== supervisorId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to modify this assignment',
          messageAr: 'ليس لديك صلاحية لتعديل هذا التعيين'
        });
      }
      
      // Check jersey number uniqueness if changing
      if (jerseyNumber && jerseyNumber !== assignment.jerseyNumber) {
        const existingJersey = await PlayerAgeGroupAssignment.findOne({
          ageGroupId: assignment.ageGroupId._id,
          jerseyNumber,
          _id: { $ne: assignmentId },
          status: 'active',
          isDeleted: false
        });
        
        if (existingJersey) {
          return res.status(400).json({
            success: false,
            message: `Jersey number ${jerseyNumber} is already taken`,
            messageAr: `رقم القميص ${jerseyNumber} محجوز بالفعل`
          });
        }
      }
      
      // Update fields
      if (position !== undefined) assignment.position = position;
      if (positionAr !== undefined) assignment.positionAr = positionAr;
      if (jerseyNumber !== undefined) assignment.jerseyNumber = jerseyNumber;
      if (status !== undefined) assignment.status = status;
      if (isCaptain !== undefined) assignment.isCaptain = isCaptain;
      if (isViceCaptain !== undefined) assignment.isViceCaptain = isViceCaptain;
      if (notes !== undefined) assignment.notes = notes;
      if (notesAr !== undefined) assignment.notesAr = notesAr;
      
      await assignment.save();
      await assignment.populate('playerId', 'firstName lastName avatar');
      
      res.json({
        success: true,
        message: 'Assignment updated successfully',
        messageAr: 'تم تحديث التعيين بنجاح',
        data: assignment
      });
      
    } catch (error) {
      logger.error('Update player assignment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update assignment',
        messageAr: 'فشل في تحديث التعيين',
        error: error.message
      });
    }
  }
  
  /**
   * Set match lineup
   * POST /api/v1/age-group-supervisor/matches/:id/lineup
   */
  async setMatchLineup(req, res) {
    try {
      const supervisorId = req.user._id;
      const { id: matchId } = req.params;
      const { starting = [], substitutes = [] } = req.body;
      
      // Get match
      const match = await Match.findOne({
        _id: matchId,
        isDeleted: { $ne: true }
      }).populate('ageGroupId');
      
      if (!match) {
        return res.status(404).json({
          success: false,
          message: 'Match not found',
          messageAr: 'المباراة غير موجودة'
        });
      }
      
      // Verify access
      const ageGroup = match.ageGroupId;
      if (ageGroup.supervisorId?.toString() !== supervisorId.toString() &&
          ageGroup.coachId?.toString() !== supervisorId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this match',
          messageAr: 'ليس لديك صلاحية للوصول لهذه المباراة'
        });
      }
      
      // Process starting lineup
      for (const player of starting) {
        await PlayerMatchPerformance.findOneAndUpdate(
          { matchId, playerId: player.playerId },
          {
            matchId,
            playerId: player.playerId,
            ageGroupId: match.ageGroupId._id,
            status: 'starting',
            position: player.position,
            positionAr: player.positionAr,
            jerseyNumber: player.jerseyNumber,
            recordedBy: supervisorId
          },
          { upsert: true, new: true }
        );
      }
      
      // Process substitutes
      for (const player of substitutes) {
        await PlayerMatchPerformance.findOneAndUpdate(
          { matchId, playerId: player.playerId },
          {
            matchId,
            playerId: player.playerId,
            ageGroupId: match.ageGroupId._id,
            status: 'substitute',
            position: player.position,
            positionAr: player.positionAr,
            jerseyNumber: player.jerseyNumber,
            recordedBy: supervisorId
          },
          { upsert: true, new: true }
        );
      }
      
      // Update match lineup field
      match.lineup = [
        ...starting.map(p => ({
          playerId: p.playerId,
          playerName: p.playerName,
          position: p.position,
          number: p.jerseyNumber,
          starter: true
        })),
        ...substitutes.map(p => ({
          playerId: p.playerId,
          playerName: p.playerName,
          position: p.position,
          number: p.jerseyNumber,
          starter: false
        }))
      ];
      
      await match.save();
      
      // TODO: Send notifications to players about lineup
      
      res.json({
        success: true,
        message: 'Lineup set successfully',
        messageAr: 'تم تحديد التشكيلة بنجاح',
        data: {
          starting: starting.length,
          substitutes: substitutes.length,
          total: starting.length + substitutes.length
        }
      });
      
    } catch (error) {
      logger.error('Set match lineup error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to set lineup',
        messageAr: 'فشل في تحديد التشكيلة',
        error: error.message
      });
    }
  }
  
  /**
   * Add match event (goal, card, etc.)
   * POST /api/v1/age-group-supervisor/matches/:id/events
   */
  async addMatchEvent(req, res) {
    try {
      const supervisorId = req.user._id;
      const { id: matchId } = req.params;
      const { type, playerId, minute, notes, notesAr } = req.body;
      
      // Get match
      const match = await Match.findOne({
        _id: matchId,
        isDeleted: { $ne: true }
      }).populate('ageGroupId');
      
      if (!match) {
        return res.status(404).json({
          success: false,
          message: 'Match not found',
          messageAr: 'المباراة غير موجودة'
        });
      }
      
      // Verify access
      const ageGroup = match.ageGroupId;
      if (ageGroup.supervisorId?.toString() !== supervisorId.toString() &&
          ageGroup.coachId?.toString() !== supervisorId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this match',
          messageAr: 'ليس لديك صلاحية للوصول لهذه المباراة'
        });
      }
      
      // Get player performance
      const performance = await PlayerMatchPerformance.findOne({
        matchId,
        playerId
      });
      
      if (!performance) {
        return res.status(404).json({
          success: false,
          message: 'Player not in lineup',
          messageAr: 'اللاعب ليس في التشكيلة'
        });
      }
      
      // Handle event based on type
      switch (type) {
        case 'goal':
          await performance.recordGoal();
          break;
        case 'assist':
          await performance.recordAssist();
          break;
        case 'yellow_card':
          await performance.recordYellowCard(minute);
          break;
        case 'red_card':
          await performance.recordRedCard(minute);
          break;
      }
      
      // Add event to match
      const player = await User.findById(playerId);
      match.events.push({
        type,
        playerId,
        playerName: `${player.firstName} ${player.lastName}`,
        minute,
        notes
      });
      
      await match.save();
      
      res.json({
        success: true,
        message: 'Event added successfully',
        messageAr: 'تم إضافة الحدث بنجاح'
      });
      
    } catch (error) {
      logger.error('Add match event error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add event',
        messageAr: 'فشل في إضافة الحدث',
        error: error.message
      });
    }
  }
  
  /**
   * Update player performance in match
   * POST /api/v1/age-group-supervisor/matches/:id/player-performance
   */
  async updatePlayerPerformance(req, res) {
    try {
      const supervisorId = req.user._id;
      const { id: matchId } = req.params;
      const {
        playerId,
        minutesPlayed,
        goals,
        assists,
        rating,
        stats,
        notes,
        notesAr
      } = req.body;
      
      // Get match and verify access
      const match = await Match.findOne({
        _id: matchId,
        isDeleted: { $ne: true }
      }).populate('ageGroupId');
      
      if (!match) {
        return res.status(404).json({
          success: false,
          message: 'Match not found',
          messageAr: 'المباراة غير موجودة'
        });
      }
      
      const ageGroup = match.ageGroupId;
      if (ageGroup.supervisorId?.toString() !== supervisorId.toString() &&
          ageGroup.coachId?.toString() !== supervisorId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this match',
          messageAr: 'ليس لديك صلاحية للوصول لهذه المباراة'
        });
      }
      
      // Update performance
      const performance = await PlayerMatchPerformance.findOneAndUpdate(
        { matchId, playerId },
        {
          $set: {
            minutesPlayed,
            'stats.goals': goals,
            'stats.assists': assists,
            'rating.supervisor': rating,
            'supervisorNotes': notes,
            'supervisorNotesAr': notesAr,
            ...(stats || {})
          }
        },
        { new: true }
      );
      
      if (!performance) {
        return res.status(404).json({
          success: false,
          message: 'Player performance not found',
          messageAr: 'أداء اللاعب غير موجود'
        });
      }
      
      res.json({
        success: true,
        message: 'Performance updated successfully',
        messageAr: 'تم تحديث الأداء بنجاح',
        data: performance
      });
      
    } catch (error) {
      logger.error('Update player performance error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update performance',
        messageAr: 'فشل في تحديث الأداء',
        error: error.message
      });
    }
  }
  
  /**
   * Create announcement for age group
   * POST /api/v1/age-group-supervisor/announcements
   */
  async createAnnouncement(req, res) {
    try {
      const supervisorId = req.user._id;
      const {
        ageGroupId,
        title,
        titleAr,
        content,
        contentAr,
        priority = 'medium',
        type = 'general',
        targetPlayers = [],
        relatedMatch,
        relatedTraining,
        expiresAt,
        requireAcknowledgment = false,
        isPinned = false,
        attachments = []
      } = req.body;
      
      // Verify age group access
      const ageGroup = await AgeGroup.findOne({
        _id: ageGroupId,
        $or: [
          { supervisorId },
          { coachId: supervisorId }
        ],
        isDeleted: { $ne: true }
      });
      
      if (!ageGroup) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this age group',
          messageAr: 'ليس لديك صلاحية للوصول لهذه الفئة العمرية'
        });
      }
      
      // Create announcement
      const announcement = await AgeCategoryAnnouncement.broadcastToAgeGroup({
        ageGroupId,
        clubId: ageGroup.clubId,
        createdBy: supervisorId,
        title,
        titleAr,
        content,
        contentAr,
        priority,
        type,
        targetPlayers,
        relatedMatch,
        relatedTraining,
        expiresAt,
        requireAcknowledgment,
        isPinned,
        attachments
      });
      
      res.status(201).json({
        success: true,
        message: 'Announcement created successfully',
        messageAr: 'تم إنشاء الإعلان بنجاح',
        data: announcement
      });
      
    } catch (error) {
      logger.error('Create announcement error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create announcement',
        messageAr: 'فشل في إنشاء الإعلان',
        error: error.message
      });
    }
  }
  
  /**
   * Get players in age group with performance details
   * GET /api/v1/age-group-supervisor/groups/:id/players-performance
   */
  async getGroupPlayersPerformance(req, res) {
    try {
      const supervisorId = req.user._id;
      const { id: ageGroupId } = req.params;
      
      // Verify access
      const ageGroup = await AgeGroup.findOne({
        _id: ageGroupId,
        $or: [
          { supervisorId },
          { coachId: supervisorId }
        ],
        isDeleted: { $ne: true }
      });
      
      if (!ageGroup) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this age group',
          messageAr: 'ليس لديك صلاحية للوصول لهذه الفئة العمرية'
        });
      }
      
      // Get players
      const assignments = await PlayerAgeGroupAssignment.find({
        ageGroupId,
        status: 'active',
        isDeleted: false
      })
        .populate('playerId', 'firstName lastName avatar email')
        .populate('teamId', 'name nameAr');
      
      // Get performance stats for each player
      const playersWithPerformance = await Promise.all(
        assignments.map(async (assignment) => {
          const stats = await PlayerMatchPerformance.getPlayerStats(
            assignment.playerId._id,
            { ageGroupId }
          );
          
          return {
            player: {
              id: assignment.playerId._id,
              name: `${assignment.playerId.firstName} ${assignment.playerId.lastName}`,
              avatar: assignment.playerId.avatar,
              email: assignment.playerId.email
            },
            assignment: {
              id: assignment._id,
              position: assignment.position,
              positionAr: assignment.positionAr,
              jerseyNumber: assignment.jerseyNumber,
              isCaptain: assignment.isCaptain,
              isViceCaptain: assignment.isViceCaptain,
              joinedAt: assignment.joinedAt,
              attendanceRate: assignment.attendanceRate
            },
            performance: {
              matchesPlayed: stats.matchesPlayed,
              matchesStarted: stats.matchesStarted,
              totalMinutes: stats.totalMinutes,
              goals: stats.totalGoals,
              assists: stats.totalAssists,
              averageRating: stats.averageRating,
              yellowCards: stats.yellowCards,
              redCards: stats.redCards,
              manOfTheMatchAwards: stats.manOfTheMatchAwards
            },
            team: assignment.teamId ? {
              id: assignment.teamId._id,
              name: assignment.teamId.name,
              nameAr: assignment.teamId.nameAr
            } : null
          };
        })
      );
      
      res.json({
        success: true,
        data: playersWithPerformance
      });
      
    } catch (error) {
      logger.error('Get group players performance error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch players performance',
        messageAr: 'فشل في جلب أداء اللاعبين',
        error: error.message
      });
    }
  }
  
  // Helper method
  calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }
}

module.exports = new AgeGroupSupervisorPlayerManagementController();

