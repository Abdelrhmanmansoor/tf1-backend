const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { checkTeamPermission, logAction } = require('../middleware/rbac');
const logger = require('../utils/logger') || console;

router.use(authenticate);
router.use(authorize('admin', 'administrative-officer'));

router.get('/dashboard', logAction('dashboard', 'view', 'Administrative Officer dashboard accessed'), async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        role: 'administrative-officer',
        roleAr: 'موظف إداري - الميدان الرياضي',
        user: {
          id: req.user._id,
          name: `${req.user.firstName} ${req.user.lastName}`,
          email: req.user.email
        },
        allowedModules: [
          { name: 'Dashboard', nameAr: 'لوحة التحكم', icon: 'dashboard', path: '/administrative-officer/dashboard' },
          { name: 'Field Reports', nameAr: 'تقارير الميدان', icon: 'clipboard', path: '/administrative-officer/reports' },
          { name: 'Attendance', nameAr: 'الحضور والغياب', icon: 'calendar', path: '/administrative-officer/attendance' },
          { name: 'Schedule', nameAr: 'الجدول', icon: 'clock', path: '/administrative-officer/schedule' },
          { name: 'Facilities', nameAr: 'المرافق', icon: 'building', path: '/administrative-officer/facilities' }
        ],
        stats: {
          totalReports: 0,
          pendingTasks: 0,
          todayAttendance: 0
        }
      }
    });
  } catch (error) {
    logger.error('Administrative Officer dashboard error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DASHBOARD_ERROR',
        message: 'Error loading dashboard',
        messageAr: 'خطأ في تحميل لوحة التحكم'
      }
    });
  }
});

router.get('/reports', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        reports: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Error fetching reports',
        messageAr: 'خطأ في جلب التقارير'
      }
    });
  }
});

router.get('/schedule', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        schedule: [],
        week: new Date().toISOString().split('T')[0]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Error fetching schedule',
        messageAr: 'خطأ في جلب الجدول'
      }
    });
  }
});

router.get('/facilities', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        facilities: [
          { id: 1, name: 'الملعب الرئيسي', nameEn: 'Main Stadium', status: 'available', statusAr: 'متاح' },
          { id: 2, name: 'صالة التدريب', nameEn: 'Training Hall', status: 'available', statusAr: 'متاح' },
          { id: 3, name: 'غرفة تغيير الملابس', nameEn: 'Locker Room', status: 'available', statusAr: 'متاح' }
        ]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Error fetching facilities',
        messageAr: 'خطأ في جلب المرافق'
      }
    });
  }
});

module.exports = router;
