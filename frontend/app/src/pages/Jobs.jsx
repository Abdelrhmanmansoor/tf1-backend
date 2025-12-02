import { useState, useEffect } from 'react';
import { jobService, profileService } from '../config/api';
import { useAuth } from '../context/AuthContext';
import CascadingSelect from '../components/CascadingSelect';

const Jobs = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState(null);
  const [filters, setFilters] = useState({
    region: '',
    city: '',
    sport: '',
    jobType: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [jobsRes, optionsRes] = await Promise.all([
        jobService.getJobs(),
        profileService.getOptions()
      ]);
      setJobs(jobsRes.data.jobs || []);
      setOptions(optionsRes.data.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (jobId) => {
    if (!user) {
      alert('يجب تسجيل الدخول أولاً');
      return;
    }
    try {
      await jobService.applyToJob(jobId, {});
      alert('✔ تم إرسال طلبك بنجاح!');
    } catch (error) {
      alert(error.response?.data?.message || 'خطأ في التقديم');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (loading) return <div className="loading">جاري التحميل...</div>;

  return (
    <div className="jobs-page">
      <div className="jobs-header">
        <h1>💼 فرص العمل</h1>
        <p>ابحث عن فرصتك في عالم الرياضة</p>
      </div>

      <div className="filters-section">
        <h3>🔍 فلاتر البحث</h3>
        
        <div className="filter-row">
          {options && (
            <>
              <div className="select-group">
                <label>المنطقة</label>
                <select 
                  value={filters.region}
                  onChange={(e) => handleFilterChange('region', e.target.value)}
                >
                  <option value="">الكل</option>
                  {options.regions?.map(region => (
                    <option key={region.id} value={region.name}>{region.name}</option>
                  ))}
                </select>
              </div>

              <div className="select-group">
                <label>نوع الرياضة</label>
                <select 
                  value={filters.sport}
                  onChange={(e) => handleFilterChange('sport', e.target.value)}
                >
                  <option value="">الكل</option>
                  {options.sports?.map(sport => (
                    <option key={sport} value={sport}>{sport}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="select-group">
            <label>نوع الوظيفة</label>
            <select 
              value={filters.jobType}
              onChange={(e) => handleFilterChange('jobType', e.target.value)}
            >
              <option value="">الكل</option>
              <option value="full-time">دوام كامل</option>
              <option value="part-time">دوام جزئي</option>
              <option value="contract">عقد</option>
              <option value="freelance">حر</option>
            </select>
          </div>
        </div>
      </div>

      <div className="jobs-list">
        {jobs.length === 0 ? (
          <div className="no-jobs">
            <p>لا توجد وظائف متاحة حالياً</p>
          </div>
        ) : (
          jobs.map(job => (
            <div key={job._id} className="job-card">
              <div className="job-header">
                <h3>{job.title}</h3>
                <span className="job-type">{job.jobType}</span>
              </div>
              
              <div className="job-details">
                <p>🏢 {job.club?.name || 'نادي'}</p>
                <p>📍 {job.location || 'غير محدد'}</p>
                <p>⚽ {job.sport || 'رياضة عامة'}</p>
                {job.salaryRange && (
                  <p>💰 {job.salaryRange.min} - {job.salaryRange.max} ر.س</p>
                )}
              </div>

              <p className="job-description">
                {job.description?.substring(0, 150)}...
              </p>

              <div className="job-actions">
                <button 
                  className="apply-btn"
                  onClick={() => handleApply(job._id)}
                >
                  تقديم طلب
                </button>
                <span className="job-date">
                  {new Date(job.postedAt).toLocaleDateString('ar-SA')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Jobs;
