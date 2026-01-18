const ApplicantProfile = require('../models/ApplicantProfile');
const User = require('../../shared/models/User');
const catchAsync = require('../../../utils/catchAsync');

const normalizeStringArray = value => {
  if (!Array.isArray(value)) return undefined;
  const cleaned = value
    .map(v => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean);
  return Array.from(new Set(cleaned));
};

exports.getMyProfile = catchAsync(async (req, res) => {
  const userId = req.user._id;

  const [user, profile] = await Promise.all([
    User.findById(userId).select('firstName lastName email phone avatar role').lean(),
    ApplicantProfile.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId } },
      { new: true, upsert: true }
    ).lean(),
  ]);

  res.status(200).json({
    success: true,
    data: {
      user,
      profile: {
        ...profile,
        completion: new ApplicantProfile(profile).getCompletion(),
      },
    },
  });
});

exports.updateMyProfile = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const payload = req.body || {};

  const update = {};

  const pickString = (path, maxLen) => {
    const value = payload[path];
    if (typeof value !== 'string') return;
    const trimmed = value.trim();
    if (!trimmed) return;
    update[path] = maxLen ? trimmed.slice(0, maxLen) : trimmed;
  };

  pickString('headline', 120);
  pickString('bio', 2000);
  pickString('qualification', 200);

  if (payload.experienceYears !== undefined) {
    const n = Number(payload.experienceYears);
    if (!Number.isNaN(n)) update.experienceYears = Math.max(0, Math.min(80, n));
  }

  if (payload.location && typeof payload.location === 'object') {
    update.location = {
      country:
        typeof payload.location.country === 'string'
          ? payload.location.country.trim()
          : undefined,
      region:
        typeof payload.location.region === 'string'
          ? payload.location.region.trim()
          : undefined,
      city:
        typeof payload.location.city === 'string'
          ? payload.location.city.trim()
          : undefined,
    };
  }

  if (payload.contact && typeof payload.contact === 'object') {
    update.contact = {
      phone:
        typeof payload.contact.phone === 'string'
          ? payload.contact.phone.trim()
          : undefined,
      whatsapp:
        typeof payload.contact.whatsapp === 'string'
          ? payload.contact.whatsapp.trim()
          : undefined,
      email:
        typeof payload.contact.email === 'string'
          ? payload.contact.email.trim().toLowerCase()
          : undefined,
    };
  }

  if (payload.links && typeof payload.links === 'object') {
    update.links = {
      linkedin:
        typeof payload.links.linkedin === 'string'
          ? payload.links.linkedin.trim()
          : undefined,
      portfolio:
        typeof payload.links.portfolio === 'string'
          ? payload.links.portfolio.trim()
          : undefined,
      github:
        typeof payload.links.github === 'string'
          ? payload.links.github.trim()
          : undefined,
      website:
        typeof payload.links.website === 'string'
          ? payload.links.website.trim()
          : undefined,
    };
  }

  const skills = normalizeStringArray(payload.skills);
  if (skills) update.skills = skills;

  if (Array.isArray(payload.languages)) update.languages = payload.languages;
  if (Array.isArray(payload.education)) update.education = payload.education;
  if (Array.isArray(payload.experiences)) update.experiences = payload.experiences;
  if (Array.isArray(payload.certifications))
    update.certifications = payload.certifications;

  if (payload.resume && typeof payload.resume === 'object') {
    update.resume = {
      url: typeof payload.resume.url === 'string' ? payload.resume.url.trim() : undefined,
      filename:
        typeof payload.resume.filename === 'string'
          ? payload.resume.filename.trim()
          : undefined,
      updatedAt: payload.resume.url ? new Date() : undefined,
    };
  }

  if (payload.preferences && typeof payload.preferences === 'object') {
    update.preferences = {
      employmentType:
        typeof payload.preferences.employmentType === 'string'
          ? payload.preferences.employmentType.trim()
          : undefined,
      jobType:
        typeof payload.preferences.jobType === 'string'
          ? payload.preferences.jobType.trim()
          : undefined,
      remote:
        typeof payload.preferences.remote === 'boolean'
          ? payload.preferences.remote
          : undefined,
      expectedSalary:
        payload.preferences.expectedSalary !== undefined
          ? Number(payload.preferences.expectedSalary) || undefined
          : undefined,
      sports: normalizeStringArray(payload.preferences.sports),
      categories: normalizeStringArray(payload.preferences.categories),
    };
  }

  const profile = await ApplicantProfile.findOneAndUpdate(
    { userId },
    { $set: update, $setOnInsert: { userId } },
    { new: true, upsert: true, runValidators: true }
  ).lean();

  res.status(200).json({
    success: true,
    data: {
      profile: {
        ...profile,
        completion: new ApplicantProfile(profile).getCompletion(),
      },
    },
  });
});

