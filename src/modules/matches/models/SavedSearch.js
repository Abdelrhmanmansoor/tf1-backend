const mongoose = require('mongoose');

const savedSearchSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MSMatchUser',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  filters: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  notification_enabled: {
    type: Boolean,
    default: false
  },
  last_checked: Date
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

savedSearchSchema.index({ user_id: 1, created_at: -1 });

module.exports = mongoose.model('MSSavedSearch', savedSearchSchema, 'ms_saved_searches');

