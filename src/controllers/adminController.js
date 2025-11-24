const User = require('../modules/shared/models/User');
const Article = require('../modules/blog/models/Article');

// @desc    Get admin dashboard stats
// @route   GET /api/v1/admin/dashboard
// @access  Private (admin only)
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isDeleted: false });
    const totalArticles = await Article.countDocuments({ isDeleted: false });
    const publishedArticles = await Article.countDocuments({
      isPublished: true,
      isDeleted: false,
    });
    const draftArticles = await Article.countDocuments({
      isPublished: false,
      isDeleted: false,
    });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalArticles,
        publishedArticles,
        draftArticles,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard stats',
      code: 'STATS_ERROR',
    });
  }
};

// @desc    Get all articles (for admin management)
// @route   GET /api/v1/admin/articles
// @access  Private (admin only)
exports.getAllArticles = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = { isDeleted: false };
    if (status) query.status = status;

    const articles = await Article.find(query)
      .populate('author', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Article.countDocuments(query);

    res.status(200).json({
      success: true,
      count: articles.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: articles,
    });
  } catch (error) {
    console.error('Get articles error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching articles',
      code: 'FETCH_ERROR',
    });
  }
};

// @desc    Get all users (for admin management)
// @route   GET /api/v1/admin/users
// @access  Private (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = { isDeleted: false };
    if (role) query.role = role;

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: users,
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      code: 'FETCH_ERROR',
    });
  }
};

// @desc    Delete user (soft delete)
// @route   DELETE /api/v1/admin/users/:userId
// @access  Private (admin only)
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'NOT_FOUND',
      });
    }

    // Prevent deleting admin accounts
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin accounts',
        code: 'ADMIN_DELETE_FORBIDDEN',
      });
    }

    user.isDeleted = true;
    user.deletedAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      code: 'DELETE_ERROR',
    });
  }
};

// @desc    Feature/unfeature article
// @route   PATCH /api/v1/admin/articles/:articleId/feature
// @access  Private (admin only)
exports.featureArticle = async (req, res) => {
  try {
    const { articleId } = req.params;
    const { isFeatured, featuredUntil } = req.body;

    const article = await Article.findById(articleId);
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found',
        code: 'NOT_FOUND',
      });
    }

    article.isFeatured = isFeatured;
    if (isFeatured && featuredUntil) {
      article.featuredUntil = new Date(featuredUntil);
    }
    await article.save();

    res.status(200).json({
      success: true,
      message: `Article ${isFeatured ? 'featured' : 'unfeatured'} successfully`,
      data: article,
    });
  } catch (error) {
    console.error('Feature article error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating article',
      code: 'UPDATE_ERROR',
    });
  }
};
