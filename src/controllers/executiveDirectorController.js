const { KPI, Initiative, Partnership, Announcement, Program } = require('../models/admin');
const User = require('../modules/shared/models/User');

exports.getDashboard = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;

    const [
      totalMembers,
      activePartnerships,
      pendingDecisions,
      upcomingMeetings
    ] = await Promise.all([
      User.countDocuments({ isDeleted: { $ne: true } }),
      Partnership.countDocuments({ clubId, status: 'active', isDeleted: { $ne: true } }),
      Initiative.countDocuments({ clubId, status: 'planning', isDeleted: { $ne: true } }),
      0
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalRevenue: 2450000,
          monthlyGrowth: 12.5,
          totalMembers,
          activePartnerships,
          pendingDecisions,
          upcomingMeetings
        }
      }
    });
  } catch (error) {
    console.error('Executive director dashboard error:', error);
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

exports.getKPIs = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;
    const kpis = await KPI.find({ clubId, isActive: true })
      .sort({ category: 1, name: 1 });

    res.json({
      success: true,
      data: { kpis }
    });
  } catch (error) {
    console.error('Get KPIs error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_KPIS_ERROR',
        message: 'Error fetching KPIs',
        messageAr: 'خطأ في جلب مؤشرات الأداء'
      }
    });
  }
};

exports.updateKPI = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const kpi = await KPI.findById(id);
    if (!kpi) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'KPI_NOT_FOUND',
          message: 'KPI not found',
          messageAr: 'مؤشر الأداء غير موجود'
        }
      });
    }

    if (updates.value !== undefined && updates.value !== kpi.value) {
      kpi.history.push({
        value: kpi.value,
        date: new Date(),
        notes: 'Value updated'
      });
      kpi.previousValue = kpi.value;
      kpi.trend = updates.value > kpi.value ? 'up' : (updates.value < kpi.value ? 'down' : 'stable');
    }

    Object.assign(kpi, updates);
    kpi.lastUpdatedBy = req.user._id;
    await kpi.save();

    res.json({
      success: true,
      data: kpi,
      message: 'KPI updated successfully',
      messageAr: 'تم تحديث مؤشر الأداء بنجاح'
    });
  } catch (error) {
    console.error('Update KPI error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_KPI_ERROR',
        message: 'Error updating KPI',
        messageAr: 'خطأ في تحديث مؤشر الأداء'
      }
    });
  }
};

exports.getInitiatives = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;
    const { status, priority } = req.query;

    const query = { clubId, isDeleted: { $ne: true } };
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const initiatives = await Initiative.find(query)
      .populate('owner', 'firstName lastName')
      .sort({ priority: 1, deadline: 1 });

    res.json({
      success: true,
      data: { initiatives }
    });
  } catch (error) {
    console.error('Get initiatives error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_INITIATIVES_ERROR',
        message: 'Error fetching initiatives',
        messageAr: 'خطأ في جلب المبادرات'
      }
    });
  }
};

exports.createInitiative = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;
    const initiativeData = {
      ...req.body,
      clubId,
      createdBy: req.user._id
    };

    const initiative = await Initiative.create(initiativeData);

    res.status(201).json({
      success: true,
      data: initiative,
      message: 'Initiative created successfully',
      messageAr: 'تم إنشاء المبادرة بنجاح'
    });
  } catch (error) {
    console.error('Create initiative error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_INITIATIVE_ERROR',
        message: 'Error creating initiative',
        messageAr: 'خطأ في إنشاء المبادرة'
      }
    });
  }
};

exports.updateInitiative = async (req, res) => {
  try {
    const initiative = await Initiative.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!initiative) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INITIATIVE_NOT_FOUND',
          message: 'Initiative not found',
          messageAr: 'المبادرة غير موجودة'
        }
      });
    }

    res.json({
      success: true,
      data: initiative,
      message: 'Initiative updated successfully',
      messageAr: 'تم تحديث المبادرة بنجاح'
    });
  } catch (error) {
    console.error('Update initiative error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_INITIATIVE_ERROR',
        message: 'Error updating initiative',
        messageAr: 'خطأ في تحديث المبادرة'
      }
    });
  }
};

exports.deleteInitiative = async (req, res) => {
  try {
    const initiative = await Initiative.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );

    if (!initiative) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INITIATIVE_NOT_FOUND',
          message: 'Initiative not found',
          messageAr: 'المبادرة غير موجودة'
        }
      });
    }

    res.json({
      success: true,
      message: 'Initiative deleted successfully',
      messageAr: 'تم حذف المبادرة بنجاح'
    });
  } catch (error) {
    console.error('Delete initiative error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_INITIATIVE_ERROR',
        message: 'Error deleting initiative',
        messageAr: 'خطأ في حذف المبادرة'
      }
    });
  }
};

exports.getPartnerships = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;
    const { status, type } = req.query;

    const query = { clubId, isDeleted: { $ne: true } };
    if (status) query.status = status;
    if (type) query.type = type;

    const partnerships = await Partnership.find(query)
      .sort({ tier: 1, createdAt: -1 });

    res.json({
      success: true,
      data: { partnerships }
    });
  } catch (error) {
    console.error('Get partnerships error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_PARTNERSHIPS_ERROR',
        message: 'Error fetching partnerships',
        messageAr: 'خطأ في جلب الشراكات'
      }
    });
  }
};

exports.createPartnership = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;
    const partnershipData = {
      ...req.body,
      clubId,
      createdBy: req.user._id
    };

    const partnership = await Partnership.create(partnershipData);

    res.status(201).json({
      success: true,
      data: partnership,
      message: 'Partnership created successfully',
      messageAr: 'تم إنشاء الشراكة بنجاح'
    });
  } catch (error) {
    console.error('Create partnership error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_PARTNERSHIP_ERROR',
        message: 'Error creating partnership',
        messageAr: 'خطأ في إنشاء الشراكة'
      }
    });
  }
};

exports.updatePartnership = async (req, res) => {
  try {
    const partnership = await Partnership.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!partnership) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PARTNERSHIP_NOT_FOUND',
          message: 'Partnership not found',
          messageAr: 'الشراكة غير موجودة'
        }
      });
    }

    res.json({
      success: true,
      data: partnership,
      message: 'Partnership updated successfully',
      messageAr: 'تم تحديث الشراكة بنجاح'
    });
  } catch (error) {
    console.error('Update partnership error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_PARTNERSHIP_ERROR',
        message: 'Error updating partnership',
        messageAr: 'خطأ في تحديث الشراكة'
      }
    });
  }
};

exports.getFinancialReports = async (req, res) => {
  try {
    const { period = 'month', year, month } = req.query;

    res.json({
      success: true,
      data: {
        revenue: {
          total: 2450000,
          breakdown: [
            { source: 'Memberships', amount: 1500000 },
            { source: 'Sponsorships', amount: 800000 },
            { source: 'Events', amount: 150000 }
          ]
        },
        expenses: {
          total: 1800000,
          breakdown: [
            { category: 'Staff', amount: 900000 },
            { category: 'Facilities', amount: 500000 },
            { category: 'Operations', amount: 400000 }
          ]
        },
        profit: 650000
      }
    });
  } catch (error) {
    console.error('Get financial reports error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_REPORTS_ERROR',
        message: 'Error fetching financial reports',
        messageAr: 'خطأ في جلب التقارير المالية'
      }
    });
  }
};

exports.getAnnouncements = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;
    const { status } = req.query;

    const query = { clubId, isDeleted: { $ne: true } };
    if (status) query.status = status;

    const announcements = await Announcement.find(query)
      .sort({ publishDate: -1 });

    res.json({
      success: true,
      data: { announcements }
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_ANNOUNCEMENTS_ERROR',
        message: 'Error fetching announcements',
        messageAr: 'خطأ في جلب الإعلانات'
      }
    });
  }
};

exports.createAnnouncement = async (req, res) => {
  try {
    const clubId = req.user.clubId || req.user._id;
    const announcementData = {
      ...req.body,
      clubId,
      createdBy: req.user._id
    };

    const announcement = await Announcement.create(announcementData);

    res.status(201).json({
      success: true,
      data: announcement,
      message: 'Announcement created successfully',
      messageAr: 'تم إنشاء الإعلان بنجاح'
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_ANNOUNCEMENT_ERROR',
        message: 'Error creating announcement',
        messageAr: 'خطأ في إنشاء الإعلان'
      }
    });
  }
};

exports.updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ANNOUNCEMENT_NOT_FOUND',
          message: 'Announcement not found',
          messageAr: 'الإعلان غير موجود'
        }
      });
    }

    res.json({
      success: true,
      data: announcement,
      message: 'Announcement updated successfully',
      messageAr: 'تم تحديث الإعلان بنجاح'
    });
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ANNOUNCEMENT_ERROR',
        message: 'Error updating announcement',
        messageAr: 'خطأ في تحديث الإعلان'
      }
    });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );

    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ANNOUNCEMENT_NOT_FOUND',
          message: 'Announcement not found',
          messageAr: 'الإعلان غير موجود'
        }
      });
    }

    res.json({
      success: true,
      message: 'Announcement deleted successfully',
      messageAr: 'تم حذف الإعلان بنجاح'
    });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_ANNOUNCEMENT_ERROR',
        message: 'Error deleting announcement',
        messageAr: 'خطأ في حذف الإعلان'
      }
    });
  }
};
