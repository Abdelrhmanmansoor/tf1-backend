const mongoose = require('mongoose');

const applicantProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    headline: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    location: {
      country: { type: String, trim: true },
      region: { type: String, trim: true },
      city: { type: String, trim: true },
    },
    contact: {
      phone: { type: String, trim: true },
      whatsapp: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
    },
    qualification: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    experienceYears: {
      type: Number,
      min: 0,
      max: 80,
    },
    skills: [
      {
        type: String,
        trim: true,
        maxlength: 50,
      },
    ],
    languages: [
      {
        name: { type: String, trim: true, maxlength: 50 },
        level: {
          type: String,
          enum: ['beginner', 'intermediate', 'advanced', 'native'],
        },
      },
    ],
    links: {
      linkedin: { type: String, trim: true },
      portfolio: { type: String, trim: true },
      github: { type: String, trim: true },
      website: { type: String, trim: true },
    },
    resume: {
      url: { type: String, trim: true },
      filename: { type: String, trim: true },
      updatedAt: { type: Date },
    },
    education: [
      {
        institution: { type: String, trim: true, maxlength: 120 },
        degree: { type: String, trim: true, maxlength: 120 },
        field: { type: String, trim: true, maxlength: 120 },
        startYear: { type: Number, min: 1900, max: 2100 },
        endYear: { type: Number, min: 1900, max: 2100 },
      },
    ],
    experiences: [
      {
        title: { type: String, trim: true, maxlength: 120 },
        company: { type: String, trim: true, maxlength: 120 },
        startDate: { type: Date },
        endDate: { type: Date },
        current: { type: Boolean, default: false },
        description: { type: String, trim: true, maxlength: 2000 },
      },
    ],
    certifications: [
      {
        name: { type: String, trim: true, maxlength: 120 },
        issuer: { type: String, trim: true, maxlength: 120 },
        date: { type: Date },
        url: { type: String, trim: true },
      },
    ],
    preferences: {
      employmentType: { type: String, trim: true },
      jobType: { type: String, trim: true },
      remote: { type: Boolean },
      expectedSalary: { type: Number, min: 0 },
      sports: [{ type: String, trim: true }],
      categories: [{ type: String, trim: true }],
    },
    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

applicantProfileSchema.index({ 'location.region': 1, 'location.city': 1 });

applicantProfileSchema.methods.getCompletion = function () {
  const fields = [
    !!this.headline,
    !!this.bio,
    !!this.location?.city,
    !!this.qualification,
    typeof this.experienceYears === 'number',
    (this.skills || []).length > 0,
    !!this.links?.linkedin || !!this.links?.portfolio || !!this.links?.website,
    !!this.resume?.url,
    (this.education || []).length > 0,
    (this.experiences || []).length > 0,
  ];

  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
};

applicantProfileSchema.pre('save', function (next) {
  this.lastUpdatedAt = new Date();
  next();
});

module.exports = mongoose.model('ApplicantProfile', applicantProfileSchema);

