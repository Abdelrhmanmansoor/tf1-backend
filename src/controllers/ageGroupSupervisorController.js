const { AgeGroup, TrainingSession, Match } = require('../models/admin');
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
    const { name, nameAr, ageRange, status = 'active', sport = 'football' } = req.body;

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
      maxPlayers: 30
    };

    const group = await AgeGroup.create(groupData);

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
    const group = await AgeGroup.findByIdAndUpdate(
      req.params.id,
      req.body,
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
        message: 'Error updating age group',
        messageAr: 'خطأ في تحديث الفئة العمرية'
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
    const sessionData = {
      ...req.body,
      clubId,
      createdBy: req.user._id
    };

    const session = await TrainingSession.create(sessionData);

    res.status(201).json({
      success: true,
      data: session,
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
    res.json({
      success: true,
      data: { registrations: [] }
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

exports.handleRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;

    res.json({
      success: true,
      message: action === 'approve' ? 'Registration approved' : 'Registration rejected',
      messageAr: action === 'approve' ? 'تم قبول التسجيل' : 'تم رفض التسجيل'
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
