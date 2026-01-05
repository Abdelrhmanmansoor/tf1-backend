const { logAdminAction } = require('../middleware/adminAuth');
const User = require('../../shared/models/User');

// Get all users
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search, status } = req.query;
    const skip = (page - 1) * limit;

    const filters = {};
    if (role) filters.role = role;
    if (status) filters.isActive = status === 'active';
    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filters)
      .select('name email role isActive createdAt lastLogin')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .lean();

    const total = await User.countDocuments(filters);

    await logAdminAction(
      req,
      'VIEW_USERS',
      'USER',
      null,
      'SUCCESS',
      null,
      'Users list accessed'
    );

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message,
    });
  }
};

// Get user details
exports.getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('-password')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    await logAdminAction(
      req,
      'VIEW_USER',
      'USER',
      userId,
      'SUCCESS',
      null,
      `User profile viewed: ${user.name}`
    );

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message,
    });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, phone, isActive, profile } = req.body;

    const user = await User.findById(userId).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (phone) updates.phone = phone;
    if (isActive !== undefined) updates.isActive = isActive;
    if (profile) updates.profile = profile;

    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
    }).select('-password');

    await logAdminAction(
      req,
      'UPDATE_USER',
      'USER',
      userId,
      'SUCCESS',
      {
        before: user,
        after: updatedUser.toObject(),
      },
      `Updated user: ${user.name}`
    );

    res.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('Error updating user:', error);

    await logAdminAction(
      req,
      'UPDATE_USER',
      'USER',
      req.params.userId,
      'FAILED',
      null,
      'Failed to update user',
      error.message
    );

    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message,
    });
  }
};

// Deactivate user
exports.deactivateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    ).select('-password');

    await logAdminAction(
      req,
      'UPDATE_USER',
      'USER',
      userId,
      'SUCCESS',
      {
        before: { isActive: user.isActive },
        after: { isActive: false },
      },
      `Deactivated user: ${user.name}`
    );

    res.json({
      success: true,
      data: updatedUser,
      message: 'User deactivated successfully',
    });
  } catch (error) {
    console.error('Error deactivating user:', error);

    await logAdminAction(
      req,
      'UPDATE_USER',
      'USER',
      req.params.userId,
      'FAILED',
      null,
      'Failed to deactivate user',
      error.message
    );

    res.status(500).json({
      success: false,
      message: 'Error deactivating user',
      error: error.message,
    });
  }
};

// Get user statistics
exports.getUserStatistics = async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          activeCount: {
            $sum: {
              $cond: ['$isActive', 1, 0],
            },
          },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    const totalStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: {
              $cond: ['$isActive', 1, 0],
            },
          },
          inactiveUsers: {
            $sum: {
              $cond: ['$isActive', 0, 1],
            },
          },
        },
      },
    ]);

    const registrationTrend = await User.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          newUsers: { $sum: 1 },
        },
      },
      {
        $sort: { _id: -1 },
      },
      {
        $limit: 30,
      },
    ]);

    await logAdminAction(
      req,
      'VIEW_SYSTEM',
      'SYSTEM',
      null,
      'SUCCESS',
      null,
      'User statistics accessed'
    );

    res.json({
      success: true,
      data: {
        byRole: stats,
        total: totalStats[0] || { totalUsers: 0, activeUsers: 0, inactiveUsers: 0 },
        registrationTrend,
      },
    });
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user statistics',
      error: error.message,
    });
  }
};

module.exports = {
  getUsers,
  getUserDetails,
  updateUser,
  deactivateUser,
  getUserStatistics,
};
