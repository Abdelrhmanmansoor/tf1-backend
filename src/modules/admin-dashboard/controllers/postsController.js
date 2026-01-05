const { logAdminAction } = require('../middleware/adminAuth');

// Get all posts (dashboard view)
exports.getPosts = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const skip = (page - 1) * limit;

    const filters = {};
    if (status) filters.status = status;
    if (search) {
      filters.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Assuming you have a Post model - adjust based on your actual structure
    const Post = require('../models/Post') || null;

    if (!Post) {
      return res.status(501).json({
        success: false,
        message: 'Post model not configured',
      });
    }

    const posts = await Post.find(filters)
      .select('title description status createdAt updatedAt author')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .lean();

    const total = await Post.countDocuments(filters);

    await logAdminAction(
      req,
      'VIEW_POSTS',
      'POST',
      null,
      'SUCCESS',
      null,
      'Posts list accessed'
    );

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching posts',
      error: error.message,
    });
  }
};

// Get single post
exports.getPost = async (req, res) => {
  try {
    const { postId } = req.params;

    const Post = require('../models/Post') || null;

    if (!Post) {
      return res.status(501).json({
        success: false,
        message: 'Post model not configured',
      });
    }

    const post = await Post.findById(postId).lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    await logAdminAction(
      req,
      'VIEW_POST',
      'POST',
      postId,
      'SUCCESS',
      null,
      `Post viewed: ${post.title}`
    );

    res.json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching post',
      error: error.message,
    });
  }
};

// Create post
exports.createPost = async (req, res) => {
  try {
    const { title, description, content, status, tags, featuredImage } =
      req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required',
      });
    }

    const Post = require('../models/Post') || null;

    if (!Post) {
      return res.status(501).json({
        success: false,
        message: 'Post model not configured',
      });
    }

    const newPost = new Post({
      title,
      description,
      content,
      status: status || 'DRAFT',
      tags: tags || [],
      featuredImage,
    });

    const savedPost = await newPost.save();

    await logAdminAction(
      req,
      'CREATE_POST',
      'POST',
      savedPost._id,
      'SUCCESS',
      {
        before: {},
        after: savedPost.toObject(),
      },
      `Created new post: ${title}`
    );

    res.status(201).json({
      success: true,
      data: savedPost,
      message: 'Post created successfully',
    });
  } catch (error) {
    console.error('Error creating post:', error);

    await logAdminAction(
      req,
      'CREATE_POST',
      'POST',
      null,
      'FAILED',
      null,
      'Failed to create post',
      error.message
    );

    res.status(500).json({
      success: false,
      message: 'Error creating post',
      error: error.message,
    });
  }
};

// Update post
exports.updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const updates = req.body;

    const Post = require('../models/Post') || null;

    if (!Post) {
      return res.status(501).json({
        success: false,
        message: 'Post model not configured',
      });
    }

    const originalPost = await Post.findById(postId).lean();

    if (!originalPost) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    const updatedPost = await Post.findByIdAndUpdate(postId, updates, {
      new: true,
    });

    await logAdminAction(
      req,
      'UPDATE_POST',
      'POST',
      postId,
      'SUCCESS',
      {
        before: originalPost,
        after: updatedPost.toObject(),
      },
      `Updated post: ${originalPost.title}`
    );

    res.json({
      success: true,
      data: updatedPost,
      message: 'Post updated successfully',
    });
  } catch (error) {
    console.error('Error updating post:', error);

    await logAdminAction(
      req,
      'UPDATE_POST',
      'POST',
      req.params.postId,
      'FAILED',
      null,
      'Failed to update post',
      error.message
    );

    res.status(500).json({
      success: false,
      message: 'Error updating post',
      error: error.message,
    });
  }
};

// Delete post
exports.deletePost = async (req, res) => {
  try {
    const { postId } = req.params;

    const Post = require('../models/Post') || null;

    if (!Post) {
      return res.status(501).json({
        success: false,
        message: 'Post model not configured',
      });
    }

    const post = await Post.findById(postId).lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    await Post.findByIdAndDelete(postId);

    await logAdminAction(
      req,
      'DELETE_POST',
      'POST',
      postId,
      'SUCCESS',
      {
        before: post,
        after: null,
      },
      `Deleted post: ${post.title}`
    );

    res.json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting post:', error);

    await logAdminAction(
      req,
      'DELETE_POST',
      'POST',
      req.params.postId,
      'FAILED',
      null,
      'Failed to delete post',
      error.message
    );

    res.status(500).json({
      success: false,
      message: 'Error deleting post',
      error: error.message,
    });
  }
};

// Publish/Unpublish post
exports.togglePostStatus = async (req, res) => {
  try {
    const { postId } = req.params;
    const { status } = req.body;

    const Post = require('../models/Post') || null;

    if (!Post) {
      return res.status(501).json({
        success: false,
        message: 'Post model not configured',
      });
    }

    const post = await Post.findById(postId).lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    if (!['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { status },
      { new: true }
    );

    const actionType = status === 'PUBLISHED' ? 'PUBLISH_POST' : 'UNPUBLISH_POST';

    await logAdminAction(
      req,
      actionType,
      'POST',
      postId,
      'SUCCESS',
      {
        before: { status: post.status },
        after: { status },
      },
      `Changed post status to ${status}: ${post.title}`
    );

    res.json({
      success: true,
      data: updatedPost,
      message: `Post ${status.toLowerCase()} successfully`,
    });
  } catch (error) {
    console.error('Error toggling post status:', error);

    await logAdminAction(
      req,
      'UPDATE_POST',
      'POST',
      req.params.postId,
      'FAILED',
      null,
      'Failed to change post status',
      error.message
    );

    res.status(500).json({
      success: false,
      message: 'Error changing post status',
      error: error.message,
    });
  }
};

// Bulk delete posts
exports.bulkDeletePosts = async (req, res) => {
  try {
    const { postIds } = req.body;

    if (!Array.isArray(postIds) || postIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Post IDs array is required',
      });
    }

    const Post = require('../models/Post') || null;

    if (!Post) {
      return res.status(501).json({
        success: false,
        message: 'Post model not configured',
      });
    }

    const result = await Post.deleteMany({ _id: { $in: postIds } });

    await logAdminAction(
      req,
      'BULK_ACTION',
      'POST',
      null,
      'SUCCESS',
      { before: { count: postIds.length }, after: null },
      `Bulk deleted ${result.deletedCount} posts`,
      null,
      null,
      result.deletedCount
    );

    res.json({
      success: true,
      message: `${result.deletedCount} posts deleted successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Error bulk deleting posts:', error);

    await logAdminAction(
      req,
      'BULK_ACTION',
      'POST',
      null,
      'FAILED',
      null,
      'Failed to bulk delete posts',
      error.message
    );

    res.status(500).json({
      success: false,
      message: 'Error bulk deleting posts',
      error: error.message,
    });
  }
};

module.exports = {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  togglePostStatus,
  bulkDeletePosts,
};
