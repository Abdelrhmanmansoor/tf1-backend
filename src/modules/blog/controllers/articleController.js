const Article = require('../models/Article');
const { uploadPortfolioImage } = require('../../../config/cloudinary');

// @desc    Create new article
// @route   POST /api/v1/blog/articles
// @access  Private (admin only)
exports.createArticle = async (req, res) => {
  try {
    const {
      title,
      titleAr,
      content,
      contentAr,
      excerpt,
      excerptAr,
      category,
      categoryAr,
      tags,
      seoTitle,
      seoDescription,
      seoKeywords,
    } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required',
        code: 'MISSING_REQUIRED_FIELDS',
      });
    }

    // Verify admin (redundant check but for safety)
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
        code: 'ADMIN_ONLY',
      });
    }

    // Handle cover image upload
    let coverImage = null;
    if (req.file) {
      try {
        const uploadResult = await uploadPortfolioImage(
          req.file.buffer,
          req.user._id.toString(),
          'blog'
        );
        coverImage = {
          url: uploadResult.url,
          publicId: uploadResult.publicId,
        };
      } catch (uploadError) {
        console.error('Cover image upload error:', uploadError);
        // Continue without cover image
      }
    }

    // Create article
    const article = new Article({
      title,
      titleAr,
      content,
      contentAr,
      excerpt: excerpt || content.substring(0, 500),
      excerptAr,
      author: req.user._id,
      category,
      categoryAr,
      tags: tags || [],
      coverImage,
      seoTitle,
      seoDescription,
      seoKeywords,
      status: 'draft',
    });

    await article.save();

    res.status(201).json({
      success: true,
      message: 'Article created successfully',
      data: article,
    });
  } catch (error) {
    console.error('Create article error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating article',
      error: error.message,
      code: 'CREATE_ERROR',
    });
  }
};

// @desc    Get all published articles
// @route   GET /api/v1/blog/articles
// @access  Public
exports.getArticles = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search, featured } = req.query;

    let query = { isPublished: true, isDeleted: false };

    if (category) query.category = category;
    if (featured === 'true') query.isFeatured = true;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const articles = await Article.find(query)
      .populate('author', 'firstName lastName profilePicture')
      .sort({ publishedAt: -1, isFeatured: -1 })
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
      error: error.message,
      code: 'FETCH_ERROR',
    });
  }
};

// @desc    Get article by slug or ID
// @route   GET /api/v1/blog/articles/:id
// @access  Public
exports.getArticle = async (req, res) => {
  try {
    const { id } = req.params;

    const article = await Article.findOne({
      $or: [{ _id: id }, { slug: id }],
      isDeleted: false,
    }).populate('author', 'firstName lastName profilePicture email');

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found',
        code: 'NOT_FOUND',
      });
    }

    // Check access (published or author)
    if (!article.isPublished && article.author._id.toString() !== req.user?._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        code: 'ACCESS_DENIED',
      });
    }

    // Increment views if published
    if (article.isPublished) {
      article.views += 1;
      await article.save();
    }

    res.status(200).json({
      success: true,
      data: article,
    });
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching article',
      error: error.message,
      code: 'FETCH_ERROR',
    });
  }
};

// @desc    Update article
// @route   PATCH /api/v1/blog/articles/:id
// @access  Private (admin only)
exports.updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, titleAr, content, contentAr, excerpt, excerptAr, category, categoryAr, tags, seoTitle, seoDescription, seoKeywords } = req.body;

    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found',
        code: 'NOT_FOUND',
      });
    }

    // Check authorization - admin only
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
        code: 'ADMIN_ONLY',
      });
    }

    // Update fields
    if (title) article.title = title;
    if (titleAr) article.titleAr = titleAr;
    if (content) article.content = content;
    if (contentAr) article.contentAr = contentAr;
    if (excerpt) article.excerpt = excerpt;
    if (excerptAr) article.excerptAr = excerptAr;
    if (category) article.category = category;
    if (categoryAr) article.categoryAr = categoryAr;
    if (tags) article.tags = tags;
    if (seoTitle) article.seoTitle = seoTitle;
    if (seoDescription) article.seoDescription = seoDescription;
    if (seoKeywords) article.seoKeywords = seoKeywords;

    await article.save();

    res.status(200).json({
      success: true,
      message: 'Article updated successfully',
      data: article,
    });
  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating article',
      error: error.message,
      code: 'UPDATE_ERROR',
    });
  }
};

// @desc    Delete article
// @route   DELETE /api/v1/blog/articles/:id
// @access  Private (admin only)
exports.deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;

    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found',
        code: 'NOT_FOUND',
      });
    }

    // Check authorization - admin only
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
        code: 'ADMIN_ONLY',
      });
    }

    // Soft delete
    article.isDeleted = true;
    article.deletedAt = new Date();
    await article.save();

    res.status(200).json({
      success: true,
      message: 'Article deleted successfully',
    });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting article',
      error: error.message,
      code: 'DELETE_ERROR',
    });
  }
};

// @desc    Publish article
// @route   POST /api/v1/blog/articles/:id/publish
// @access  Private (admin only)
exports.publishArticle = async (req, res) => {
  try {
    const { id } = req.params;

    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found',
        code: 'NOT_FOUND',
      });
    }

    // Check authorization - admin only
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
        code: 'ADMIN_ONLY',
      });
    }

    article.status = 'published';
    article.isPublished = true;
    article.publishedAt = new Date();
    await article.save();

    res.status(200).json({
      success: true,
      message: 'Article published successfully',
      data: article,
    });
  } catch (error) {
    console.error('Publish article error:', error);
    res.status(500).json({
      success: false,
      message: 'Error publishing article',
      error: error.message,
      code: 'PUBLISH_ERROR',
    });
  }
};

// @desc    Unpublish article
// @route   POST /api/v1/blog/articles/:id/unpublish
// @access  Private (admin only)
exports.unpublishArticle = async (req, res) => {
  try {
    const { id } = req.params;

    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found',
        code: 'NOT_FOUND',
      });
    }

    // Check authorization - admin only
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
        code: 'ADMIN_ONLY',
      });
    }

    article.status = 'draft';
    article.isPublished = false;
    await article.save();

    res.status(200).json({
      success: true,
      message: 'Article unpublished successfully',
      data: article,
    });
  } catch (error) {
    console.error('Unpublish article error:', error);
    res.status(500).json({
      success: false,
      message: 'Error unpublishing article',
      error: error.message,
      code: 'UNPUBLISH_ERROR',
    });
  }
};

// @desc    Like article
// @route   POST /api/v1/blog/articles/:id/like
// @access  Private
exports.likeArticle = async (req, res) => {
  try {
    const { id } = req.params;

    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found',
        code: 'NOT_FOUND',
      });
    }

    const alreadyLiked = article.likes.some(
      like => like.userId.toString() === req.user._id.toString()
    );

    if (!alreadyLiked) {
      article.likes.push({ userId: req.user._id });
      await article.save();
    }

    res.status(200).json({
      success: true,
      message: 'Article liked',
      likesCount: article.likes.length,
    });
  } catch (error) {
    console.error('Like article error:', error);
    res.status(500).json({
      success: false,
      message: 'Error liking article',
      error: error.message,
      code: 'LIKE_ERROR',
    });
  }
};

// @desc    Unlike article
// @route   POST /api/v1/blog/articles/:id/unlike
// @access  Private
exports.unlikeArticle = async (req, res) => {
  try {
    const { id } = req.params;

    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found',
        code: 'NOT_FOUND',
      });
    }

    article.likes = article.likes.filter(
      like => like.userId.toString() !== req.user._id.toString()
    );
    await article.save();

    res.status(200).json({
      success: true,
      message: 'Article unliked',
      likesCount: article.likes.length,
    });
  } catch (error) {
    console.error('Unlike article error:', error);
    res.status(500).json({
      success: false,
      message: 'Error unliking article',
      error: error.message,
      code: 'UNLIKE_ERROR',
    });
  }
};

// @desc    Add comment to article
// @route   POST /api/v1/blog/articles/:id/comments
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || text.trim().length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required',
        code: 'MISSING_TEXT',
      });
    }

    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found',
        code: 'NOT_FOUND',
      });
    }

    const user = await require('../../../modules/shared/models/User').findById(req.user._id);

    article.comments.push({
      userId: req.user._id,
      name: `${user.firstName} ${user.lastName}`,
      text,
    });

    await article.save();

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      commentsCount: article.comments.length,
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding comment',
      error: error.message,
      code: 'COMMENT_ERROR',
    });
  }
};
