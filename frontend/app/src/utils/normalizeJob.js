/**
 * Job Data Normalization Utility
 * Ensures all job data is safe for rendering - no undefined, null, or NaN values
 *
 * TF1 Jobs Platform - Data Safety Layer
 */

/**
 * Calculate relative time in Arabic
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted relative time in Arabic
 */
export const formatRelativeTime = (date) => {
  if (!date) return null;

  try {
    const now = new Date();
    const past = new Date(date);

    if (isNaN(past.getTime())) return null;

    const diffInMs = now - past;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);

    if (diffInMinutes < 1) return 'الان';
    if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;
    if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;
    if (diffInDays === 1) return 'منذ يوم';
    if (diffInDays < 7) return `منذ ${diffInDays} ايام`;
    if (diffInWeeks === 1) return 'منذ اسبوع';
    if (diffInWeeks < 4) return `منذ ${diffInWeeks} اسابيع`;
    if (diffInMonths === 1) return 'منذ شهر';
    if (diffInMonths < 12) return `منذ ${diffInMonths} اشهر`;

    return past.toLocaleDateString('ar-SA');
  } catch {
    return null;
  }
};

/**
 * Format deadline date
 * @param {Date|string} date - The deadline date
 * @returns {string|null} Formatted deadline or null
 */
export const formatDeadline = (date) => {
  if (!date) return null;

  try {
    const deadline = new Date(date);
    if (isNaN(deadline.getTime())) return null;

    const now = new Date();
    const diffInDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

    if (diffInDays < 0) return 'انتهى التقديم';
    if (diffInDays === 0) return 'اخر يوم للتقديم';
    if (diffInDays === 1) return 'يتبقى يوم واحد';
    if (diffInDays <= 7) return `يتبقى ${diffInDays} ايام`;

    return deadline.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return null;
  }
};

/**
 * Get job type label in Arabic
 * @param {string} type - Job type key
 * @returns {string} Arabic label
 */
export const getJobTypeLabel = (type) => {
  const labels = {
    'full-time': 'دوام كامل',
    'part-time': 'دوام جزئي',
    'contract': 'عقد محدد',
    'temporary': 'مؤقت',
    'freelance': 'عمل حر',
    'internship': 'تدريب',
    'remote': 'عن بعد'
  };

  return labels[type?.toLowerCase()] || 'حسب الاتفاق';
};

/**
 * Get category label in Arabic
 * @param {string} category - Category key
 * @returns {string} Arabic label
 */
export const getCategoryLabel = (category) => {
  const labels = {
    'coaching': 'تدريب',
    'management': 'ادارة',
    'medical': 'طبي',
    'technical': 'تقني',
    'marketing': 'تسويق',
    'operations': 'عمليات',
    'finance': 'مالية',
    'other': 'اخرى'
  };

  return labels[category?.toLowerCase()] || null;
};

/**
 * Format salary range
 * @param {Object} salaryRange - Salary range object with min/max
 * @returns {string|null} Formatted salary or null
 */
export const formatSalary = (salaryRange) => {
  if (!salaryRange) return null;

  const { min, max } = salaryRange;

  if (!min && !max) return null;
  if (min && !max) return `من ${min.toLocaleString('ar-SA')} ر.س`;
  if (!min && max) return `حتى ${max.toLocaleString('ar-SA')} ر.س`;
  if (min === max) return `${min.toLocaleString('ar-SA')} ر.س`;

  return `${min.toLocaleString('ar-SA')} - ${max.toLocaleString('ar-SA')} ر.س`;
};

/**
 * Get company initials for placeholder
 * @param {string} name - Company name
 * @returns {string} Initials (max 2 characters)
 */
export const getCompanyInitials = (name) => {
  if (!name || typeof name !== 'string') return 'ش';

  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }

  return (words[0][0] + words[1][0]).toUpperCase();
};

/**
 * Normalize a single job object for safe rendering
 * @param {Object} rawJob - Raw job data from API
 * @returns {Object} Normalized job object
 */
export const normalizeJob = (rawJob) => {
  if (!rawJob || typeof rawJob !== 'object') {
    return null;
  }

  // Extract company info safely
  const companyName = rawJob.club?.name ||
                      rawJob.company?.name ||
                      rawJob.companyName ||
                      rawJob.employer?.name ||
                      null;

  const companyLogo = rawJob.club?.logo ||
                      rawJob.company?.logo ||
                      rawJob.companyLogo ||
                      rawJob.employer?.logo ||
                      null;

  const companyVerified = rawJob.club?.verified ||
                          rawJob.company?.verified ||
                          rawJob.companyVerified ||
                          false;

  // Extract location safely
  const location = rawJob.location ||
                   rawJob.city ||
                   (rawJob.address?.city ? `${rawJob.address.city}${rawJob.address.region ? '، ' + rawJob.address.region : ''}` : null) ||
                   null;

  // Build normalized object
  const normalized = {
    // Core identification
    id: rawJob._id || rawJob.id || null,

    // Title - with Arabic fallback
    title: rawJob.titleAr || rawJob.title || 'وظيفة جديدة',
    titleEn: rawJob.title || null,

    // Description
    description: rawJob.descriptionAr || rawJob.description || null,
    descriptionEn: rawJob.description || null,

    // Company information
    companyName: companyName || 'جهة غير معلنة',
    companyLogo: companyLogo,
    companyInitials: getCompanyInitials(companyName),
    companyVerified: Boolean(companyVerified),

    // Location
    location: location || 'غير محدد',
    hasLocation: Boolean(location),

    // Job classification
    jobType: rawJob.jobType || rawJob.type || null,
    jobTypeLabel: getJobTypeLabel(rawJob.jobType || rawJob.type),
    category: rawJob.category || null,
    categoryLabel: getCategoryLabel(rawJob.category),
    sport: rawJob.sport || null,

    // Compensation
    salary: formatSalary(rawJob.salaryRange || rawJob.salary),
    hasSalary: Boolean(rawJob.salaryRange?.min || rawJob.salaryRange?.max || rawJob.salary),

    // Dates
    publishedAt: rawJob.postedAt || rawJob.createdAt || rawJob.publishedAt || null,
    publishedAtFormatted: formatRelativeTime(rawJob.postedAt || rawJob.createdAt || rawJob.publishedAt),
    deadline: rawJob.deadline || rawJob.applicationDeadline || null,
    deadlineFormatted: formatDeadline(rawJob.deadline || rawJob.applicationDeadline),
    isExpired: rawJob.deadline ? new Date(rawJob.deadline) < new Date() : false,

    // Status
    status: rawJob.status || 'active',
    isActive: rawJob.status === 'active' || !rawJob.status,

    // Metrics
    applicationsCount: typeof rawJob.applicationsCount === 'number' ? rawJob.applicationsCount : null,
    viewsCount: typeof rawJob.viewsCount === 'number' ? rawJob.viewsCount : null,

    // URLs
    detailsUrl: rawJob.detailsUrl || `/jobs/${rawJob._id || rawJob.id}`,
    applyUrl: rawJob.applyUrl || null,

    // Requirements (if available)
    requirements: Array.isArray(rawJob.requirements) ? rawJob.requirements : null,
    benefits: Array.isArray(rawJob.benefits) ? rawJob.benefits : null,

    // Experience
    experienceRequired: rawJob.experienceRequired || rawJob.experience || null,

    // Remote/Hybrid info
    isRemote: rawJob.remote || rawJob.isRemote || false,
    workplaceType: rawJob.workplaceType || (rawJob.remote ? 'remote' : 'onsite'),

    // Original data reference (for debugging)
    _raw: rawJob
  };

  return normalized;
};

/**
 * Normalize an array of jobs
 * @param {Array} jobs - Array of raw job objects
 * @returns {Array} Array of normalized job objects
 */
export const normalizeJobs = (jobs) => {
  if (!Array.isArray(jobs)) return [];

  return jobs
    .map(normalizeJob)
    .filter(job => job !== null && job.id !== null);
};

/**
 * Safe string for page titles - removes undefined/null
 * @param {string} template - Template string
 * @param {Object} values - Values to insert
 * @returns {string} Safe string
 */
export const safeTitle = (template, values = {}) => {
  let result = template;

  Object.keys(values).forEach(key => {
    const value = values[key];
    const safeValue = (value === undefined || value === null || value === 'undefined' || value === 'null')
      ? ''
      : String(value);
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), safeValue);
  });

  // Clean up any remaining undefined/null text
  result = result
    .replace(/undefined/gi, '')
    .replace(/null/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return result;
};

export default normalizeJob;
