const User = require('../modules/shared/models/User');

exports.getPlayerProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -refreshTokens');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get player profile error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الملف الشخصي',
      error: error.message
    });
  }
};

exports.updatePlayerProfile = async (req, res) => {
  try {
    const allowedFields = [
      'league', 'position', 'level', 'preferredFoot', 'age', 
      'region', 'city', 'neighborhood', 'experience', 
      'matchesPerWeek', 'phone', 'bio'
    ];
    
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -refreshTokens');
    
    res.status(200).json({
      success: true,
      message: 'تم تحديث الملف الشخصي بنجاح',
      messageEn: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update player profile error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الملف الشخصي',
      error: error.message
    });
  }
};

exports.getCoachProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -refreshTokens');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get coach profile error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الملف الشخصي',
      error: error.message
    });
  }
};

exports.updateCoachProfile = async (req, res) => {
  try {
    const allowedFields = [
      'certificates', 'region', 'city', 'neighborhood',
      'coachingType', 'ageGroup', 'experienceYears', 
      'teamTypes', 'phone', 'bio', 'specializations'
    ];
    
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -refreshTokens');
    
    res.status(200).json({
      success: true,
      message: 'تم تحديث الملف الشخصي بنجاح',
      messageEn: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update coach profile error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الملف الشخصي',
      error: error.message
    });
  }
};

exports.getProfileOptions = async (req, res) => {
  try {
    const regionsData = require('../data/saudiRegions.json');
    
    res.status(200).json({
      success: true,
      data: {
        regions: regionsData.regions,
        neighborhoods: regionsData.neighborhoods,
        leagues: regionsData.leagues,
        positions: regionsData.positions,
        levels: regionsData.levels,
        preferredFoot: regionsData.preferredFoot,
        experience: regionsData.experience,
        certificates: regionsData.certificates,
        coachingTypes: regionsData.coachingTypes,
        ageGroups: regionsData.ageGroups,
        sports: regionsData.sports,
        matchesPerWeek: ['1', '2', '3', '4', '5', '6', '7+']
      }
    });
  } catch (error) {
    console.error('Get profile options error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الخيارات',
      error: error.message
    });
  }
};
