const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  parent_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    default: null,
    index: true
  },
  level: {
    type: String,
    enum: ['country', 'region', 'governorate', 'city', 'district'],
    required: true,
    index: true
  },
  code: {
    type: String,
    trim: true,
    index: true
  },
  name_ar: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  name_en: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  slug: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

locationSchema.index({ parent_id: 1, level: 1 });

module.exports = mongoose.model('Location', locationSchema);
