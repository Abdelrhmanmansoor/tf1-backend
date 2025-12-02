const mongoose = require('mongoose');

const coachEvaluationSchema = new mongoose.Schema({
  coachId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  coachName: String,
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  evaluatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  evaluatorName: String,
  date: {
    type: Date,
    default: Date.now
  },
  period: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  categories: {
    technicalSkills: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    communication: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    playerDevelopment: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    teamManagement: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    tacticalKnowledge: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    professionalism: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    }
  },
  strengths: [String],
  strengthsAr: [String],
  areasForImprovement: [String],
  areasForImprovementAr: [String],
  comments: String,
  commentsAr: String,
  recommendations: String,
  recommendationsAr: String,
  acknowledged: {
    type: Boolean,
    default: false
  },
  acknowledgedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

coachEvaluationSchema.index({ coachId: 1, date: -1 });
coachEvaluationSchema.index({ clubId: 1, evaluatorId: 1 });

module.exports = mongoose.model('CoachEvaluation', coachEvaluationSchema);
