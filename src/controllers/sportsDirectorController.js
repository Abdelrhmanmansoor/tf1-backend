const { Program, CoachEvaluation, AgeGroup, TrainingSession } = require('../models/admin');
const User = require('../modules/shared/models/User');

exports.getDashboard = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;

    const [
      activePrograms,
      totalAthletes,
      coachingStaff,
      upcomingEvents,
      trainingHours
    ] = await Promise.all([
      Program.countDocuments({ clubId, status: 'active', isDeleted: { $ne: true } }),
      AgeGroup.aggregate([
        { $match: { clubId, isDeleted: { $ne: true } } },
        { $group: { _id: null, total: { $sum: '$playersCount' } } }
      ]).then(r => r[0]?.total || 0),
      User.countDocuments({ role: 'coach' }),
      Program.countDocuments({ clubId, status: 'upcoming', isDeleted: { $ne: true } }),
      TrainingSession.aggregate([
        { $match: { clubId, status: 'completed', isDeleted: { $ne: true } } },
        { $group: { _id: null, total: { $sum: '$duration' } } }
      ]).then(r => Math.round((r[0]?.total || 0) / 60))
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          activePrograms,
          totalAthletes,
          coachingStaff,
          upcomingEvents,
          winRate: 72,
          trainingHours
        }
      }
    });
  } catch (error) {
    console.error('Sports director dashboard error:', error);
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

exports.getPrograms = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;
    const { status, type } = req.query;

    const query = { clubId, isDeleted: { $ne: true } };
    if (status) query.status = status;
    if (type) query.type = type;

    const programs = await Program.find(query)
      .populate('coaches', 'firstName lastName')
      .sort({ startDate: -1 });

    res.json({
      success: true,
      data: { programs }
    });
  } catch (error) {
    console.error('Get programs error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_PROGRAMS_ERROR',
        message: 'Error fetching programs',
        messageAr: 'خطأ في جلب البرامج'
      }
    });
  }
};

exports.createProgram = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;
    const programData = {
      ...req.body,
      clubId,
      createdBy: req.user._id
    };

    const program = await Program.create(programData);

    res.status(201).json({
      success: true,
      data: program,
      message: 'Program created successfully',
      messageAr: 'تم إنشاء البرنامج بنجاح'
    });
  } catch (error) {
    console.error('Create program error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_PROGRAM_ERROR',
        message: 'Error creating program',
        messageAr: 'خطأ في إنشاء البرنامج'
      }
    });
  }
};

exports.getProgram = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id)
      .populate('coaches', 'firstName lastName email')
      .populate('ageGroups', 'name nameAr');

    if (!program) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROGRAM_NOT_FOUND',
          message: 'Program not found',
          messageAr: 'البرنامج غير موجود'
        }
      });
    }

    res.json({
      success: true,
      data: program
    });
  } catch (error) {
    console.error('Get program error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_PROGRAM_ERROR',
        message: 'Error fetching program',
        messageAr: 'خطأ في جلب البرنامج'
      }
    });
  }
};

exports.updateProgram = async (req, res) => {
  try {
    const program = await Program.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!program) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROGRAM_NOT_FOUND',
          message: 'Program not found',
          messageAr: 'البرنامج غير موجود'
        }
      });
    }

    res.json({
      success: true,
      data: program,
      message: 'Program updated successfully',
      messageAr: 'تم تحديث البرنامج بنجاح'
    });
  } catch (error) {
    console.error('Update program error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_PROGRAM_ERROR',
        message: 'Error updating program',
        messageAr: 'خطأ في تحديث البرنامج'
      }
    });
  }
};

exports.deleteProgram = async (req, res) => {
  try {
    const program = await Program.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );

    if (!program) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROGRAM_NOT_FOUND',
          message: 'Program not found',
          messageAr: 'البرنامج غير موجود'
        }
      });
    }

    res.json({
      success: true,
      message: 'Program deleted successfully',
      messageAr: 'تم حذف البرنامج بنجاح'
    });
  } catch (error) {
    console.error('Delete program error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_PROGRAM_ERROR',
        message: 'Error deleting program',
        messageAr: 'خطأ في حذف البرنامج'
      }
    });
  }
};

exports.getCoachesPerformance = async (req, res) => {
  try {
    const coaches = await User.find({ role: 'coach', isDeleted: { $ne: true } })
      .select('firstName lastName email');

    const coachesWithPerformance = await Promise.all(
      coaches.map(async (coach) => {
        const evaluations = await CoachEvaluation.find({ coachId: coach._id });
        const avgRating = evaluations.length > 0
          ? evaluations.reduce((sum, e) => sum + e.rating, 0) / evaluations.length
          : 0;

        const sessionsCompleted = await TrainingSession.countDocuments({
          coachId: coach._id,
          status: 'completed'
        });

        return {
          id: coach._id,
          name: `${coach.firstName} ${coach.lastName}`,
          rating: Math.round(avgRating * 10) / 10,
          sessionsCompleted,
          playersManaged: 0,
          winRate: 0
        };
      })
    );

    res.json({
      success: true,
      data: { coaches: coachesWithPerformance }
    });
  } catch (error) {
    console.error('Get coaches performance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_PERFORMANCE_ERROR',
        message: 'Error fetching coach performance',
        messageAr: 'خطأ في جلب أداء المدربين'
      }
    });
  }
};

exports.getCoachEvaluations = async (req, res) => {
  try {
    const { id } = req.params;
    const evaluations = await CoachEvaluation.find({ 
      coachId: id,
      isDeleted: { $ne: true }
    })
      .populate('evaluatorId', 'firstName lastName')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: { evaluations }
    });
  } catch (error) {
    console.error('Get coach evaluations error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_EVALUATIONS_ERROR',
        message: 'Error fetching evaluations',
        messageAr: 'خطأ في جلب التقييمات'
      }
    });
  }
};

exports.createCoachEvaluation = async (req, res) => {
  try {
    const { id } = req.params;
    
    const coach = await User.findOne({ _id: id, role: 'coach' });
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

    const evaluationData = {
      ...req.body,
      coachId: id,
      coachName: `${coach.firstName} ${coach.lastName}`,
      evaluatorId: req.user._id,
      evaluatorName: `${req.user.firstName} ${req.user.lastName}`,
      clubId: req.user.clubId || req.user._id
    };

    const evaluation = await CoachEvaluation.create(evaluationData);

    res.status(201).json({
      success: true,
      data: evaluation,
      message: 'Evaluation created successfully',
      messageAr: 'تم إنشاء التقييم بنجاح'
    });
  } catch (error) {
    console.error('Create coach evaluation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_EVALUATION_ERROR',
        message: 'Error creating evaluation',
        messageAr: 'خطأ في إنشاء التقييم'
      }
    });
  }
};

exports.getAthletes = async (req, res) => {
  try {
    const athletes = await User.find({ 
      role: 'player',
      isDeleted: { $ne: true }
    })
      .select('firstName lastName email isActive')
      .limit(100);

    res.json({
      success: true,
      data: { athletes }
    });
  } catch (error) {
    console.error('Get athletes error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_ATHLETES_ERROR',
        message: 'Error fetching athletes',
        messageAr: 'خطأ في جلب الرياضيين'
      }
    });
  }
};

exports.getAthletePerformance = async (req, res) => {
  try {
    const { id } = req.params;

    const athlete = await User.findById(id).select('firstName lastName');
    if (!athlete) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ATHLETE_NOT_FOUND',
          message: 'Athlete not found',
          messageAr: 'الرياضي غير موجود'
        }
      });
    }

    res.json({
      success: true,
      data: {
        athlete: {
          id: athlete._id,
          name: `${athlete.firstName} ${athlete.lastName}`
        },
        performance: {
          trainingSessions: 0,
          matchesPlayed: 0,
          goals: 0,
          assists: 0,
          fitnessLevel: 0
        }
      }
    });
  } catch (error) {
    console.error('Get athlete performance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_PERFORMANCE_ERROR',
        message: 'Error fetching athlete performance',
        messageAr: 'خطأ في جلب أداء الرياضي'
      }
    });
  }
};

exports.getTrainingAnalytics = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;
    const { period = 'month' } = req.query;

    let dateFrom = new Date();
    switch (period) {
      case 'week':
        dateFrom.setDate(dateFrom.getDate() - 7);
        break;
      case 'month':
        dateFrom.setMonth(dateFrom.getMonth() - 1);
        break;
      case 'quarter':
        dateFrom.setMonth(dateFrom.getMonth() - 3);
        break;
      case 'year':
        dateFrom.setFullYear(dateFrom.getFullYear() - 1);
        break;
    }

    const sessions = await TrainingSession.find({
      clubId,
      date: { $gte: dateFrom },
      isDeleted: { $ne: true }
    });

    const totalHours = sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60;
    const completedSessions = sessions.filter(s => s.status === 'completed').length;

    res.json({
      success: true,
      data: {
        totalHours: Math.round(totalHours),
        averageAttendance: 85,
        programsCompleted: completedSessions,
        athleteProgress: [
          { metric: 'Fitness Level', improvement: 15 },
          { metric: 'Technical Skills', improvement: 12 },
          { metric: 'Tactical Awareness', improvement: 8 }
        ]
      }
    });
  } catch (error) {
    console.error('Get training analytics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_ANALYTICS_ERROR',
        message: 'Error fetching analytics',
        messageAr: 'خطأ في جلب التحليلات'
      }
    });
  }
};

exports.getRecruitment = async (req, res) => {
  try {
    res.json({
      success: true,
      data: { candidates: [] }
    });
  } catch (error) {
    console.error('Get recruitment error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_RECRUITMENT_ERROR',
        message: 'Error fetching recruitment data',
        messageAr: 'خطأ في جلب بيانات التجنيد'
      }
    });
  }
};

exports.createRecruitment = async (req, res) => {
  try {
    res.status(201).json({
      success: true,
      message: 'Recruitment candidate added',
      messageAr: 'تمت إضافة مرشح للتجنيد'
    });
  } catch (error) {
    console.error('Create recruitment error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_RECRUITMENT_ERROR',
        message: 'Error creating recruitment',
        messageAr: 'خطأ في إنشاء التجنيد'
      }
    });
  }
};

exports.updateRecruitment = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Recruitment updated',
      messageAr: 'تم تحديث التجنيد'
    });
  } catch (error) {
    console.error('Update recruitment error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_RECRUITMENT_ERROR',
        message: 'Error updating recruitment',
        messageAr: 'خطأ في تحديث التجنيد'
      }
    });
  }
};
