/**
 * JobCard Component - TF1 Jobs Platform
 * Premium, modern job card design with RTL Arabic support
 */

import { useState } from 'react';
import { normalizeJob } from '../../utils/normalizeJob';
import './JobCard.css';

const JobCard = ({
  job,
  onApply,
  onSave,
  onViewDetails,
  showSaveButton = true,
  isSaved = false,
  isApplying = false,
  compact = false
}) => {
  const [saved, setSaved] = useState(isSaved);
  const [imageError, setImageError] = useState(false);

  // Normalize job data to prevent undefined values
  const normalizedJob = normalizeJob(job);

  if (!normalizedJob || !normalizedJob.id) {
    return null;
  }

  const {
    id,
    title,
    companyName,
    companyLogo,
    companyInitials,
    companyVerified,
    location,
    hasLocation,
    jobTypeLabel,
    categoryLabel,
    sport,
    salary,
    hasSalary,
    publishedAtFormatted,
    deadlineFormatted,
    isExpired,
    description,
    applicationsCount
  } = normalizedJob;

  const handleSave = (e) => {
    e.stopPropagation();
    setSaved(!saved);
    if (onSave) {
      onSave(id, !saved);
    }
  };

  const handleApply = (e) => {
    e.stopPropagation();
    if (onApply && !isExpired) {
      onApply(id);
    }
  };

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(id);
    }
  };

  // Truncate description safely
  const truncatedDescription = description
    ? description.length > 120
      ? description.substring(0, 120) + '...'
      : description
    : null;

  return (
    <article
      className={`tf1-job-card ${compact ? 'tf1-job-card--compact' : ''} ${isExpired ? 'tf1-job-card--expired' : ''}`}
      onClick={handleViewDetails}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleViewDetails()}
    >
      {/* Card Header */}
      <header className="tf1-job-card__header">
        <div className="tf1-job-card__company-info">
          {/* Company Logo or Initials */}
          <div className="tf1-job-card__logo-wrapper">
            {companyLogo && !imageError ? (
              <img
                src={companyLogo}
                alt={companyName}
                className="tf1-job-card__logo"
                onError={() => setImageError(true)}
                loading="lazy"
              />
            ) : (
              <div className="tf1-job-card__logo-placeholder">
                {companyInitials}
              </div>
            )}
            {companyVerified && (
              <span className="tf1-job-card__verified-badge" title="حساب موثق">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L3.5 6.5V12C3.5 16.55 7.21 20.74 12 22C16.79 20.74 20.5 16.55 20.5 12V6.5L12 2ZM10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>
                </svg>
              </span>
            )}
          </div>

          {/* Title & Company */}
          <div className="tf1-job-card__titles">
            <h3 className="tf1-job-card__title">{title}</h3>
            <p className="tf1-job-card__company">{companyName}</p>
          </div>
        </div>

        {/* Save Button */}
        {showSaveButton && (
          <button
            className={`tf1-job-card__save-btn ${saved ? 'tf1-job-card__save-btn--saved' : ''}`}
            onClick={handleSave}
            aria-label={saved ? 'الغاء الحفظ' : 'حفظ الوظيفة'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M19 21L12 16L5 21V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H17C17.5304 3 18.0391 3.21071 18.4142 3.58579C18.7893 3.96086 19 4.46957 19 5V21Z"/>
            </svg>
          </button>
        )}
      </header>

      {/* Meta Information */}
      <div className="tf1-job-card__meta">
        {/* Location */}
        {hasLocation && (
          <div className="tf1-job-card__meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10C21 17 12 23 12 23S3 17 3 10C3 5.02944 7.02944 1 12 1C16.9706 1 21 5.02944 21 10Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span>{location}</span>
          </div>
        )}

        {/* Job Type */}
        <div className="tf1-job-card__meta-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
            <path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21"/>
          </svg>
          <span>{jobTypeLabel}</span>
        </div>

        {/* Sport/Category */}
        {(sport || categoryLabel) && (
          <div className="tf1-job-card__meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 2C12 2 16 6 16 12C16 18 12 22 12 22"/>
              <path d="M12 2C12 2 8 6 8 12C8 18 12 22 12 22"/>
              <path d="M2 12H22"/>
            </svg>
            <span>{sport || categoryLabel}</span>
          </div>
        )}

        {/* Published Date */}
        {publishedAtFormatted && (
          <div className="tf1-job-card__meta-item tf1-job-card__meta-item--date">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
            <span>{publishedAtFormatted}</span>
          </div>
        )}
      </div>

      {/* Description (if not compact) */}
      {!compact && truncatedDescription && (
        <p className="tf1-job-card__description">{truncatedDescription}</p>
      )}

      {/* Tags Row */}
      <div className="tf1-job-card__tags">
        {hasSalary && (
          <span className="tf1-job-card__tag tf1-job-card__tag--salary">
            {salary}
          </span>
        )}
        {deadlineFormatted && (
          <span className={`tf1-job-card__tag tf1-job-card__tag--deadline ${isExpired ? 'tf1-job-card__tag--expired' : ''}`}>
            {deadlineFormatted}
          </span>
        )}
        {applicationsCount !== null && (
          <span className="tf1-job-card__tag tf1-job-card__tag--applications">
            {applicationsCount} متقدم
          </span>
        )}
      </div>

      {/* Card Footer */}
      <footer className="tf1-job-card__footer">
        <button
          className="tf1-job-card__btn tf1-job-card__btn--primary"
          onClick={handleApply}
          disabled={isApplying || isExpired}
        >
          {isApplying ? (
            <>
              <span className="tf1-job-card__spinner"></span>
              جاري التقديم...
            </>
          ) : isExpired ? (
            'انتهى التقديم'
          ) : (
            'تقديم طلب'
          )}
        </button>

        <button
          className="tf1-job-card__btn tf1-job-card__btn--secondary"
          onClick={handleViewDetails}
        >
          عرض التفاصيل
        </button>
      </footer>
    </article>
  );
};

export default JobCard;
