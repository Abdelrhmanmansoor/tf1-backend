const mongoose = require('mongoose');

const publicMatchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'اسم المباراة مطلوب'],
    trim: true
  },
  sport: {
    type: String,
    enum: ['كرة القدم', 'كرة السلة', 'الكرة الطائرة', 'التنس', 'الإسكواش'],
    default: 'كرة القدم'
  },
  region: {
    type: String,
    required: [true, 'المنطقة مطلوبة']
  },
  city: {
    type: String,
    required: [true, 'المدينة مطلوبة']
  },
  neighborhood: {
    type: String,
    required: [true, 'الحي مطلوب']
  },
  date: {
    type: Date,
    required: [true, 'تاريخ المباراة مطلوب']
  },
  time: {
    type: String,
    required: [true, 'وقت المباراة مطلوب']
  },
  level: {
    type: String,
    enum: ['مبتدئ', 'متوسط', 'متقدم', 'احترافي'],
    default: 'متوسط'
  },
  maxPlayers: {
    type: Number,
    default: 10,
    min: 2,
    max: 30
  },
  registeredCount: {
    type: Number,
    default: 0
  },
  registeredPlayers: [{
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    playerName: String,
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organizerName: String,
  organizerPhone: String,
  status: {
    type: String,
    enum: ['upcoming', 'full', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  description: String,
  venue: String,
  fee: {
    type: Number,
    default: 0
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

publicMatchSchema.index({ city: 1, date: 1, status: 1 });
publicMatchSchema.index({ region: 1, sport: 1 });
publicMatchSchema.index({ organizer: 1 });
publicMatchSchema.index({ level: 1, date: 1 });

publicMatchSchema.statics.getAvailableMatches = async function(filters = {}) {
  const query = { isDeleted: false, status: { $in: ['upcoming', 'full'] } };
  
  if (filters.region) query.region = filters.region;
  if (filters.city) query.city = filters.city;
  if (filters.neighborhood) query.neighborhood = filters.neighborhood;
  if (filters.sport) query.sport = filters.sport;
  if (filters.level) query.level = filters.level;
  if (filters.date) {
    const startDate = new Date(filters.date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(filters.date);
    endDate.setHours(23, 59, 59, 999);
    query.date = { $gte: startDate, $lte: endDate };
  }
  if (filters.maxPlayers) query.maxPlayers = { $lte: parseInt(filters.maxPlayers) };
  
  return this.find(query)
    .sort({ date: 1, time: 1 })
    .populate('organizer', 'firstName lastName')
    .lean();
};

publicMatchSchema.methods.addPlayer = async function(playerId, playerName) {
  if (this.registeredCount >= this.maxPlayers) {
    throw new Error('المباراة ممتلئة');
  }
  
  const alreadyJoined = this.registeredPlayers.some(
    p => p.playerId.toString() === playerId.toString()
  );
  
  if (alreadyJoined) {
    throw new Error('أنت مسجل بالفعل في هذه المباراة');
  }
  
  this.registeredPlayers.push({ playerId, playerName });
  this.registeredCount = this.registeredPlayers.length;
  
  if (this.registeredCount >= this.maxPlayers) {
    this.status = 'full';
  }
  
  return this.save();
};

publicMatchSchema.methods.removePlayer = async function(playerId) {
  const index = this.registeredPlayers.findIndex(
    p => p.playerId.toString() === playerId.toString()
  );
  
  if (index === -1) {
    throw new Error('أنت غير مسجل في هذه المباراة');
  }
  
  this.registeredPlayers.splice(index, 1);
  this.registeredCount = this.registeredPlayers.length;
  
  if (this.status === 'full' && this.registeredCount < this.maxPlayers) {
    this.status = 'upcoming';
  }
  
  return this.save();
};

module.exports = mongoose.model('PublicMatch', publicMatchSchema);
