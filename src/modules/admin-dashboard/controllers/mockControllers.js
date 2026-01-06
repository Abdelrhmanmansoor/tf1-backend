/**
 * Admin Dashboard Mock Controllers for Development
 * Used when MongoDB is not available
 */

// Mock getDashboardOverview
exports.getDashboardOverview = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Dashboard Overview',
      data: {
        totalActions: 1250,
        successfulActions: 1200,
        failedActions: 50,
        lastActions: [
          { type: 'LOGIN', count: 156, success: 150, failed: 6 },
          { type: 'CREATE', count: 340, success: 340, failed: 0 },
          { type: 'UPDATE', count: 420, success: 410, failed: 10 },
          { type: 'DELETE', count: 123, success: 120, failed: 3 },
          { type: 'VIEW', count: 211, success: 200, failed: 11 }
        ],
        topAdmins: [
          { id: 'admin1', name: 'Admin User 1', actions: 456 },
          { id: 'admin2', name: 'Admin User 2', actions: 234 }
        ],
        systemStatus: {
          database: 'Warning',
          api: 'Active',
          socketio: 'Active',
          rateLimiting: 'Enabled'
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard overview',
      error: error.message
    });
  }
};

// Mock getActivityLogs
exports.getActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, actionType } = req.query;
    
    const logs = [
      {
        id: '1',
        actionType: 'LOGIN',
        targetType: 'SYSTEM',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        status: 'SUCCESS',
        createdAt: new Date(Date.now() - 1000000).toISOString(),
        metadata: { browser: 'Chrome 91', os: 'Windows 10', deviceType: 'desktop' }
      },
      {
        id: '2',
        actionType: 'CREATE',
        targetType: 'USER',
        targetId: 'user123',
        ipAddress: '192.168.1.2',
        userAgent: 'Mozilla/5.0',
        status: 'SUCCESS',
        createdAt: new Date(Date.now() - 500000).toISOString(),
        metadata: { browser: 'Firefox 89', os: 'Ubuntu', deviceType: 'desktop' }
      },
      {
        id: '3',
        actionType: 'UPDATE',
        targetType: 'POST',
        targetId: 'post456',
        ipAddress: '192.168.1.3',
        userAgent: 'Mozilla/5.0',
        status: 'SUCCESS',
        createdAt: new Date(Date.now() - 200000).toISOString(),
        metadata: { browser: 'Safari 14', os: 'iOS', deviceType: 'mobile' }
      }
    ];

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: logs.length,
        pages: Math.ceil(logs.length / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get activity logs',
      error: error.message
    });
  }
};

// Mock exportLogs
exports.exportLogs = async (req, res) => {
  try {
    const csv = `ActionType,TargetType,Status,IP,Timestamp
LOGIN,SYSTEM,SUCCESS,192.168.1.1,${new Date().toISOString()}
CREATE,USER,SUCCESS,192.168.1.2,${new Date().toISOString()}
UPDATE,POST,SUCCESS,192.168.1.3,${new Date().toISOString()}`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="admin-logs.csv"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to export logs',
      error: error.message
    });
  }
};

// Mock getAdminKeys
exports.getAdminKeys = async (req, res) => {
  try {
    const keys = [
      {
        id: 'key1',
        keyName: 'Test Admin Key',
        keyPrefix: 'sk_admin',
        isActive: true,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 358 * 24 * 60 * 60 * 1000).toISOString(),
        lastUsedAt: new Date(Date.now() - 1000000).toISOString(),
        usageCount: 245
      }
    ];

    res.status(200).json({
      success: true,
      data: keys
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get admin keys',
      error: error.message
    });
  }
};

// Mock createAdminKey
exports.createAdminKey = async (req, res) => {
  try {
    const { keyName, description, expiresIn = 365 } = req.body;

    if (!keyName) {
      return res.status(400).json({
        success: false,
        message: 'keyName is required'
      });
    }

    const newKey = {
      id: 'key_' + Date.now(),
      keyName,
      description: description || '',
      keyPrefix: 'sk_admin_' + Math.random().toString(36).substr(2, 8),
      isActive: true,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000).toISOString(),
      rawKey: 'sk_admin_' + Math.random().toString(36).substr(2, 32)
    };

    res.status(201).json({
      success: true,
      message: 'Admin key created successfully',
      data: newKey
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create admin key',
      error: error.message
    });
  }
};

// Mock getSettings
exports.getSettings = async (req, res) => {
  try {
    const settings = {
      id: 'settings_1',
      siteName: 'SportX Platform',
      siteUrl: 'https://www.tf1one.com',
      adminEmail: 'admin@tf1one.com',
      maintenanceMode: false,
      rateLimitPerMinute: 100,
      jwtExpiresIn: '24h',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get settings',
      error: error.message
    });
  }
};

// Mock updateSettings
exports.updateSettings = async (req, res) => {
  try {
    const { siteName, siteUrl, adminEmail, maintenanceMode } = req.body;

    const updatedSettings = {
      id: 'settings_1',
      siteName: siteName || 'SportX Platform',
      siteUrl: siteUrl || 'https://www.tf1one.com',
      adminEmail: adminEmail || 'admin@tf1one.com',
      maintenanceMode: maintenanceMode || false,
      updatedAt: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: updatedSettings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message
    });
  }
};

// Mock getAllUsers
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    const users = [
      { id: 'user1', name: 'Ahmed Mohamed', email: 'ahmed@example.com', role: 'player', createdAt: new Date().toISOString() },
      { id: 'user2', name: 'Fatima Ali', email: 'fatima@example.com', role: 'coach', createdAt: new Date().toISOString() },
      { id: 'user3', name: 'Omar Hassan', email: 'omar@example.com', role: 'admin', createdAt: new Date().toISOString() }
    ];

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: users.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get users',
      error: error.message
    });
  }
};

// Mock deleteUser
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: { deletedId: userId }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};

// Mock getPostsManager
exports.getPostsManager = async (req, res) => {
  try {
    const { page = 1, status } = req.query;

    const posts = [
      { id: 'post1', title: 'Great Match Today', status: 'published', views: 450, createdAt: new Date().toISOString() },
      { id: 'post2', title: 'New Training Guide', status: 'draft', views: 0, createdAt: new Date().toISOString() }
    ];

    res.status(200).json({
      success: true,
      data: posts,
      pagination: { page: parseInt(page), total: posts.length }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get posts',
      error: error.message
    });
  }
};

// Export all mock controllers
module.exports = {
  getDashboardOverview: exports.getDashboardOverview,
  getActivityLogs: exports.getActivityLogs,
  exportLogs: exports.exportLogs,
  getAdminKeys: exports.getAdminKeys,
  createAdminKey: exports.createAdminKey,
  getSettings: exports.getSettings,
  updateSettings: exports.updateSettings,
  getAllUsers: exports.getAllUsers,
  deleteUser: exports.deleteUser,
  getPostsManager: exports.getPostsManager
};
