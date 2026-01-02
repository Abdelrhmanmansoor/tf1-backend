const { AgeGroup, TrainingSession, Match, PlayerRegistration } = require('../models/admin');
const User = require('../modules/shared/models/User');

exports.getDashboard = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;

    const [
      totalAgeGroups,
      totalPlayers,
      totalCoaches,
      upcomingMatches,
      activeTrainings,
      pendingRegistrations
    ] = await Promise.all([
      AgeGroup.countDocuments({ clubId, isDeleted: { $ne: true } }),
      AgeGroup.aggregate([
        { $match: { clubId, isDeleted: { $ne: true } } },
        { $group: { _id: null, total: { $sum: '$playersCount' } } }
      ]).then(r => r[0]?.total || 0),
      AgeGroup.distinct('coachId', { clubId, isDeleted: { $ne: true } }).then(r => r.length),
      Match.countDocuments({ 
        clubId, 
        date: { $gte: new Date() },
        status: 'scheduled',
        isDeleted: { $ne: true }
      }),
      TrainingSession.countDocuments({
        clubId,
        date: { $gte: new Date() },
        status: 'scheduled',
        isDeleted: { $ne: true }
      }),
      0
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalAgeGroups,
          totalPlayers,
          totalCoaches,
          upcomingMatches,
          activeTrainings,
          pendingRegistrations
        }
      }
    });
  } catch (error) {
    console.error('Age group supervisor dashboard error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DASHBOARD_ERROR',
        message: 'Error fetching dashboard data',
        messageAr: 'خطأ في جلب بيانات لوحة التحكم'
      }
    });
  }
};

exports.getAgeGroups = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;
    const groups = await AgeGroup.find({ clubId, isDeleted: { $ne: true } })
      .populate('coachId', 'firstName lastName')
      .populate('supervisorId', 'firstName lastName')
      .sort({ 'ageRange.min': 1 });

    res.json({
      success: true,
      data: {
        groups: groups.map(g => ({
          id: g._id,
          name: g.name,
          nameAr: g.nameAr,
          ageRange: g.ageRange,
          coachId: g.coachId?._id,
          coachName: g.coachId ? `${g.coachId.firstName} ${g.coachId.lastName}` : g.coachName,
          supervisorId: g.supervisorId?._id,
          supervisorName: g.supervisorId ? `${g.supervisorId.firstName} ${g.supervisorId.lastName}` : g.supervisorName,
          playersCount: g.playersCount,
          status: g.status,
          trainingSchedule: g.trainingSchedule
        }))
      }
    });
  } catch (error) {
    console.error('Get age groups error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_GROUPS_ERROR',
        message: 'Error fetching age groups',
        messageAr: 'خطأ في جلب الفئات العمرية'
      }
    });
  }
};

exports.createAgeGroup = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;
    const { name, nameAr, ageRange, status = 'active', sport = 'football', coachId, supervisorId } = req.body;

    // Validate required fields
    if (!name || !nameAr || !ageRange || !ageRange.min || !ageRange.max) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name, nameAr, and age range are required',
          messageAr: 'الاسم والاسم بالعربية ونطاق العمر مطلوبان'
        }
      });
    }

    // Validate coach if provided
    let coachName;
    if (coachId) {
      const coach = await User.findOne({ _id: coachId, role: 'coach' });
      if (!coach) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_COACH',
            message: 'Invalid coach ID',
            messageAr: 'معرف المدرب غير صحيح'
          }
        });
      }
      coachName = `${coach.firstName} ${coach.lastName}`;
    }

    // Validate supervisor if provided
    let supervisorName;
    if (supervisorId) {
      const supervisor = await User.findOne({ 
        _id: supervisorId, 
        role: { $in: ['age-group-supervisor', 'coach'] } 
      });
      if (!supervisor) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SUPERVISOR',
            message: 'Invalid supervisor ID',
            messageAr: 'معرف المشرف غير صحيح'
          }
        });
      }
      supervisorName = `${supervisor.firstName} ${supervisor.lastName}`;
    }

    const groupData = {
      name: name.trim(),
      nameAr: nameAr.trim(),
      ageRange: {
        min: parseInt(ageRange.min),
        max: parseInt(ageRange.max)
      },
      status: status || 'active',
      sport: sport || 'football',
      clubId,
      createdBy: req.user._id,
      playersCount: 0,
      maxPlayers: 30,
      coachId,
      coachName,
      supervisorId,
      supervisorName
    };

    const group = await AgeGroup.create(groupData);

    // If supervisor assigned, update their profile
    if (supervisorId) {
      await User.findByIdAndUpdate(supervisorId, {
        clubId,
        $addToSet: { assignedAgeGroups: group._id }
      });
    }

    res.status(201).json({
      success: true,
      data: group,
      message: 'Age group created successfully',
      messageAr: 'تم إنشاء الفئة العمرية بنجاح'
    });
  } catch (error) {
    console.error('Create age group error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_GROUP_ERROR',
        message: 'Error creating age group: ' + error.message,
        messageAr: 'خطأ في إنشاء الفئة العمرية: ' + error.message
      }
    });
  }
};

exports.getAgeGroup = async (req, res) => {
  try {
    const group = await AgeGroup.findById(req.params.id)
      .populate('coachId', 'firstName lastName email');

    if (!group) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Age group not found',
          messageAr: 'الفئة العمرية غير موجودة'
        }
      });
    }

    res.json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Get age group error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_GROUP_ERROR',
        message: 'Error fetching age group',
        messageAr: 'خطأ في جلب الفئة العمرية'
      }
    });
  }
};

exports.updateAgeGroup = async (req, res) => {
  try {
    const { name, nameAr, ageRange, status } = req.body;

    // Validate input
    if (!name || !nameAr || !ageRange || !ageRange.min || !ageRange.max) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name, nameAr, and age range are required',
          messageAr: 'الاسم والاسم بالعربية ونطاق العمر مطلوبة'
        }
      });
    }

    if (ageRange.min >= ageRange.max) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Min age must be less than max age',
          messageAr: 'السن الصغرى يجب أن تكون أقل من السن الكبرى'
        }
      });
    }

    const updateData = {
      name: name.trim(),
      nameAr: nameAr.trim(),
      ageRange: {
        min: parseInt(ageRange.min),
        max: parseInt(ageRange.max)
      }
    };

    if (status) {
      updateData.status = status;
    }

    const group = await AgeGroup.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!group) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Age group not found',
          messageAr: 'الفئة العمرية غير موجودة'
        }
      });
    }

    res.json({
      success: true,
      data: group,
      message: 'Age group updated successfully',
      messageAr: 'تم تحديث الفئة العمرية بنجاح'
    });
  } catch (error) {
    console.error('Update age group error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_GROUP_ERROR',
        message: 'Error updating age group: ' + error.message,
        messageAr: 'خطأ في تحديث الفئة العمرية: ' + error.message
      }
    });
  }
};

exports.deleteAgeGroup = async (req, res) => {
  try {
    const group = await AgeGroup.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );

    if (!group) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Age group not found',
          messageAr: 'الفئة العمرية غير موجودة'
        }
      });
    }

    res.json({
      success: true,
      message: 'Age group deleted successfully',
      messageAr: 'تم حذف الفئة العمرية بنجاح'
    });
  } catch (error) {
    console.error('Delete age group error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_GROUP_ERROR',
        message: 'Error deleting age group',
        messageAr: 'خطأ في حذف الفئة العمرية'
      }
    });
  }
};

exports.assignCoach = async (req, res) => {
  try {
    const { coachId } = req.body;

    const coach = await User.findOne({ _id: coachId, role: 'coach' });
    if (!coach) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'COACH_NOT_FOUND',
          message: 'Coach not found',
          messageAr: 'المدرب غير موجود'
        }
      });
    }

    const group = await AgeGroup.findByIdAndUpdate(
      req.params.id,
      { 
        coachId,
        coachName: `${coach.firstName} ${coach.lastName}`
      },
      { new: true }
    );

    res.json({
      success: true,
      data: group,
      message: 'Coach assigned successfully',
      messageAr: 'تم تعيين المدرب بنجاح'
    });
  } catch (error) {
    console.error('Assign coach error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ASSIGN_COACH_ERROR',
        message: 'Error assigning coach',
        messageAr: 'خطأ في تعيين المدرب'
      }
    });
  }
};

/**
 * @route   POST /api/v1/age-group-supervisor/groups/:id/assign-supervisor
 * @desc    Assign supervisor to age group (Club only)
 * @access  Private (club)
 */
exports.assignSupervisor = async (req, res) => {
  try {
    const { supervisorId } = req.body;
    const clubId = req.user._id;

    // Verify user is a club
    if (req.user.role !== 'club' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only clubs can assign supervisors',
          messageAr: 'فقط الأندية يمكنها تعيين المشرفين'
        }
      });
    }

    // Verify supervisor exists and has correct role
    const supervisor = await User.findOne({ 
      _id: supervisorId, 
      role: { $in: ['age-group-supervisor', 'coach'] }
    });
    
    if (!supervisor) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SUPERVISOR_NOT_FOUND',
          message: 'Supervisor not found',
          messageAr: 'المشرف غير موجود'
        }
      });
    }

    // Update age group with supervisor
    const group = await AgeGroup.findOneAndUpdate(
      { _id: req.params.id, clubId },
      { 
        supervisorId,
        supervisorName: `${supervisor.firstName} ${supervisor.lastName}`
      },
      { new: true }
    );

    if (!group) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Age group not found or not owned by this club',
          messageAr: 'الفئة العمرية غير موجودة أو لا تنتمي لهذا النادي'
        }
      });
    }

    // Update supervisor's clubId to link them
    await User.findByIdAndUpdate(supervisorId, { 
      clubId,
      assignedAgeGroups: { $addToSet: group._id }
    });

    res.json({
      success: true,
      data: group,
      message: 'Supervisor assigned successfully',
      messageAr: 'تم تعيين المشرف بنجاح'
    });
  } catch (error) {
    console.error('Assign supervisor error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ASSIGN_SUPERVISOR_ERROR',
        message: 'Error assigning supervisor',
        messageAr: 'خطأ في تعيين المشرف'
      }
    });
  }
};

/**
 * @route   GET /api/v1/age-group-supervisor/my-groups
 * @desc    Get age groups assigned to current supervisor
 * @access  Private (age-group-supervisor)
 */
exports.getMyAssignedGroups = async (req, res) => {
  try {
    const supervisorId = req.user._id;
    const clubId = req.user.clubId;

    // Get groups where this user is the supervisor
    const groups = await AgeGroup.find({ 
      $or: [
        { supervisorId },
        { clubId: supervisorId } // If user is also a club
      ],
      isDeleted: { $ne: true }
    })
    .populate('coachId', 'firstName lastName')
    .sort({ 'ageRange.min': 1 });

    res.json({
      success: true,
      data: {
        groups: groups.map(g => ({
          id: g._id,
          name: g.name,
          nameAr: g.nameAr,
          ageRange: g.ageRange,
          coachId: g.coachId?._id,
          coachName: g.coachId ? `${g.coachId.firstName} ${g.coachId.lastName}` : null,
          playersCount: g.playersCount,
          status: g.status,
          clubId: g.clubId
        })),
        count: groups.length
      }
    });
  } catch (error) {
    console.error('Get my assigned groups error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_GROUPS_ERROR',
        message: 'Error fetching assigned groups',
        messageAr: 'خطأ في جلب الفئات المعينة'
      }
    });
  }
};

/**
 * @route   GET /api/v1/age-group-supervisor/groups/:id/players
 * @desc    Get players in a specific age group
 * @access  Private
 */
exports.getGroupPlayers = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify group exists
    const group = await AgeGroup.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Age group not found',
          messageAr: 'الفئة العمرية غير موجودة'
        }
      });
    }

    // Get players registered to this age group
    const registrations = await PlayerRegistration.find({ 
      ageGroupId: id,
      status: 'approved',
      isDeleted: { $ne: true }
    }).populate('playerId', 'firstName lastName email phone dateOfBirth');

    const players = registrations.map(r => ({
      id: r.playerId?._id,
      firstName: r.playerId?.firstName,
      lastName: r.playerId?.lastName,
      email: r.playerId?.email,
      phone: r.playerId?.phone,
      dateOfBirth: r.playerId?.dateOfBirth,
      registeredAt: r.createdAt,
      status: r.status
    }));

    res.json({
      success: true,
      data: {
        players,
        count: players.length,
        ageGroup: {
          id: group._id,
          name: group.name,
          nameAr: group.nameAr
        }
      }
    });
  } catch (error) {
    console.error('Get group players error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_PLAYERS_ERROR',
        message: 'Error fetching players',
        messageAr: 'خطأ في جلب اللاعبين'
      }
    });
  }
};

exports.getSchedule = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;
    const { startDate, endDate } = req.query;

    const query = { clubId, isDeleted: { $ne: true } };
    if (startDate) query.date = { $gte: new Date(startDate) };
    if (endDate) query.date = { ...query.date, $lte: new Date(endDate) };

    const sessions = await TrainingSession.find(query)
      .populate('ageGroupId', 'name nameAr')
      .sort({ date: 1, time: 1 });

    res.json({
      success: true,
      data: { sessions }
    });
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_SCHEDULE_ERROR',
        message: 'Error fetching schedule',
        messageAr: 'خطأ في جلب الجدول'
      }
    });
  }
};

exports.createTrainingSession = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;
    const { ageGroupId, date, time, duration, location, status = 'scheduled' } = req.body;

    // Validate required fields
    if (!ageGroupId || !date || !time || !duration || !location) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'ageGroupId, date, time, duration, and location are required',
          messageAr: 'معرف الفئة العمرية والتاريخ والوقت والمدة والموقع مطلوبة'
        }
      });
    }

    // Verify age group exists
    const ageGroup = await AgeGroup.findById(ageGroupId);
    if (!ageGroup) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Age group not found',
          messageAr: 'الفئة العمرية غير موجودة'
        }
      });
    }

    // Parse time to calculate startTime and endTime
    const [hours, minutes] = time.split(':');
    const startDate = new Date(date);
    startDate.setHours(parseInt(hours), parseInt(minutes));
    
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + parseInt(duration));

    const sessionData = {
      ageGroup: ageGroupId,
      date: new Date(date),
      startTime: time,
      endTime: endDate.toTimeString().slice(0, 5),
      location: location.trim(),
      status: status,
      club: clubId,
      createdBy: req.user._id,
      attendance: []
    };

    const session = await TrainingSession.create(sessionData);

    const populatedSession = await session.populate('ageGroup', 'name nameAr');

    res.status(201).json({
      success: true,
      data: populatedSession,
      message: 'Training session created successfully',
      messageAr: 'تم إنشاء جلسة التدريب بنجاح'
    });
  } catch (error) {
    console.error('Create training session error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_SESSION_ERROR',
        message: 'Error creating training session',
        messageAr: 'خطأ في إنشاء جلسة التدريب'
      }
    });
  }
};

exports.updateTrainingSession = async (req, res) => {
  try {
    const session = await TrainingSession.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Training session not found',
          messageAr: 'جلسة التدريب غير موجودة'
        }
      });
    }

    res.json({
      success: true,
      data: session,
      message: 'Training session updated successfully',
      messageAr: 'تم تحديث جلسة التدريب بنجاح'
    });
  } catch (error) {
    console.error('Update training session error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_SESSION_ERROR',
        message: 'Error updating training session',
        messageAr: 'خطأ في تحديث جلسة التدريب'
      }
    });
  }
};

exports.deleteTrainingSession = async (req, res) => {
  try {
    const session = await TrainingSession.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Training session not found',
          messageAr: 'جلسة التدريب غير موجودة'
        }
      });
    }

    res.json({
      success: true,
      message: 'Training session deleted successfully',
      messageAr: 'تم حذف جلسة التدريب بنجاح'
    });
  } catch (error) {
    console.error('Delete training session error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_SESSION_ERROR',
        message: 'Error deleting training session',
        messageAr: 'خطأ في حذف جلسة التدريب'
      }
    });
  }
};

exports.getMatches = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;
    const { status, ageGroupId } = req.query;

    const query = { clubId, isDeleted: { $ne: true } };
    if (status) query.status = status;
    if (ageGroupId) query.ageGroupId = ageGroupId;

    const matches = await Match.find(query)
      .populate('ageGroupId', 'name nameAr')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: { matches }
    });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_MATCHES_ERROR',
        message: 'Error fetching matches',
        messageAr: 'خطأ في جلب المباريات'
      }
    });
  }
};

exports.createMatch = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;
    const matchData = {
      ...req.body,
      clubId,
      createdBy: req.user._id
    };

    const match = await Match.create(matchData);

    res.status(201).json({
      success: true,
      data: match,
      message: 'Match created successfully',
      messageAr: 'تم إنشاء المباراة بنجاح'
    });
  } catch (error) {
    console.error('Create match error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_MATCH_ERROR',
        message: 'Error creating match',
        messageAr: 'خطأ في إنشاء المباراة'
      }
    });
  }
};

exports.updateMatch = async (req, res) => {
  try {
    const match = await Match.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!match) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MATCH_NOT_FOUND',
          message: 'Match not found',
          messageAr: 'المباراة غير موجودة'
        }
      });
    }

    res.json({
      success: true,
      data: match,
      message: 'Match updated successfully',
      messageAr: 'تم تحديث المباراة بنجاح'
    });
  } catch (error) {
    console.error('Update match error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_MATCH_ERROR',
        message: 'Error updating match',
        messageAr: 'خطأ في تحديث المباراة'
      }
    });
  }
};

exports.getGroupPlayers = async (req, res) => {
  try {
    const PlayerProfile = require('../modules/player/models/PlayerProfile');
    const group = await AgeGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Age group not found',
          messageAr: 'الفئة العمرية غير موجودة'
        }
      });
    }

    res.json({
      success: true,
      data: {
        players: [],
        count: group.playersCount
      }
    });
  } catch (error) {
    console.error('Get group players error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_PLAYERS_ERROR',
        message: 'Error fetching players',
        messageAr: 'خطأ في جلب اللاعبين'
      }
    });
  }
};

exports.getRegistrations = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;
    const { status, page = 1, limit = 50 } = req.query;

    const query = { clubId, isDeleted: false };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [registrations, total] = await Promise.all([
      PlayerRegistration.find(query)
        .populate('requestedAgeGroupId', 'name nameAr ageRange')
        .populate('reviewedBy', 'firstName lastName')
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      PlayerRegistration.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        registrations: registrations.map(reg => ({
          id: reg._id,
          registrationNumber: reg.registrationNumber,
          playerName: reg.playerName,
          playerNameAr: reg.playerNameAr,
          dateOfBirth: reg.dateOfBirth,
          age: reg.age,
          gender: reg.gender,
          parentName: reg.parentName,
          parentNameAr: reg.parentNameAr,
          parentPhone: reg.parentPhone,
          parentEmail: reg.parentEmail,
          nationalId: reg.nationalId,
          requestedAgeGroup: reg.requestedAgeGroup,
          requestedAgeGroupId: reg.requestedAgeGroupId?._id,
          ageGroupDetails: reg.requestedAgeGroupId,
          sport: reg.sport,
          position: reg.position,
          previousExperience: reg.previousExperience,
          medicalConditions: reg.medicalConditions,
          emergencyContact: reg.emergencyContact,
          documents: reg.documents,
          status: reg.status,
          submittedAt: reg.submittedAt,
          reviewedAt: reg.reviewedAt,
          reviewedBy: reg.reviewedBy,
          approvalNotes: reg.approvalNotes,
          rejectionReason: reg.rejectionReason,
          rejectionReasonAr: reg.rejectionReasonAr,
          source: reg.source
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get registrations error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_REGISTRATIONS_ERROR',
        message: 'Error fetching registrations',
        messageAr: 'خطأ في جلب التسجيلات'
      }
    });
  }
};

exports.approveRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, assignedTeamId } = req.body;
    const clubId = req.user.clubId || req.user._id;

    const registration = await PlayerRegistration.findOne({ 
      _id: id, 
      clubId, 
      isDeleted: false 
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REGISTRATION_NOT_FOUND',
          message: 'Registration not found',
          messageAr: 'التسجيل غير موجود'
        }
      });
    }

    if (registration.status !== 'pending' && registration.status !== 'under_review') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Cannot approve registration with status: ${registration.status}`,
          messageAr: `لا يمكن الموافقة على تسجيل بحالة: ${registration.status}`
        }
      });
    }

    // Verify age group capacity and age requirements
    const targetGroupId = assignedTeamId || registration.requestedAgeGroupId;
    const ageGroup = await AgeGroup.findById(targetGroupId);
    
    if (!ageGroup) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Target age group not found',
          messageAr: 'الفئة العمرية المستهدفة غير موجودة'
        }
      });
    }

    // Check capacity
    if (ageGroup.playersCount >= ageGroup.maxPlayers) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'GROUP_FULL',
          message: 'Age group is full',
          messageAr: 'الفئة العمرية ممتلئة'
        }
      });
    }

    // Check age compatibility (optional, but recommended)
    // Assuming registration has dateOfBirth or age
    if (registration.age) {
      if (registration.age < ageGroup.ageRange.min || registration.age > ageGroup.ageRange.max) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'AGE_MISMATCH',
            message: `Player age (${registration.age}) is not within group range (${ageGroup.ageRange.min}-${ageGroup.ageRange.max})`,
            messageAr: `عمر اللاعب (${registration.age}) غير متوافق مع الفئة العمرية (${ageGroup.ageRange.min}-${ageGroup.ageRange.max})`
          }
        });
      }
    }

    registration.approve(req.user._id, notes, targetGroupId);
    await registration.save();

    await AgeGroup.findByIdAndUpdate(
      targetGroupId,
      { $inc: { playersCount: 1 } }
    );

    res.json({
      success: true,
      message: 'Registration approved successfully',
      messageAr: 'تم قبول التسجيل بنجاح',
      data: { registration }
    });
  } catch (error) {
    console.error('Approve registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'APPROVE_ERROR',
        message: 'Error approving registration',
        messageAr: 'خطأ في الموافقة على التسجيل'
      }
    });
  }
};

exports.rejectRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, reasonAr } = req.body;
    const clubId = req.user.clubId || req.user._id;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REASON_REQUIRED',
          message: 'Rejection reason is required',
          messageAr: 'سبب الرفض مطلوب'
        }
      });
    }

    const registration = await PlayerRegistration.findOne({ 
      _id: id, 
      clubId, 
      isDeleted: false 
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REGISTRATION_NOT_FOUND',
          message: 'Registration not found',
          messageAr: 'التسجيل غير موجود'
        }
      });
    }

    if (registration.status !== 'pending' && registration.status !== 'under_review') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Cannot reject registration with status: ${registration.status}`,
          messageAr: `لا يمكن رفض تسجيل بحالة: ${registration.status}`
        }
      });
    }

    registration.reject(req.user._id, reason, reasonAr || reason);
    await registration.save();

    res.json({
      success: true,
      message: 'Registration rejected successfully',
      messageAr: 'تم رفض التسجيل بنجاح',
      data: { registration }
    });
  } catch (error) {
    console.error('Reject registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REJECT_ERROR',
        message: 'Error rejecting registration',
        messageAr: 'خطأ في رفض التسجيل'
      }
    });
  }
};

exports.handleRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason, reasonAr, notes, assignedTeamId } = req.body;
    const clubId = req.user.clubId || req.user._id;

    const registration = await PlayerRegistration.findOne({ 
      _id: id, 
      clubId, 
      isDeleted: false 
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REGISTRATION_NOT_FOUND',
          message: 'Registration not found',
          messageAr: 'التسجيل غير موجود'
        }
      });
    }

    if (action === 'approve') {
      registration.approve(req.user._id, notes, assignedTeamId || registration.requestedAgeGroupId);
      if (registration.requestedAgeGroupId) {
        await AgeGroup.findByIdAndUpdate(
          assignedTeamId || registration.requestedAgeGroupId,
          { $inc: { playersCount: 1 } }
        );
      }
    } else if (action === 'reject') {
      if (!reason) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'REASON_REQUIRED',
            message: 'Rejection reason is required',
            messageAr: 'سبب الرفض مطلوب'
          }
        });
      }
      registration.reject(req.user._id, reason, reasonAr || reason);
    } else {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ACTION',
          message: 'Action must be either "approve" or "reject"',
          messageAr: 'الإجراء يجب أن يكون "موافقة" أو "رفض"'
        }
      });
    }

    await registration.save();

    res.json({
      success: true,
      message: action === 'approve' ? 'Registration approved successfully' : 'Registration rejected successfully',
      messageAr: action === 'approve' ? 'تم قبول التسجيل بنجاح' : 'تم رفض التسجيل بنجاح',
      data: { registration }
    });
  } catch (error) {
    console.error('Handle registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REGISTRATION_ERROR',
        message: 'Error processing registration',
        messageAr: 'خطأ في معالجة التسجيل'
      }
    });
  }
};

exports.createRegistration = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;
    const {
      playerName,
      playerNameAr,
      dateOfBirth,
      gender,
      parentName,
      parentNameAr,
      parentPhone,
      parentEmail,
      nationalId,
      requestedAgeGroup,
      requestedAgeGroupId,
      sport,
      position,
      previousExperience,
      medicalConditions,
      emergencyContact
    } = req.body;

    if (!playerName || !dateOfBirth || !parentName || !parentPhone || !requestedAgeGroup) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Player name, date of birth, parent name, parent phone, and age group are required',
          messageAr: 'اسم اللاعب وتاريخ الميلاد واسم ولي الأمر ورقم الهاتف والفئة العمرية مطلوبة'
        }
      });
    }

    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    const registration = await PlayerRegistration.create({
      clubId,
      playerName,
      playerNameAr: playerNameAr || playerName,
      dateOfBirth: birthDate,
      age,
      gender: gender || 'male',
      parentName,
      parentNameAr: parentNameAr || parentName,
      parentPhone,
      parentEmail,
      nationalId,
      requestedAgeGroup,
      requestedAgeGroupId,
      sport: sport || 'football',
      position,
      previousExperience,
      medicalConditions,
      emergencyContact,
      source: 'admin_entry',
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Registration created successfully',
      messageAr: 'تم إنشاء التسجيل بنجاح',
      data: { registration }
    });
  } catch (error) {
    console.error('Create registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_REGISTRATION_ERROR',
        message: 'Error creating registration',
        messageAr: 'خطأ في إنشاء التسجيل'
      }
    });
  }
};

exports.getPlayers = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;
    const { ageGroupId, status = 'approved', page = 1, limit = 50, search } = req.query;

    const query = { 
      clubId, 
      status: 'approved',
      isDeleted: false 
    };

    if (ageGroupId) {
      query.$or = [
        { requestedAgeGroupId: ageGroupId },
        { assignedTeam: ageGroupId }
      ];
    }

    if (search) {
      query.$or = [
        { playerName: { $regex: search, $options: 'i' } },
        { playerNameAr: { $regex: search, $options: 'i' } },
        { registrationNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [players, total] = await Promise.all([
      PlayerRegistration.find(query)
        .populate('requestedAgeGroupId', 'name nameAr ageRange')
        .populate('assignedTeam', 'name nameAr ageRange')
        .sort({ approvedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      PlayerRegistration.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        players: players.map(p => ({
          id: p._id,
          registrationNumber: p.registrationNumber,
          playerName: p.playerName,
          playerNameAr: p.playerNameAr,
          dateOfBirth: p.dateOfBirth,
          age: p.age,
          gender: p.gender,
          parentName: p.parentName,
          parentPhone: p.parentPhone,
          ageGroup: p.assignedTeam || p.requestedAgeGroupId,
          sport: p.sport,
          position: p.position,
          approvedAt: p.reviewedAt,
          status: p.status
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get players error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_PLAYERS_ERROR',
        message: 'Error fetching players',
        messageAr: 'خطأ في جلب اللاعبين'
      }
    });
  }
};

exports.getRegistrationById = async (req, res) => {
  try {
    const { id } = req.params;
    const clubId = req.user.clubId || req.user._id;

    const registration = await PlayerRegistration.findOne({ 
      _id: id, 
      clubId, 
      isDeleted: false 
    })
    .populate('requestedAgeGroupId', 'name nameAr ageRange')
    .populate('assignedTeam', 'name nameAr ageRange')
    .populate('reviewedBy', 'firstName lastName');

    if (!registration) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REGISTRATION_NOT_FOUND',
          message: 'Registration not found',
          messageAr: 'التسجيل غير موجود'
        }
      });
    }

    res.json({
      success: true,
      data: { registration }
    });
  } catch (error) {
    console.error('Get registration by ID error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_REGISTRATION_ERROR',
        message: 'Error fetching registration',
        messageAr: 'خطأ في جلب التسجيل'
      }
    });
  }
};

// ============= REPORTS ENDPOINTS =============

exports.reportPlayers = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;

    const groups = await AgeGroup.find({ clubId, isDeleted: { $ne: true } })
      .lean()
      .exec();

    const totalPlayers = groups.reduce((sum, g) => sum + (g.playersCount || 0), 0);
    
    const byAgeGroup = groups.map(g => ({
      id: g._id,
      name: g.name,
      nameAr: g.nameAr,
      ageRange: `${g.ageRange.min}-${g.ageRange.max}`,
      playersCount: g.playersCount || 0,
      maxCapacity: g.maxPlayers || 30,
      occupancyRate: Math.round(((g.playersCount || 0) / (g.maxPlayers || 30)) * 100)
    }));

    const byStatus = {
      active: groups.filter(g => g.status === 'active').length,
      inactive: groups.filter(g => g.status === 'inactive').length
    };

    res.json({
      success: true,
      data: {
        totalPlayers,
        totalGroups: groups.length,
        byAgeGroup,
        byStatus
      }
    });
  } catch (error) {
    console.error('Report players error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REPORT_ERROR',
        message: 'Error generating players report',
        messageAr: 'خطأ في إنشاء تقرير اللاعبين'
      }
    });
  }
};

exports.reportAttendance = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;

    const trainingData = await TrainingSession.aggregate([
      { $match: { clubId, isDeleted: { $ne: true } } },
      { $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        attendedSessions: { $sum: { $cond: [{ $gt: ['$attendanceCount', 0] }, 1, 0] } },
        totalAttendance: { $sum: '$attendanceCount' }
      }}
    ]);

    const byWeek = [];
    const byAgeGroup = [];

    const data = trainingData[0] || { totalSessions: 0, attendedSessions: 0, totalAttendance: 0 };
    const averageAttendance = data.totalSessions > 0 
      ? Math.round((data.totalAttendance / data.totalSessions) * 100) / 100 
      : 0;

    res.json({
      success: true,
      data: {
        averageAttendance,
        totalSessions: data.totalSessions,
        attendedSessions: data.attendedSessions,
        byWeek,
        byAgeGroup
      }
    });
  } catch (error) {
    console.error('Report attendance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REPORT_ERROR',
        message: 'Error generating attendance report',
        messageAr: 'خطأ في إنشاء تقرير الحضور'
      }
    });
  }
};

exports.reportPerformance = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;

    const groups = await AgeGroup.find({ clubId, isDeleted: { $ne: true } })
      .populate('coachId', 'firstName lastName email')
      .lean()
      .exec();

    const topPlayers = groups
      .sort((a, b) => (b.playersCount || 0) - (a.playersCount || 0))
      .slice(0, 5)
      .map(g => ({
        id: g._id,
        name: g.name,
        coach: g.coachId ? `${g.coachId.firstName} ${g.coachId.lastName}` : 'Not assigned',
        playersCount: g.playersCount || 0,
        capacity: g.maxPlayers || 30
      }));

    const improvements = [];
    const metrics = {
      totalGroups: groups.length,
      totalCapacity: groups.reduce((sum, g) => sum + (g.maxPlayers || 30), 0),
      totalEnrolled: groups.reduce((sum, g) => sum + (g.playersCount || 0), 0),
      averageOccupancy: Math.round(
        (groups.reduce((sum, g) => sum + (g.playersCount || 0), 0) / 
         groups.reduce((sum, g) => sum + (g.maxPlayers || 30), 0)) * 100
      ) || 0
    };

    res.json({
      success: true,
      data: {
        topPlayers,
        improvements,
        metrics
      }
    });
  } catch (error) {
    console.error('Report performance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REPORT_ERROR',
        message: 'Error generating performance report',
        messageAr: 'خطأ في إنشاء تقرير الأداء'
      }
    });
  }
};

exports.reportRegistrations = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;

    const groups = await AgeGroup.find({ clubId, isDeleted: { $ne: true } })
      .lean()
      .exec();

    const total = groups.length;
    const active = groups.filter(g => g.status === 'active').length;
    const inactive = groups.filter(g => g.status === 'inactive').length;
    const pending = 0;
    const approved = active;
    const rejected = inactive;

    const byMonth = [];

    res.json({
      success: true,
      data: {
        total,
        active,
        inactive,
        pending,
        approved,
        rejected,
        byMonth
      }
    });
  } catch (error) {
    console.error('Report registrations error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REPORT_ERROR',
        message: 'Error generating registrations report',
        messageAr: 'خطأ في إنشاء تقرير التسجيلات'
      }
    });
  }
};
