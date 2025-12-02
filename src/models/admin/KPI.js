const mongoose = require('mongoose');

const kpiSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'KPI name is required'],
    trim: true
  },
  nameAr: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['financial', 'membership', 'performance', 'satisfaction', 'growth', 'operational'],
    default: 'operational'
  },
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  value: {
    type: Number,
    required: true,
    default: 0
  },
  target: {
    type: Number,
    required: true,
    default: 100
  },
  unit: {
    type: String,
    default: '%'
  },
  trend: {
    type: String,
    enum: ['up', 'down', 'stable'],
    default: 'stable'
  },
  previousValue: {
    type: Number,
    default: 0
  },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  },
  description: String,
  descriptionAr: String,
  history: [{
    value: Number,
    date: Date,
    notes: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

kpiSchema.index({ clubId: 1, category: 1 });
kpiSchema.index({ isActive: 1, period: 1 });

module.exports = mongoose.model('KPI', kpiSchema);
