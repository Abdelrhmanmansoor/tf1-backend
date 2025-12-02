const mongoose = require('mongoose');

const jobEventSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true
  },
  jobTitle: {
    type: String,
    required: true
  },
  jobTitleAr: {
    type: String
  },
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  organization: {
    type: String,
    required: true
  },
  eventType: {
    type: String,
    enum: ['job_posted', 'job_updated', 'job_closed', 'job_filled', 'job_urgent'],
    required: true,
    index: true
  },
  isUrgent: {
    type: Boolean,
    default: false,
    index: true
  },
  description: String,
  descriptionAr: String,
  category: {
    type: String,
    enum: ['coach', 'player', 'specialist', 'administrative', 'security_maintenance', 'medical', 'other']
  },
  sport: String,
  region: String,
  city: String,
  applicantsCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// TTL index - auto-delete after expiration
jobEventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('JobEvent', jobEventSchema);
