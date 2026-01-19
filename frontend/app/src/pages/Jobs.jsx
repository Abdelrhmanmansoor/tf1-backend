/**
 * Jobs Listing Page - TF1 Jobs Platform
 * Premium job listing with RTL Arabic support
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobService, profileService } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { normalizeJobs, safeTitle } from '../utils/normalizeJob';
import JobCard from '../components/jobs/JobCard';
import '../styles/JobsPage.css';

const Jobs = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyingTo, setApplyingTo] = useState(null);
  const [options, setOptions] = useState(null);
  const [savedJobs, setSavedJobs] = useState(new Set());
  const [filters, setFilters] = useState({
    region: '',
    city: '',
    sport: '',
    jobType: ''
  });
  const [sortBy, setSortBy] = useState('newest');

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Update page title safely
  useEffect(() => {
    const jobCount = jobs.length;
    document.title = safeTitle('وظائف TF1 | {count} فرصة متاحة', {
      count: jobCount > 0 ? jobCount : ''
    }).replace('|  ', '| ');
  }, [jobs.length]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [jobsRes, optionsRes] = await Promise.all([
        jobService.getJobs(),
        profileService.getOptions()
      ]);

      // Normalize jobs to prevent undefined values
      const rawJobs = jobsRes.data?.jobs || jobsRes.data || [];
      const normalizedJobs = normalizeJobs(rawJobs);

      setJobs(normalizedJobs);
      setOptions(optionsRes.data?.data || optionsRes.data || null);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle job application
  const handleApply = useCallback(async (jobId) => {
    if (!user) {
      // Store intended action and redirect to login
      sessionStorage.setItem('redirectAfterLogin', `/jobs?apply=${jobId}`);
      navigate('/login', { state: { message: 'يجب تسجيل الدخول للتقديم على الوظائف' } });
      return;
    }

    try {
      setApplyingTo(jobId);
      await jobService.applyToJob(jobId, {});
      // Show success message (you can replace with a toast notification)
      alert('تم ارسال طلبك بنجاح');
    } catch (error) {
      const message = error.response?.data?.message ||
                      error.response?.data?.messageAr ||
                      'حدث خطا اثناء التقديم';
      alert(message);
    } finally {
      setApplyingTo(null);
    }
  }, [user, navigate]);

  // Handle save job
  const handleSave = useCallback((jobId, isSaved) => {
    setSavedJobs(prev => {
      const newSet = new Set(prev);
      if (isSaved) {
        newSet.add(jobId);
      } else {
        newSet.delete(jobId);
      }
      return newSet;
    });
    // TODO: Persist to backend
  }, []);

  // Handle view details
  const handleViewDetails = useCallback((jobId) => {
    navigate(`/jobs/${jobId}`);
  }, [navigate]);

  // Handle filter changes
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Reset filters
  const handleResetFilters = useCallback(() => {
    setFilters({
      region: '',
      city: '',
      sport: '',
      jobType: ''
    });
  }, []);

  // Apply filters to jobs
  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    // Apply filters
    if (filters.region) {
      result = result.filter(job =>
        job.location?.includes(filters.region) ||
        job._raw?.address?.region === filters.region
      );
    }

    if (filters.sport) {
      result = result.filter(job =>
        job.sport?.toLowerCase() === filters.sport.toLowerCase()
      );
    }

    if (filters.jobType) {
      result = result.filter(job =>
        job._raw?.jobType === filters.jobType
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));
        break;
      case 'salary-high':
        result.sort((a, b) => (b._raw?.salaryRange?.max || 0) - (a._raw?.salaryRange?.max || 0));
        break;
      case 'salary-low':
        result.sort((a, b) => (a._raw?.salaryRange?.min || 0) - (b._raw?.salaryRange?.min || 0));
        break;
      default:
        break;
    }

    return result;
  }, [jobs, filters, sortBy]);

  // Stats for hero section
  const stats = useMemo(() => ({
    totalJobs: jobs.length,
    activeJobs: jobs.filter(j => j.isActive).length,
    companies: new Set(jobs.map(j => j.companyName)).size
  }), [jobs]);

  // Render loading skeleton
  const renderSkeleton = () => (
    <>
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="tf1-jobs-skeleton">
          <div className="tf1-jobs-skeleton__header">
            <div className="tf1-jobs-skeleton__avatar"></div>
            <div className="tf1-jobs-skeleton__lines">
              <div className="tf1-jobs-skeleton__line"></div>
              <div className="tf1-jobs-skeleton__line tf1-jobs-skeleton__line--short"></div>
            </div>
          </div>
          <div className="tf1-jobs-skeleton__meta">
            <div className="tf1-jobs-skeleton__meta-item"></div>
            <div className="tf1-jobs-skeleton__meta-item"></div>
            <div className="tf1-jobs-skeleton__meta-item"></div>
          </div>
          <div className="tf1-jobs-skeleton__footer">
            <div className="tf1-jobs-skeleton__btn"></div>
            <div className="tf1-jobs-skeleton__btn"></div>
          </div>
        </div>
      ))}
    </>
  );

  return (
    <div className="tf1-jobs-page" dir="rtl">
      {/* Hero Header */}
      <header className="tf1-jobs-hero">
        <div className="tf1-jobs-hero__content">
          <h1 className="tf1-jobs-hero__title">فرص العمل في عالم الرياضة</h1>
          <p className="tf1-jobs-hero__subtitle">
            اكتشف افضل الفرص الوظيفية في المجال الرياضي وابدا مسيرتك المهنية
          </p>

          {!loading && stats.totalJobs > 0 && (
            <div className="tf1-jobs-hero__stats">
              <div className="tf1-jobs-hero__stat">
                <span className="tf1-jobs-hero__stat-value">{stats.totalJobs}</span>
                <span className="tf1-jobs-hero__stat-label">وظيفة متاحة</span>
              </div>
              <div className="tf1-jobs-hero__stat">
                <span className="tf1-jobs-hero__stat-value">{stats.companies}</span>
                <span className="tf1-jobs-hero__stat-label">جهة توظيف</span>
              </div>
              <div className="tf1-jobs-hero__stat">
                <span className="tf1-jobs-hero__stat-value">{stats.activeJobs}</span>
                <span className="tf1-jobs-hero__stat-label">وظيفة نشطة</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="tf1-jobs-container">
        {/* Filters Section */}
        <section className="tf1-jobs-filters">
          <div className="tf1-jobs-filters__header">
            <div className="tf1-jobs-filters__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
            </div>
            <h2 className="tf1-jobs-filters__title">تصفية النتائج</h2>
          </div>

          <div className="tf1-jobs-filters__grid">
            {/* Region Filter */}
            <div className="tf1-jobs-filters__group">
              <label className="tf1-jobs-filters__label">المنطقة</label>
              <select
                className="tf1-jobs-filters__select"
                value={filters.region}
                onChange={(e) => handleFilterChange('region', e.target.value)}
              >
                <option value="">جميع المناطق</option>
                {options?.regions?.map(region => (
                  <option key={region.id || region.name} value={region.name}>
                    {region.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sport Filter */}
            <div className="tf1-jobs-filters__group">
              <label className="tf1-jobs-filters__label">نوع الرياضة</label>
              <select
                className="tf1-jobs-filters__select"
                value={filters.sport}
                onChange={(e) => handleFilterChange('sport', e.target.value)}
              >
                <option value="">جميع الرياضات</option>
                {options?.sports?.map(sport => (
                  <option key={sport} value={sport}>{sport}</option>
                ))}
              </select>
            </div>

            {/* Job Type Filter */}
            <div className="tf1-jobs-filters__group">
              <label className="tf1-jobs-filters__label">نوع الوظيفة</label>
              <select
                className="tf1-jobs-filters__select"
                value={filters.jobType}
                onChange={(e) => handleFilterChange('jobType', e.target.value)}
              >
                <option value="">جميع الانواع</option>
                <option value="full-time">دوام كامل</option>
                <option value="part-time">دوام جزئي</option>
                <option value="contract">عقد محدد</option>
                <option value="freelance">عمل حر</option>
              </select>
            </div>

            {/* Sort */}
            <div className="tf1-jobs-filters__group">
              <label className="tf1-jobs-filters__label">الترتيب</label>
              <select
                className="tf1-jobs-filters__select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">الاحدث</option>
                <option value="oldest">الاقدم</option>
                <option value="salary-high">الراتب: الاعلى</option>
                <option value="salary-low">الراتب: الاقل</option>
              </select>
            </div>
          </div>

          {/* Filter Actions */}
          {(filters.region || filters.sport || filters.jobType) && (
            <div className="tf1-jobs-filters__actions">
              <button
                className="tf1-jobs-filters__btn tf1-jobs-filters__btn--secondary"
                onClick={handleResetFilters}
              >
                مسح الفلاتر
              </button>
            </div>
          )}
        </section>

        {/* Results Header */}
        <div className="tf1-jobs-results-header">
          <p className="tf1-jobs-results-count">
            {loading ? (
              'جاري البحث...'
            ) : (
              <>
                تم العثور على <strong>{filteredJobs.length}</strong> وظيفة
                {filters.region || filters.sport || filters.jobType ? ' (مع الفلاتر)' : ''}
              </>
            )}
          </p>
        </div>

        {/* Jobs Grid */}
        <div className="tf1-jobs-grid">
          {loading ? (
            renderSkeleton()
          ) : filteredJobs.length === 0 ? (
            <div className="tf1-jobs-empty">
              <div className="tf1-jobs-empty__icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                  <path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21"/>
                </svg>
              </div>
              <h3 className="tf1-jobs-empty__title">لا توجد وظائف متاحة</h3>
              <p className="tf1-jobs-empty__text">
                {filters.region || filters.sport || filters.jobType
                  ? 'جرب تغيير الفلاتر للحصول على نتائج اكثر'
                  : 'لا توجد وظائف متاحة حاليا، تابعنا للحصول على فرص جديدة'
                }
              </p>
            </div>
          ) : (
            filteredJobs.map(job => (
              <JobCard
                key={job.id}
                job={job._raw}
                onApply={handleApply}
                onSave={handleSave}
                onViewDetails={handleViewDetails}
                isSaved={savedJobs.has(job.id)}
                isApplying={applyingTo === job.id}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Jobs;
