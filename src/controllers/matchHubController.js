const PublicMatch = require('../models/PublicMatch');
const Notification = require('../models/Notification');
const User = require('../modules/shared/models/User');

const createNotification = async (data) => {
  try {
    const notification = await Notification.create(data);
    const io = global.io;
    if (io) {
      io.to(data.userId.toString()).emit('new_notification', notification);
    }
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

exports.getMatches = async (req, res) => {
  try {
    const { region, city, neighborhood, sport, level, date, maxPlayers, page = 1, limit = 20 } = req.query;
    
    const filters = {};
    if (region) filters.region = region;
    if (city) filters.city = city;
    if (neighborhood) filters.neighborhood = neighborhood;
    if (sport) filters.sport = sport;
    if (level) filters.level = level;
    if (date) filters.date = date;
    if (maxPlayers) filters.maxPlayers = maxPlayers;
    
    const matches = await PublicMatch.getAvailableMatches(filters);
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedMatches = matches.slice(skip, skip + parseInt(limit));
    
    res.status(200).json({
      success: true,
      data: {
        matches: paginatedMatches,
        pagination: {
          total: matches.length,
          page: parseInt(page),
          pages: Math.ceil(matches.length / parseInt(limit)),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المباريات',
      messageEn: 'Error fetching matches',
      error: error.message
    });
  }
};

exports.getMatch = async (req, res) => {
  try {
    const match = await PublicMatch.findById(req.params.id)
      .populate('organizer', 'firstName lastName phone')
      .populate('registeredPlayers.playerId', 'firstName lastName');
    
    if (!match || match.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'المباراة غير موجودة',
        messageEn: 'Match not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: match
    });
  } catch (error) {
    console.error('Get match error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المباراة',
      error: error.message
    });
  }
};

exports.createMatch = async (req, res) => {
  try {
    const { name, sport, region, city, neighborhood, date, time, level, maxPlayers, description, venue, fee } = req.body;
    
    const user = await User.findById(req.user._id);
    
    const match = await PublicMatch.create({
      name,
      sport,
      region,
      city,
      neighborhood,
      date,
      time,
      level,
      maxPlayers: maxPlayers || 10,
      description,
      venue,
      fee: fee || 0,
      organizer: req.user._id,
      organizerName: `${user.firstName} ${user.lastName}`,
      organizerPhone: user.phone
    });
    
    res.status(201).json({
      success: true,
      message: 'تم إنشاء المباراة بنجاح',
      messageEn: 'Match created successfully',
      data: match
    });
  } catch (error) {
    console.error('Create match error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء المباراة',
      error: error.message
    });
  }
};

exports.joinMatch = async (req, res) => {
  try {
    const match = await PublicMatch.findById(req.params.id);
    
    if (!match || match.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'المباراة غير موجودة'
      });
    }
    
    if (match.status === 'cancelled' || match.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن الانضمام لهذه المباراة'
      });
    }
    
    const user = await User.findById(req.user._id);
    const playerName = `${user.firstName} ${user.lastName}`;
    
    await match.addPlayer(req.user._id, playerName);
    
    await createNotification({
      userId: req.user._id,
      userRole: user.role || 'player',
      type: 'session_booked',
      title: 'تم تسجيلك في المباراة',
      titleAr: 'تم تسجيلك في المباراة',
      message: `✔ تم تسجيلك في مباراة "${match.name}" بنجاح`,
      messageAr: `✔ تم تسجيلك في مباراة "${match.name}" بنجاح`,
      relatedTo: {
        entityType: 'training_session',
        entityId: match._id
      },
      actionUrl: `/matches/${match._id}`,
      priority: 'normal'
    });
    
    await createNotification({
      userId: match.organizer,
      userRole: 'player',
      type: 'training_request',
      title: 'لاعب جديد انضم لمباراتك',
      titleAr: 'لاعب جديد انضم لمباراتك',
      message: `📢 ${playerName} انضم إلى مباراتك "${match.name}"`,
      messageAr: `📢 ${playerName} انضم إلى مباراتك "${match.name}"`,
      relatedTo: {
        entityType: 'training_session',
        entityId: match._id
      },
      actionUrl: `/matches/${match._id}`,
      priority: 'high'
    });
    
    res.status(200).json({
      success: true,
      message: 'تم الانضمام للمباراة بنجاح',
      messageEn: 'Joined match successfully',
      data: match
    });
  } catch (error) {
    console.error('Join match error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'خطأ في الانضمام للمباراة'
    });
  }
};

exports.leaveMatch = async (req, res) => {
  try {
    const match = await PublicMatch.findById(req.params.id);
    
    if (!match || match.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'المباراة غير موجودة'
      });
    }
    
    await match.removePlayer(req.user._id);
    
    const user = await User.findById(req.user._id);
    const playerName = `${user.firstName} ${user.lastName}`;
    
    await createNotification({
      userId: match.organizer,
      userRole: 'player',
      type: 'session_cancelled',
      title: 'لاعب غادر مباراتك',
      titleAr: 'لاعب غادر مباراتك',
      message: `${playerName} غادر مباراتك "${match.name}"`,
      messageAr: `${playerName} غادر مباراتك "${match.name}"`,
      relatedTo: {
        entityType: 'training_session',
        entityId: match._id
      },
      priority: 'normal'
    });
    
    res.status(200).json({
      success: true,
      message: 'تم مغادرة المباراة بنجاح',
      messageEn: 'Left match successfully',
      data: match
    });
  } catch (error) {
    console.error('Leave match error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'خطأ في مغادرة المباراة'
    });
  }
};

exports.updateMatch = async (req, res) => {
  try {
    const match = await PublicMatch.findById(req.params.id);
    
    if (!match || match.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'المباراة غير موجودة'
      });
    }
    
    if (match.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتعديل هذه المباراة'
      });
    }
    
    const allowedUpdates = ['name', 'sport', 'region', 'city', 'neighborhood', 'date', 'time', 'level', 'maxPlayers', 'description', 'venue', 'fee', 'status'];
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        match[field] = req.body[field];
      }
    });
    
    await match.save();
    
    res.status(200).json({
      success: true,
      message: 'تم تحديث المباراة بنجاح',
      data: match
    });
  } catch (error) {
    console.error('Update match error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث المباراة',
      error: error.message
    });
  }
};

exports.deleteMatch = async (req, res) => {
  try {
    const match = await PublicMatch.findById(req.params.id);
    
    if (!match || match.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'المباراة غير موجودة'
      });
    }
    
    if (match.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بحذف هذه المباراة'
      });
    }
    
    match.isDeleted = true;
    match.status = 'cancelled';
    await match.save();
    
    for (const player of match.registeredPlayers) {
      await createNotification({
        userId: player.playerId,
        userRole: 'player',
        type: 'session_cancelled',
        title: 'تم إلغاء المباراة',
        titleAr: 'تم إلغاء المباراة',
        message: `تم إلغاء مباراة "${match.name}"`,
        messageAr: `تم إلغاء مباراة "${match.name}"`,
        priority: 'high'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'تم حذف المباراة بنجاح'
    });
  } catch (error) {
    console.error('Delete match error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف المباراة',
      error: error.message
    });
  }
};

exports.getMyMatches = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const organizedMatches = await PublicMatch.find({
      organizer: userId,
      isDeleted: false
    }).sort({ date: -1 });
    
    const joinedMatches = await PublicMatch.find({
      'registeredPlayers.playerId': userId,
      organizer: { $ne: userId },
      isDeleted: false
    }).sort({ date: -1 });
    
    res.status(200).json({
      success: true,
      data: {
        organized: organizedMatches,
        joined: joinedMatches
      }
    });
  } catch (error) {
    console.error('Get my matches error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المباريات',
      error: error.message
    });
  }
};

exports.getRegionsData = async (req, res) => {
  try {
    const regionsData = require('../data/saudiRegions.json');
    res.status(200).json({
      success: true,
      data: regionsData
    });
  } catch (error) {
    console.error('Get regions data error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات المناطق',
      error: error.message
    });
  }
};
