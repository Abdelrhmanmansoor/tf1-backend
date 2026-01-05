/**
 * Integration Examples for Admin Dashboard
 * Shows how to integrate the admin dashboard with your application
 */

// ============ في server.js ============

const express = require('express');
const app = express();
const adminDashboardRoutes = require('./src/modules/admin-dashboard/routes');
const { adminLog } = require('./src/modules/admin-dashboard/middleware/adminAuth');

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Admin Dashboard API Routes
app.use('/sys-admin-secure-panel/api', adminDashboardRoutes);

// ============ استخدام Admin Logging في Controllers الأخرى ============

// مثال 1: تسجيل إجراء من أي مكان في التطبيق
const { logAdminAction } = require('./src/modules/admin-dashboard/middleware/adminAuth');

async function createBlogPost(req, res) {
  try {
    const post = new Post(req.body);
    await post.save();

    // تسجيل الإجراء
    await logAdminAction(
      req,
      'CREATE_POST',
      'POST',
      post._id,
      'SUCCESS',
      { before: {}, after: post.toObject() },
      `Created post: ${post.title}`
    );

    res.json({ success: true, data: post });
  } catch (error) {
    // تسجيل الخطأ
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

    res.status(500).json({ success: false, error: error.message });
  }
}

// ============ استخدام Admin Key في Protected Routes ============

const { authenticateAdminKey, checkPermission } = require('./src/modules/admin-dashboard/middleware/adminAuth');

// مسار محمي يتطلب Admin Key
app.post(
  '/api/sensitive-operation',
  authenticateAdminKey,
  checkPermission('manage_system_settings'),
  async (req, res) => {
    // هذا المسار محمي ولا يمكن الوصول إليه بدون admin key صحيح
    res.json({ message: 'Operation successful' });
  }
);

// ============ استخدام API Integrations ============

const APIIntegrations = require('./src/modules/admin-dashboard/services/integrations');

// تفعيل النسخ الاحتياطية التلقائية
APIIntegrations.configureAutoBackups('0 2 * * *'); // 2 AM daily

// توقيف المراقبة الصحية
APIIntegrations.startHealthMonitoring(300000); // كل 5 دقائق

// تسجيل webhook للأحداث
app.post('/api/webhooks/register', async (req, res) => {
  try {
    const webhook = await APIIntegrations.registerWebhook(
      req,
      ['post.created', 'post.updated'],
      req.body.webhookUrl
    );
    res.json({ success: true, data: webhook });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ مثال كامل: في Post Controller ============

const Post = require('./src/modules/blog/models/Post');

class BlogController {
  // إنشاء مقالة جديدة
  static async createPost(req, res) {
    try {
      const { title, content, author } = req.body;

      // تحقق من البيانات
      if (!title || !content) {
        return res.status(400).json({
          success: false,
          message: 'Title and content are required',
        });
      }

      // إنشاء المقالة
      const post = new Post({
        title,
        content,
        author,
        createdAt: new Date(),
      });

      await post.save();

      // تسجيل الإجراء
      await logAdminAction(
        req,
        'CREATE_POST',
        'POST',
        post._id,
        'SUCCESS',
        {
          before: {},
          after: {
            title: post.title,
            author: post.author,
            createdAt: post.createdAt,
          },
        },
        `New blog post created: "${title}"`,
        null,
        null
      );

      // تشغيل webhook
      await APIIntegrations.triggerWebhook('post.created', {
        postId: post._id,
        title: post.title,
        author: post.author,
      });

      res.status(201).json({
        success: true,
        data: post,
        message: 'Post created successfully',
      });
    } catch (error) {
      console.error('Error creating post:', error);

      // تسجيل الخطأ
      await logAdminAction(
        req,
        'CREATE_POST',
        'POST',
        null,
        'FAILED',
        null,
        'Failed to create blog post',
        error.message
      );

      res.status(500).json({
        success: false,
        message: 'Error creating post',
        error: error.message,
      });
    }
  }

  // تحديث مقالة
  static async updatePost(req, res) {
    try {
      const { postId } = req.params;
      const updates = req.body;

      // الحصول على المقالة الأصلية
      const originalPost = await Post.findById(postId).lean();

      if (!originalPost) {
        return res.status(404).json({
          success: false,
          message: 'Post not found',
        });
      }

      // تحديث المقالة
      const updatedPost = await Post.findByIdAndUpdate(postId, updates, {
        new: true,
      });

      // تسجيل الإجراء مع المقارنة
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
        `Updated post: "${originalPost.title}"`
      );

      // تشغيل webhook
      await APIIntegrations.triggerWebhook('post.updated', {
        postId: updatedPost._id,
        title: updatedPost.title,
        changes: updates,
      });

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
  }

  // حذف مقالة
  static async deletePost(req, res) {
    try {
      const { postId } = req.params;

      const post = await Post.findById(postId).lean();

      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found',
        });
      }

      await Post.findByIdAndDelete(postId);

      // تسجيل الإجراء
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
        `Deleted post: "${post.title}"`
      );

      // تشغيل webhook
      await APIIntegrations.triggerWebhook('post.deleted', {
        postId,
        title: post.title,
      });

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
  }

  // الحصول على إحصائيات المقالات
  static async getPostStats(req, res) {
    try {
      const stats = await Post.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      await logAdminAction(
        req,
        'VIEW_SYSTEM',
        'POST',
        null,
        'SUCCESS',
        null,
        'Post statistics accessed'
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

// ============ استخدام Security Utils ============

const SecurityUtils = require('./src/modules/admin-dashboard/utils/security');

// التحقق من قوة كلمة المرور
function validatePassword(password) {
  const validation = SecurityUtils.validatePasswordStrength(password);

  if (!validation.isValid) {
    return {
      success: false,
      message: `Password is ${validation.message}`,
      requirements: validation.requirements,
    };
  }

  return { success: true };
}

// تشفير البيانات الحساسة
function encryptSensitiveData(data) {
  const encrypted = SecurityUtils.encryptData(data);
  return encrypted;
}

// فك التشفير
function decryptData(encryptedData) {
  const decrypted = SecurityUtils.decryptData(encryptedData);
  return decrypted;
}

// ============ مثال على Request من Frontend ============

// في React/Next.js
const performAdminAction = async (action, data) => {
  try {
    const adminKey = localStorage.getItem('admin_key');
    const csrfToken = sessionStorage.getItem('csrf_token');

    const response = await fetch(
      'https://yourdomain.com/sys-admin-secure-panel/api/posts/create',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          title: 'My New Post',
          content: 'Post content here',
          status: 'DRAFT',
        }),
      }
    );

    const result = await response.json();

    if (result.success) {
      console.log('Action successful:', result.data);
      // Update UI or show success message
    } else {
      console.error('Action failed:', result.message);
      // Show error message
    }
  } catch (error) {
    console.error('Request error:', error);
  }
};

// ============ Export للاستخدام ============

module.exports = {
  BlogController,
  validatePassword,
  encryptSensitiveData,
  decryptData,
  performAdminAction,
};
