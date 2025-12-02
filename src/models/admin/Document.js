const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Document name is required'],
    trim: true
  },
  nameAr: {
    type: String,
    trim: true
  },
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['contract', 'letter', 'report', 'memo', 'policy', 'form', 'certificate', 'other'],
    default: 'other'
  },
  category: {
    type: String,
    enum: ['hr', 'finance', 'legal', 'operations', 'sports', 'marketing', 'general'],
    default: 'general'
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileName: String,
  fileSize: Number,
  mimeType: String,
  description: String,
  descriptionAr: String,
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected', 'archived'],
    default: 'draft'
  },
  priority: {
    type: String,
    enum: ['high', 'normal', 'low'],
    default: 'normal'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedToName: String,
  dueDate: Date,
  approvalWorkflow: [{
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approverName: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    comments: String,
    date: Date
  }],
  version: {
    type: Number,
    default: 1
  },
  versions: [{
    version: Number,
    fileUrl: String,
    uploadedBy: mongoose.Schema.Types.ObjectId,
    uploadedAt: Date,
    notes: String
  }],
  tags: [String],
  relatedMeetingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting'
  },
  expiryDate: Date,
  isConfidential: {
    type: Boolean,
    default: false
  },
  accessList: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
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

documentSchema.index({ clubId: 1, type: 1 });
documentSchema.index({ status: 1, dueDate: 1 });
documentSchema.index({ assignedTo: 1, status: 1 });

module.exports = mongoose.model('Document', documentSchema);
