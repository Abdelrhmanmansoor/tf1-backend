/**
 * Middleware for Player Age Group Access Control
 * Ensures players can only access resources related to their assigned age group
 */

const { PlayerAgeGroupAssignment, AgeGroup, Match } = require('../models/admin');
const logger = require('../utils/logger');

/**
 * Check if player is assigned to an active age group
 */
const requireAgeGroupAssignment = async (req, res, next) => {
  try {
    const playerId = req.user._id;
    
    // Get player's active assignment
    const assignment = await PlayerAgeGroupAssignment.findOne({
      playerId,
      status: 'active',
      isDeleted: false
    });
    
    if (!assignment) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to any age category. Please contact your club administrator.',
        messageAr: 'لم يتم تعيينك في أي فئة عمرية. يرجى الاتصال بإدارة النادي.',
        code: 'NOT_ASSIGNED_TO_AGE_GROUP'
      });
    }
    
    // Attach assignment to request for use in controllers
    req.playerAssignment = assignment;
    req.ageGroupId = assignment.ageGroupId;
    
    next();
  } catch (error) {
    logger.error('Age group assignment check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify age group assignment',
      messageAr: 'فشل في التحقق من تعيين الفئة العمرية',
      error: error.message
    });
  }
};

/**
 * Verify player has access to specific match
 */
const verifyMatchAccess = async (req, res, next) => {
  try {
    const playerId = req.user._id;
    const matchId = req.params.id || req.body.matchId;
    
    if (!matchId) {
      return res.status(400).json({
        success: false,
        message: 'Match ID is required',
        messageAr: 'معرّف المباراة مطلوب'
      });
    }
    
    // Get match
    const match = await Match.findById(matchId);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found',
        messageAr: 'المباراة غير موجودة'
      });
    }
    
    // Get player's assignment
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
        messageAr: 'ليس لديك صلاحية للوصول لهذه المباراة',
        code: 'MATCH_ACCESS_DENIED'
      });
    }
    
    req.match = match;
    next();
  } catch (error) {
    logger.error('Match access verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify match access',
      messageAr: 'فشل في التحقق من صلاحية الوصول للمباراة',
      error: error.message
    });
  }
};

/**
 * Verify age group supervisor has access to specific age group
 */
const verifySupervisorAgeGroupAccess = async (req, res, next) => {
  try {
    const supervisorId = req.user._id;
    const ageGroupId = req.params.id || req.body.ageGroupId;
    
    if (!ageGroupId) {
      return res.status(400).json({
        success: false,
        message: 'Age group ID is required',
        messageAr: 'معرّف الفئة العمرية مطلوب'
      });
    }
    
    // Get age group and check if supervisor has access
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
        messageAr: 'ليس لديك صلاحية للوصول لهذه الفئة العمرية',
        code: 'AGE_GROUP_ACCESS_DENIED'
      });
    }
    
    req.ageGroup = ageGroup;
    next();
  } catch (error) {
    logger.error('Supervisor age group access verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify age group access',
      messageAr: 'فشل في التحقق من صلاحية الوصول للفئة العمرية',
      error: error.message
    });
  }
};

/**
 * Verify age compatibility when assigning player to age group
 */
const validatePlayerAgeForGroup = async (req, res, next) => {
  try {
    const { playerId } = req.body;
    const ageGroupId = req.params.id || req.body.ageGroupId;
    
    // Get age group
    const ageGroup = await AgeGroup.findById(ageGroupId);
    
    if (!ageGroup) {
      return res.status(404).json({
        success: false,
        message: 'Age group not found',
        messageAr: 'الفئة العمرية غير موجودة'
      });
    }
    
    // Get player profile
    const PlayerProfile = require('../modules/player/models/PlayerProfile');
    const playerProfile = await PlayerProfile.findOne({ userId: playerId });
    
    if (playerProfile && playerProfile.birthDate) {
      const age = calculateAge(playerProfile.birthDate);
      
      if (age < ageGroup.ageRange.min || age > ageGroup.ageRange.max) {
        return res.status(400).json({
          success: false,
          message: `Player age (${age}) is not within age group range (${ageGroup.ageRange.min}-${ageGroup.ageRange.max})`,
          messageAr: `عمر اللاعب (${age}) ليس ضمن نطاق الفئة العمرية (${ageGroup.ageRange.min}-${ageGroup.ageRange.max})`,
          code: 'AGE_OUT_OF_RANGE',
          details: {
            playerAge: age,
            ageGroupMin: ageGroup.ageRange.min,
            ageGroupMax: ageGroup.ageRange.max
          }
        });
      }
    }
    
    next();
  } catch (error) {
    logger.error('Age validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate player age',
      messageAr: 'فشل في التحقق من عمر اللاعب',
      error: error.message
    });
  }
};

/**
 * Prevent duplicate active assignments
 */
const preventDuplicateAssignment = async (req, res, next) => {
  try {
    const { playerId } = req.body;
    
    // Check for existing active assignment
    const existingAssignment = await PlayerAgeGroupAssignment.findOne({
      playerId,
      status: 'active',
      isDeleted: false
    }).populate('ageGroupId');
    
    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        message: `Player is already assigned to ${existingAssignment.ageGroupId.name}`,
        messageAr: `اللاعب معين بالفعل في ${existingAssignment.ageGroupId.nameAr}`,
        code: 'DUPLICATE_ASSIGNMENT',
        existingAssignment: {
          ageGroupId: existingAssignment.ageGroupId._id,
          ageGroupName: existingAssignment.ageGroupId.name,
          ageGroupNameAr: existingAssignment.ageGroupId.nameAr,
          assignedAt: existingAssignment.joinedAt
        }
      });
    }
    
    next();
  } catch (error) {
    logger.error('Duplicate assignment check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check for duplicate assignment',
      messageAr: 'فشل في التحقق من التعيينات المكررة',
      error: error.message
    });
  }
};

/**
 * Validate jersey number uniqueness
 */
const validateJerseyNumber = async (req, res, next) => {
  try {
    const { jerseyNumber } = req.body;
    const ageGroupId = req.params.id || req.body.ageGroupId;
    const assignmentId = req.params.assignmentId;
    
    if (!jerseyNumber) {
      return next(); // Jersey number is optional
    }
    
    // Check if jersey number is already taken
    const query = {
      ageGroupId,
      jerseyNumber,
      status: 'active',
      isDeleted: false
    };
    
    // Exclude current assignment if updating
    if (assignmentId) {
      query._id = { $ne: assignmentId };
    }
    
    const existingJersey = await PlayerAgeGroupAssignment.findOne(query)
      .populate('playerId', 'firstName lastName');
    
    if (existingJersey) {
      return res.status(400).json({
        success: false,
        message: `Jersey number ${jerseyNumber} is already assigned to ${existingJersey.playerId.firstName} ${existingJersey.playerId.lastName}`,
        messageAr: `رقم القميص ${jerseyNumber} محجوز بالفعل للاعب ${existingJersey.playerId.firstName} ${existingJersey.playerId.lastName}`,
        code: 'JERSEY_NUMBER_TAKEN',
        takenBy: {
          playerId: existingJersey.playerId._id,
          playerName: `${existingJersey.playerId.firstName} ${existingJersey.playerId.lastName}`
        }
      });
    }
    
    next();
  } catch (error) {
    logger.error('Jersey number validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate jersey number',
      messageAr: 'فشل في التحقق من رقم القميص',
      error: error.message
    });
  }
};

/**
 * Rate limiting for sensitive operations
 */
const rateLimitAssignments = (req, res, next) => {
  // TODO: Implement rate limiting using redis or in-memory store
  // For now, just pass through
  // Suggested: Max 10 player assignments per hour per supervisor
  next();
};

/**
 * Audit log for important operations
 */
const auditPlayerAssignment = async (req, res, next) => {
  // Store original send function
  const originalSend = res.json;
  
  // Override send function to log after response
  res.json = function(data) {
    // Log the operation
    if (data.success) {
      logger.info('Player assignment operation', {
        supervisorId: req.user._id,
        operation: req.method,
        path: req.path,
        body: {
          playerId: req.body.playerId,
          ageGroupId: req.params.id || req.body.ageGroupId
        },
        timestamp: new Date()
      });
    }
    
    // Call original send
    return originalSend.call(this, data);
  };
  
  next();
};

// Helper function
function calculateAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

module.exports = {
  requireAgeGroupAssignment,
  verifyMatchAccess,
  verifySupervisorAgeGroupAccess,
  validatePlayerAgeForGroup,
  preventDuplicateAssignment,
  validateJerseyNumber,
  rateLimitAssignments,
  auditPlayerAssignment
};

