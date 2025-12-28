const mongoose = require('mongoose');

const experienceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  startDate: { type: Date },
  endDate: { type: Date },
  isCurrent: { type: Boolean, default: false },
  description: { type: String }, // Bullet points as text or array? Text for now, AI can format it.
  descriptionBullets: [{ type: String }]
});

const educationSchema = new mongoose.Schema({
  degree: { type: String, required: true },
  fieldOfStudy: { type: String },
  institution: { type: String, required: true },
  graduationDate: { type: Date },
  description: { type: String }
});

const languageSchema = new mongoose.Schema({
  language: { type: String, required: true },
  proficiency: { type: String, enum: ['Native', 'Fluent', 'Advanced', 'Intermediate', 'Beginner'], required: true }
});

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  institution: { type: String },
  date: { type: Date }
});

const cvSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional, if user is logged in
  sessionId: { type: String }, // For guest users
  language: { type: String, enum: ['en', 'ar'], default: 'ar' },
  personalInfo: {
    fullName: { type: String, required: true },
    jobTitle: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String },
    city: { type: String },
    country: { type: String },
    linkedin: { type: String },
    website: { type: String }
  },
  summary: { type: String },
  experience: [experienceSchema],
  education: [educationSchema],
  skills: [{ type: String }],
  languages: [languageSchema],
  courses: [courseSchema],
  meta: {
    template: { type: String, default: 'standard' },
    isATSFriendly: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }
}, { timestamps: true });

module.exports = mongoose.model('CV', cvSchema);
