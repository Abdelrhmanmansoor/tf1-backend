const { logAdminAction } = require('../middleware/adminAuth');
const User = require('../../shared/models/User');
const Job = require('../../club/models/Job');
const JobApplication = require('../../club/models/JobApplication');
const CV = require('../../cv/models/CV');
const mongoose = require('mongoose');

/**
 * Get comprehensive platform statistics
 * This is the "scary" level of control - everything is monitored
 */
exports.getComprehensiveStats = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // ========== USERS STATISTICS ==========
    const [
      totalUsers,
      activeUsers,
      blockedUsers,
      usersByRole,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      usersLastLogin,
    ] = await Promise.all([
      User.countDocuments({ isDeleted: { $ne: true } }),
      User.countDocuments({ isActive: true, isDeleted: { $ne: true } }),
      User.countDocuments({ isActive: false, isDeleted: { $ne: true } }),
      User.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      User.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        isDeleted: { $ne: true },
      }),
      User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        isDeleted: { $ne: true },
      }),
      User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        isDeleted: { $ne: true },
      }),
      User.countDocuments({
        lastLogin: { $gte: startDate },
        isDeleted: { $ne: true },
      }),
    ]);

    // ========== JOBS STATISTICS ==========
    const [
      totalJobs,
      activeJobs,
      closedJobs,
      jobsByCategory,
      jobsByType,
      newJobsToday,
      newJobsThisWeek,
      jobsWithApplications,
    ] = await Promise.all([
      Job.countDocuments({ isDeleted: { $ne: true } }),
      Job.countDocuments({ isActive: true, status: 'open', isDeleted: { $ne: true } }),
      Job.countDocuments({ status: 'closed', isDeleted: { $ne: true } }),
      Job.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Job.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$jobType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Job.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        isDeleted: { $ne: true },
      }),
      Job.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        isDeleted: { $ne: true },
      }),
      Job.countDocuments({
        'applications.0': { $exists: true },
        isDeleted: { $ne: true },
      }),
    ]);

    // ========== JOB APPLICATIONS STATISTICS ==========
    const [
      totalApplications,
      pendingApplications,
      acceptedApplications,
      rejectedApplications,
      applicationsToday,
      applicationsThisWeek,
      applicationsByStatus,
    ] = await Promise.all([
      JobApplication.countDocuments({ isDeleted: { $ne: true } }),
      JobApplication.countDocuments({ status: 'pending', isDeleted: { $ne: true } }),
      JobApplication.countDocuments({ status: 'accepted', isDeleted: { $ne: true } }),
      JobApplication.countDocuments({ status: 'rejected', isDeleted: { $ne: true } }),
      JobApplication.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        isDeleted: { $ne: true },
      }),
      JobApplication.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        isDeleted: { $ne: true },
      }),
      JobApplication.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    // ========== CVs STATISTICS ==========
    let cvsStats = {
      totalCVs: 0,
      completedCVs: 0,
      incompleteCVs: 0,
      cvsWithFiles: 0,
      cvsToday: 0,
      cvsThisWeek: 0,
    };

    try {
      const [
        totalCVs,
        cvsWithFiles,
        cvsToday,
        cvsThisWeek,
      ] = await Promise.all([
        CV.countDocuments({ isDeleted: { $ne: true } }),
        CV.countDocuments({ cvFile: { $exists: true, $ne: null }, isDeleted: { $ne: true } }),
        CV.countDocuments({
          createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          isDeleted: { $ne: true },
        }),
        CV.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          isDeleted: { $ne: true },
        }),
      ]);

      cvsStats = {
        totalCVs,
        completedCVs: totalCVs, // Simplified - can be enhanced with isComplete field
        incompleteCVs: 0,
        cvsWithFiles,
        cvsToday,
        cvsThisWeek,
      };
    } catch (cvError) {
      console.error('Error fetching CV stats:', cvError);
      // Continue without CV stats if model doesn't exist
    }

    // ========== SYSTEM HEALTH ==========
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    // ========== ACTIVITY TRENDS ==========
    const userRegistrationTrend = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const jobCreationTrend = await Job.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const applicationTrend = await JobApplication.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // ========== SECURITY METRICS ==========
    const securityMetrics = {
      blockedUsers,
      suspiciousActivity: 0, // Can be enhanced with actual security logs
      failedLoginAttempts: 0, // Can be enhanced with auth logs
      activeSessions: 0, // Can be enhanced with session tracking
    };

    // ========== COMPREHENSIVE RESPONSE ==========
    const comprehensiveStats = {
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        blocked: blockedUsers,
        byRole: usersByRole,
        newToday: newUsersToday,
        newThisWeek: newUsersThisWeek,
        newThisMonth: newUsersThisMonth,
        lastLoginCount: usersLastLogin,
        registrationTrend: userRegistrationTrend,
      },
      jobs: {
        total: totalJobs,
        active: activeJobs,
        closed: closedJobs,
        byCategory: jobsByCategory,
        byType: jobsByType,
        newToday: newJobsToday,
        newThisWeek: newJobsThisWeek,
        withApplications: jobsWithApplications,
        creationTrend: jobCreationTrend,
      },
      applications: {
        total: totalApplications,
        pending: pendingApplications,
        accepted: acceptedApplications,
        rejected: rejectedApplications,
        today: applicationsToday,
        thisWeek: applicationsThisWeek,
        byStatus: applicationsByStatus,
        trend: applicationTrend,
      },
      cvs: cvsStats,
      system: {
        database: {
          status: dbStatus,
          connectionState: mongoose.connection.readyState,
        },
        server: {
          uptime: Math.floor(uptime),
          uptimeFormatted: formatUptime(uptime),
          memory: {
            used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            external: Math.round(memoryUsage.external / 1024 / 1024),
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
          },
          nodeVersion: process.version,
        },
      },
      security: securityMetrics,
      timestamp: new Date().toISOString(),
    };

    await logAdminAction(
      req,
      'VIEW_COMPREHENSIVE_STATS',
      'SYSTEM',
      null,
      'SUCCESS',
      null,
      'Comprehensive platform statistics accessed'
    );

    res.json({
      success: true,
      data: comprehensiveStats,
    });
  } catch (error) {
    console.error('Error fetching comprehensive stats:', error);

    await logAdminAction(
      req,
      'VIEW_COMPREHENSIVE_STATS',
      'SYSTEM',
      null,
      'FAILED',
      null,
      'Failed to fetch comprehensive stats',
      error.message
    );

    res.status(500).json({
      success: false,
      message: 'Error fetching comprehensive statistics',
      error: error.message,
    });
  }
};

// Helper function to format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

module.exports = {
  getComprehensiveStats,
};

