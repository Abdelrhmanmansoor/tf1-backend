const mongoose = require('mongoose');

const partnershipSchema = new mongoose.Schema({
  partnerName: {
    type: String,
    required: [true, 'Partner name is required'],
    trim: true
  },
  partnerNameAr: {
    type: String,
    trim: true
  },
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['sponsor', 'strategic', 'vendor', 'affiliate', 'media', 'government'],
    default: 'sponsor'
  },
  tier: {
    type: String,
    enum: ['platinum', 'gold', 'silver', 'bronze', 'standard'],
    default: 'standard'
  },
  status: {
    type: String,
    enum: ['active', 'negotiating', 'expired', 'terminated', 'pending'],
    default: 'pending'
  },
  startDate: Date,
  endDate: Date,
  value: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'EGP'
  },
  paymentTerms: String,
  benefits: [String],
  benefitsAr: [String],
  obligations: [String],
  obligationsAr: [String],
  contactPerson: String,
  contactEmail: String,
  contactPhone: String,
  logo: String,
  website: String,
  documents: [{
    name: String,
    url: String,
    type: String,
    uploadedAt: Date
  }],
  renewalDate: Date,
  autoRenew: {
    type: Boolean,
    default: false
  },
  notes: String,
  notesAr: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

partnershipSchema.index({ clubId: 1, status: 1 });
partnershipSchema.index({ type: 1, tier: 1 });

module.exports = mongoose.model('Partnership', partnershipSchema);
