const mongoose = require('mongoose');

/**
 * Middleware للتحقق من أن النادي يملك المورد المطلوب
 * @param {string} modelName - اسم الـ Model (Job, Team, Event, etc.)
 * @param {string} paramName - اسم الـ parameter في URL (default: 'id')
 * @param {string} idField - اسم الحقل في Model (default: '_id')
 */
const verifyClubOwnership = (modelName, paramName = 'id', idField = '_id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramName];
      
      // التحقق من صحة الـ ID
      if (!mongoose.Types.ObjectId.isValid(resourceId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid resource ID',
          code: 'INVALID_ID'
        });
      }

      // تحميل الـ Model ديناميكيًا
      let Model;
      try {
        Model = require(`../modules/club/models/${modelName}`);
      } catch (error) {
        console.error(`Error loading model ${modelName}:`, error);
        return res.status(500).json({
          success: false,
          message: 'Internal server error',
          code: 'MODEL_LOAD_ERROR'
        });
      }
      
      // البحث عن المورد
      const query = {
        [idField]: resourceId,
        clubId: req.user._id,
        isDeleted: false
      };

      const resource = await Model.findOne(query);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: `${modelName} not found or you don't have permission to access it`,
          messageAr: `${modelName} غير موجود أو ليس لديك صلاحية للوصول إليه`,
          code: 'RESOURCE_NOT_FOUND'
        });
      }

      // إضافة المورد إلى request للاستخدام في controller
      req.resource = resource;
      req.resourceModel = modelName;
      
      next();
    } catch (error) {
      console.error(`Error verifying ${modelName} ownership:`, error);
      res.status(500).json({
        success: false,
        message: 'Error verifying resource ownership',
        messageAr: 'خطأ في التحقق من ملكية المورد',
        error: error.message,
        code: 'OWNERSHIP_VERIFICATION_ERROR'
      });
    }
  };
};

/**
 * Middleware للتحقق من أن النادي لديه ملف شخصي
 */
const requireClubProfile = async (req, res, next) => {
  try {
    const ClubProfile = require('../modules/club/models/ClubProfile');
    
    const profile = await ClubProfile.findOne({
      userId: req.user._id,
      isDeleted: false
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Club profile not found. Please create your profile first.',
        messageAr: 'ملف النادي غير موجود. الرجاء إنشاء ملفك أولاً.',
        code: 'PROFILE_NOT_FOUND',
        redirectTo: '/dashboard/club/setup'
      });
    }

    req.clubProfile = profile;
    next();
  } catch (error) {
    console.error('Error checking club profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking club profile',
      messageAr: 'خطأ في التحقق من ملف النادي',
      error: error.message
    });
  }
};

/**
 * Middleware للتحقق من صلاحيات الأعضاء داخل النادي
 * @param {string} requiredPermission - الصلاحية المطلوبة
 */
const checkClubMemberPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const ClubMember = require('../modules/club/models/ClubMember');
      
      // البحث عن عضوية المستخدم في النادي
      const membership = await ClubMember.findOne({
        clubId: req.user._id,
        userId: req.user._id,
        status: 'active',
        isDeleted: false
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this club',
          messageAr: 'أنت لست عضوًا في هذا النادي',
          code: 'NOT_CLUB_MEMBER'
        });
      }

      // التحقق من الصلاحية
      if (!membership.hasPermission(requiredPermission)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Missing club permission: ${requiredPermission}`,
          messageAr: `الوصول مرفوض. ينقصك صلاحية: ${requiredPermission}`,
          code: 'INSUFFICIENT_CLUB_PERMISSIONS'
        });
      }

      req.clubMembership = membership;
      next();
    } catch (error) {
      console.error('Error checking club member permission:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking club member permission',
        messageAr: 'خطأ في التحقق من صلاحيات العضو',
        error: error.message
      });
    }
  };
};

/**
 * Middleware للتحقق من أن المستخدم هو مالك النادي أو له صلاحيات إدارية
 */
const requireClubAdmin = async (req, res, next) => {
  try {
    const ClubMember = require('../modules/club/models/ClubMember');
    
    const membership = await ClubMember.findOne({
      clubId: req.user._id,
      userId: req.user._id,
      status: 'active',
      isDeleted: false
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this club',
        messageAr: 'أنت لست عضوًا في هذا النادي',
        code: 'NOT_CLUB_MEMBER'
      });
    }

    // التحقق من أن المستخدم له دور إداري
    const adminRoles = ['owner', 'general_manager', 'admin_manager'];
    if (!adminRoles.includes(membership.memberRole)) {
      return res.status(403).json({
        success: false,
        message: 'You need administrative privileges to perform this action',
        messageAr: 'تحتاج إلى صلاحيات إدارية لتنفيذ هذا الإجراء',
        code: 'ADMIN_PRIVILEGES_REQUIRED'
      });
    }

    req.clubMembership = membership;
    next();
  } catch (error) {
    console.error('Error checking club admin status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking club admin status',
      messageAr: 'خطأ في التحقق من حالة المسؤول',
      error: error.message
    });
  }
};

module.exports = {
  verifyClubOwnership,
  requireClubProfile,
  checkClubMemberPermission,
  requireClubAdmin
};


