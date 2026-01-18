import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { applicantService } from '../config/api';
import '../styles/ApplicantDashboard.css';

const ApplicantDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [dashboardData, setDashboardData] = useState(null);
  const [applications, setApplications] = useState([]);
  const [availableJobs, setAvailableJobs] = useState([]);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [profileBundle, setProfileBundle] = useState(null);
  const [profileForm, setProfileForm] = useState({
    headline: '',
    bio: '',
    location: { country: '', region: '', city: '' },
    contact: { phone: '', whatsapp: '', email: '' },
    qualification: '',
    experienceYears: '',
    skillsText: '',
    links: { linkedin: '', portfolio: '', github: '', website: '' },
    resume: { url: '', filename: '' },
    preferences: {
      employmentType: '',
      jobType: '',
      remote: false,
      expectedSalary: '',
    },
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [appsPagination, setAppsPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [jobsPagination, setJobsPagination] = useState({ page: 1, limit: 10, total: 0 });

  useEffect(() => {
    if (!user || user.role !== 'applicant') {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboard();
      fetchRecommendations();
      fetchProfile(true);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'applications') {
      fetchApplications();
    }
  }, [activeTab, appsPagination.page, statusFilter]);

  useEffect(() => {
    if (activeTab === 'jobs') {
      fetchAvailableJobs();
    }
  }, [activeTab, jobsPagination.page]);

  useEffect(() => {
    if (activeTab === 'profile') {
      fetchProfile(false);
    }
  }, [activeTab]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await applicantService.getDashboard({ includeRecommendations: false });
      setDashboardData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.messageAr || 'خطأ في تحميل لوحة التحكم');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      setRecommendationsLoading(true);
      const res = await applicantService.getRecommendations({ limit: 6 });
      setRecommendedJobs(res.data.data?.recommendedJobs || []);
    } catch {
      setRecommendedJobs([]);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  const fetchProfile = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await applicantService.getProfile();
      const bundle = res.data.data;
      setProfileBundle(bundle);

      const profile = bundle?.profile || {};
      setProfileForm({
        headline: profile.headline || '',
        bio: profile.bio || '',
        location: {
          country: profile.location?.country || '',
          region: profile.location?.region || '',
          city: profile.location?.city || '',
        },
        contact: {
          phone: profile.contact?.phone || bundle?.user?.phone || '',
          whatsapp: profile.contact?.whatsapp || '',
          email: profile.contact?.email || bundle?.user?.email || '',
        },
        qualification: profile.qualification || '',
        experienceYears:
          profile.experienceYears === 0 || profile.experienceYears
            ? String(profile.experienceYears)
            : '',
        skillsText: Array.isArray(profile.skills) ? profile.skills.join(', ') : '',
        links: {
          linkedin: profile.links?.linkedin || '',
          portfolio: profile.links?.portfolio || '',
          github: profile.links?.github || '',
          website: profile.links?.website || '',
        },
        resume: {
          url: profile.resume?.url || '',
          filename: profile.resume?.filename || '',
        },
        preferences: {
          employmentType: profile.preferences?.employmentType || '',
          jobType: profile.preferences?.jobType || '',
          remote: Boolean(profile.preferences?.remote),
          expectedSalary:
            profile.preferences?.expectedSalary === 0 ||
            profile.preferences?.expectedSalary
              ? String(profile.preferences?.expectedSalary)
              : '',
        },
      });
    } catch (err) {
      setError(err.response?.data?.messageAr || 'خطأ في تحميل الملف الشخصي');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setProfileSaving(true);
      setError('');
      setSuccess('');

      const skills = profileForm.skillsText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const payload = {
        headline: profileForm.headline,
        bio: profileForm.bio,
        location: profileForm.location,
        contact: profileForm.contact,
        qualification: profileForm.qualification,
        experienceYears:
          profileForm.experienceYears === '' ? undefined : Number(profileForm.experienceYears),
        skills,
        links: profileForm.links,
        resume: profileForm.resume,
        preferences: {
          ...profileForm.preferences,
          expectedSalary:
            profileForm.preferences.expectedSalary === ''
              ? undefined
              : Number(profileForm.preferences.expectedSalary),
        },
      };

      const res = await applicantService.updateProfile(payload);
      setProfileBundle(prev => ({
        ...prev,
        profile: res.data.data?.profile,
      }));
      setSuccess('تم حفظ الملف الشخصي بنجاح');
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(err.response?.data?.messageAr || 'خطأ في حفظ الملف الشخصي');
    } finally {
      setProfileSaving(false);
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = { page: appsPagination.page, limit: appsPagination.limit };
      if (statusFilter) params.status = statusFilter;
      
      const res = await applicantService.getMyApplications(params);
      setApplications(res.data.data?.applications || []);
      if (res.data.data?.pagination) {
        setAppsPagination(prev => ({ ...prev, ...res.data.data.pagination }));
      }
    } catch (err) {
      setError(err.response?.data?.messageAr || 'خطأ في تحميل الطلبات');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableJobs = async () => {
    try {
      setLoading(true);
      const res = await applicantService.getAvailableJobs({ page: jobsPagination.page, limit: jobsPagination.limit });
      setAvailableJobs(res.data.data?.jobs || []);
      if (res.data.data?.pagination) {
        setJobsPagination(prev => ({ ...prev, ...res.data.data.pagination }));
      }
    } catch (err) {
      setError(err.response?.data?.messageAr || 'خطأ في تحميل الوظائف');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicationDetails = async (applicationId) => {
    try {
      setLoading(true);
      const res = await applicantService.getApplicationDetails(applicationId);
      setSelectedApplication(res.data.data);
      setShowApplicationModal(true);
    } catch (err) {
      setError(err.response?.data?.messageAr || 'خطأ في تحميل تفاصيل الطلب');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawApplication = async () => {
    if (!selectedApplication) return;
    try {
      setLoading(true);
      await applicantService.withdrawApplication(selectedApplication._id, withdrawReason);
      setSuccess('تم سحب الطلب بنجاح');
      setShowWithdrawModal(false);
      setWithdrawReason('');
      const updatedRes = await applicantService.getApplicationDetails(selectedApplication._id);
      setSelectedApplication(updatedRes.data.data);
      fetchApplications();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.messageAr || 'خطأ في سحب الطلب');
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      'new': 'جديد',
      'under_review': 'قيد المراجعة',
      'interviewed': 'تمت المقابلة',
      'offered': 'عرض وظيفي',
      'hired': 'تم التوظيف',
      'rejected': 'مرفوض',
      'withdrawn': 'منسحب',
      'accepted': 'مقبول'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      'new': '#2196F3',
      'under_review': '#FF9800',
      'interviewed': '#9C27B0',
      'offered': '#4CAF50',
      'hired': '#00BCD4',
      'rejected': '#F44336',
      'withdrawn': '#9E9E9E',
      'accepted': '#8BC34A'
    };
    return colors[status] || '#757575';
  };

  const renderDashboard = () => (
    <div className="dashboard-overview">
      <div className="applicant-section-title">
        <h2>لوحة التحكم</h2>
        <div className="applicant-subtitle">نظرة سريعة على نشاطك وفرصك الحالية</div>
      </div>
      {dashboardData && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-icon">📝</span>
              <div className="stat-info">
                <h3>{dashboardData.stats?.totalApplications || 0}</h3>
                <p>إجمالي الطلبات</p>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">⏳</span>
              <div className="stat-info">
                <h3>{dashboardData.stats?.pending || 0}</h3>
                <p>قيد الانتظار</p>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">🔍</span>
              <div className="stat-info">
                <h3>{dashboardData.stats?.underReview || 0}</h3>
                <p>قيد المراجعة</p>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">🎉</span>
              <div className="stat-info">
                <h3>{dashboardData.stats?.offered || 0}</h3>
                <p>عروض وظيفية</p>
              </div>
            </div>
          </div>

          <div className="profile-cta">
            <div className="profile-cta-left">
              <div className="profile-cta-title">ملفك الشخصي</div>
              <div className="profile-cta-desc">
                اكتمال الملف: {profileBundle?.profile?.completion ?? 0}%
              </div>
              <div className="progress">
                <div
                  className="progress-bar"
                  style={{ width: `${profileBundle?.profile?.completion ?? 0}%` }}
                />
              </div>
            </div>
            <button className="btn-primary" onClick={() => setActiveTab('profile')}>
              تحسين الملف الشخصي
            </button>
          </div>

          <div className="recent-section">
            <h3>آخر طلباتك</h3>
            <div className="recent-list">
              {dashboardData.recentApplications?.length > 0 ? (
                dashboardData.recentApplications.map(app => (
                  <div key={app._id} className="recent-item">
                    <div className="recent-info">
                      <strong>{app.jobId?.title}</strong>
                      <span>{new Date(app.createdAt).toLocaleDateString('ar-SA')}</span>
                    </div>
                    <span className="status-badge" style={{ backgroundColor: getStatusColor(app.status) }}>
                      {getStatusText(app.status)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="empty-message">لا توجد طلبات حديثة</p>
              )}
            </div>
          </div>

          <div className="recent-section">
            <h3>وظائف مقترحة لك</h3>
            <div className="recommended-jobs">
              {recommendationsLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="job-card-small skeleton">
                    <div className="skeleton-line w-70" />
                    <div className="skeleton-line w-50" />
                    <div className="skeleton-btn" />
                  </div>
                ))
              ) : (recommendedJobs.length > 0 ? (
                recommendedJobs.map(job => (
                  <div key={job._id} className="job-card-small">
                    <h4>{job.titleAr || job.title}</h4>
                    <p>{job.sport} - {job.category}</p>
                    <button className="btn-small" onClick={() => navigate('/jobs')}>
                      عرض التفاصيل
                    </button>
                  </div>
                ))
              ) : (
                <p className="empty-message">لا توجد وظائف مقترحة</p>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderApplications = () => (
    <div className="applications-section">
      <div className="section-header">
        <h2>طلباتي</h2>
        <select 
          value={statusFilter} 
          onChange={(e) => { setStatusFilter(e.target.value); setAppsPagination(prev => ({ ...prev, page: 1 })); }}
          className="filter-select"
        >
          <option value="">جميع الحالات</option>
          <option value="new">جديد</option>
          <option value="under_review">قيد المراجعة</option>
          <option value="interviewed">تمت المقابلة</option>
          <option value="offered">عرض وظيفي</option>
          <option value="hired">تم التوظيف</option>
          <option value="rejected">مرفوض</option>
          <option value="withdrawn">منسحب</option>
        </select>
      </div>

      <div className="applications-list">
        {applications.length > 0 ? (
          applications.map(app => (
            <div key={app._id} className="application-card">
              <div className="application-header">
                <h3>{app.jobId?.title}</h3>
                <span className="status-badge" style={{ backgroundColor: getStatusColor(app.status) }}>
                  {getStatusText(app.status)}
                </span>
              </div>
              <div className="application-meta">
                <span>📅 تاريخ التقديم: {new Date(app.createdAt).toLocaleDateString('ar-SA')}</span>
                <span>🏷️ {app.jobId?.category}</span>
              </div>
              <div className="application-actions">
                <button 
                  className="btn-secondary"
                  onClick={() => fetchApplicationDetails(app._id)}
                >
                  عرض التفاصيل
                </button>
                {!['withdrawn', 'hired', 'rejected'].includes(app.status) && (
                  <button 
                    className="btn-danger"
                    onClick={() => { setSelectedApplication(app); setShowWithdrawModal(true); }}
                  >
                    سحب الطلب
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="empty-message">لا توجد طلبات</p>
        )}
      </div>

      <div className="pagination">
        <button
          className="btn-secondary"
          disabled={(appsPagination.page || 1) <= 1 || loading}
          onClick={() =>
            setAppsPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))
          }
        >
          السابق
        </button>
        <div className="pagination-info">
          صفحة {appsPagination.page || 1} من {appsPagination.pages || 1}
        </div>
        <button
          className="btn-secondary"
          disabled={
            (appsPagination.pages || 1) <= (appsPagination.page || 1) || loading
          }
          onClick={() =>
            setAppsPagination(prev => ({ ...prev, page: prev.page + 1 }))
          }
        >
          التالي
        </button>
      </div>
    </div>
  );

  const renderAvailableJobs = () => (
    <div className="jobs-section">
      <div className="section-header">
        <h2>الوظائف المتاحة</h2>
      </div>

      <div className="jobs-list">
        {availableJobs.length > 0 ? (
          availableJobs.map(job => (
            <div key={job._id} className="job-card">
              <div className="job-header">
                <h3>{job.titleAr || job.title}</h3>
              </div>
              <div className="job-meta">
                <span>🏷️ {job.category}</span>
                <span>⚽ {job.sport}</span>
                <span>📅 {new Date(job.createdAt).toLocaleDateString('ar-SA')}</span>
              </div>
              <p className="job-description">{job.description?.substring(0, 150)}...</p>
              <div className="job-actions">
                <button className="btn-primary" onClick={() => navigate('/jobs')}>
                  التقديم على الوظيفة
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="empty-message">لا توجد وظائف متاحة حالياً</p>
        )}
      </div>

      <div className="pagination">
        <button
          className="btn-secondary"
          disabled={(jobsPagination.page || 1) <= 1 || loading}
          onClick={() =>
            setJobsPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))
          }
        >
          السابق
        </button>
        <div className="pagination-info">
          صفحة {jobsPagination.page || 1} من {jobsPagination.pages || 1}
        </div>
        <button
          className="btn-secondary"
          disabled={
            (jobsPagination.pages || 1) <= (jobsPagination.page || 1) || loading
          }
          onClick={() =>
            setJobsPagination(prev => ({ ...prev, page: prev.page + 1 }))
          }
        >
          التالي
        </button>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="profile-page">
      <div className="profile-top">
        <div className="profile-top-main">
          <div className="profile-avatar">
            {(user?.firstName?.[0] || 'م') + (user?.lastName?.[0] || '')}
          </div>
          <div className="profile-top-text">
            <h2 className="profile-name">
              {user?.firstName} {user?.lastName}
            </h2>
            <div className="profile-headline">
              {profileForm.headline || 'أضف عنواناً احترافياً يعرّفك بسرعة'}
            </div>
          </div>
        </div>

        <div className="profile-completion">
          <div className="profile-completion-row">
            <span>اكتمال الملف</span>
            <strong>{profileBundle?.profile?.completion ?? 0}%</strong>
          </div>
          <div className="progress">
            <div
              className="progress-bar"
              style={{ width: `${profileBundle?.profile?.completion ?? 0}%` }}
            />
          </div>
        </div>
      </div>

      <div className="profile-grid">
        <div className="profile-card">
          <h3>المعلومات المهنية</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>عنوانك المهني</label>
              <input
                value={profileForm.headline}
                onChange={e =>
                  setProfileForm(prev => ({ ...prev, headline: e.target.value }))
                }
                placeholder="مثال: باحث/محلل بيانات رياضية"
              />
            </div>
            <div className="form-group">
              <label>المؤهل</label>
              <input
                value={profileForm.qualification}
                onChange={e =>
                  setProfileForm(prev => ({
                    ...prev,
                    qualification: e.target.value,
                  }))
                }
                placeholder="مثال: بكالوريوس علوم رياضية"
              />
            </div>
            <div className="form-group">
              <label>سنوات الخبرة</label>
              <input
                type="number"
                value={profileForm.experienceYears}
                onChange={e =>
                  setProfileForm(prev => ({
                    ...prev,
                    experienceYears: e.target.value,
                  }))
                }
                placeholder="مثال: 3"
              />
            </div>
          </div>
        </div>

        <div className="profile-card">
          <h3>نبذة مختصرة</h3>
          <div className="form-group">
            <textarea
              value={profileForm.bio}
              onChange={e => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
              rows={5}
              placeholder="اكتب نبذة قصيرة عن خبراتك وما تبحث عنه..."
            />
          </div>
        </div>

        <div className="profile-card">
          <h3>الموقع والتواصل</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>الدولة</label>
              <input
                value={profileForm.location.country}
                onChange={e =>
                  setProfileForm(prev => ({
                    ...prev,
                    location: { ...prev.location, country: e.target.value },
                  }))
                }
              />
            </div>
            <div className="form-group">
              <label>المنطقة</label>
              <input
                value={profileForm.location.region}
                onChange={e =>
                  setProfileForm(prev => ({
                    ...prev,
                    location: { ...prev.location, region: e.target.value },
                  }))
                }
              />
            </div>
            <div className="form-group">
              <label>المدينة</label>
              <input
                value={profileForm.location.city}
                onChange={e =>
                  setProfileForm(prev => ({
                    ...prev,
                    location: { ...prev.location, city: e.target.value },
                  }))
                }
              />
            </div>
            <div className="form-group">
              <label>رقم الهاتف</label>
              <input
                value={profileForm.contact.phone}
                onChange={e =>
                  setProfileForm(prev => ({
                    ...prev,
                    contact: { ...prev.contact, phone: e.target.value },
                  }))
                }
              />
            </div>
            <div className="form-group">
              <label>واتساب</label>
              <input
                value={profileForm.contact.whatsapp}
                onChange={e =>
                  setProfileForm(prev => ({
                    ...prev,
                    contact: { ...prev.contact, whatsapp: e.target.value },
                  }))
                }
              />
            </div>
            <div className="form-group">
              <label>البريد</label>
              <input
                value={profileForm.contact.email}
                onChange={e =>
                  setProfileForm(prev => ({
                    ...prev,
                    contact: { ...prev.contact, email: e.target.value },
                  }))
                }
              />
            </div>
          </div>
        </div>

        <div className="profile-card">
          <h3>المهارات</h3>
          <div className="form-group">
            <input
              value={profileForm.skillsText}
              onChange={e =>
                setProfileForm(prev => ({ ...prev, skillsText: e.target.value }))
              }
              placeholder="افصل المهارات بفاصلة: تحليل, Excel, Python..."
            />
          </div>
        </div>

        <div className="profile-card">
          <h3>روابط</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>LinkedIn</label>
              <input
                value={profileForm.links.linkedin}
                onChange={e =>
                  setProfileForm(prev => ({
                    ...prev,
                    links: { ...prev.links, linkedin: e.target.value },
                  }))
                }
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div className="form-group">
              <label>Portfolio</label>
              <input
                value={profileForm.links.portfolio}
                onChange={e =>
                  setProfileForm(prev => ({
                    ...prev,
                    links: { ...prev.links, portfolio: e.target.value },
                  }))
                }
                placeholder="https://..."
              />
            </div>
            <div className="form-group">
              <label>GitHub</label>
              <input
                value={profileForm.links.github}
                onChange={e =>
                  setProfileForm(prev => ({
                    ...prev,
                    links: { ...prev.links, github: e.target.value },
                  }))
                }
                placeholder="https://github.com/..."
              />
            </div>
            <div className="form-group">
              <label>Website</label>
              <input
                value={profileForm.links.website}
                onChange={e =>
                  setProfileForm(prev => ({
                    ...prev,
                    links: { ...prev.links, website: e.target.value },
                  }))
                }
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        <div className="profile-card">
          <h3>السيرة الذاتية</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>رابط السيرة</label>
              <input
                value={profileForm.resume.url}
                onChange={e =>
                  setProfileForm(prev => ({
                    ...prev,
                    resume: { ...prev.resume, url: e.target.value },
                  }))
                }
                placeholder="ضع رابط PDF/Drive"
              />
            </div>
            <div className="form-group">
              <label>اسم الملف</label>
              <input
                value={profileForm.resume.filename}
                onChange={e =>
                  setProfileForm(prev => ({
                    ...prev,
                    resume: { ...prev.resume, filename: e.target.value },
                  }))
                }
                placeholder="CV.pdf"
              />
            </div>
          </div>
        </div>

        <div className="profile-card">
          <h3>تفضيلات الوظيفة</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>نوع التوظيف</label>
              <input
                value={profileForm.preferences.employmentType}
                onChange={e =>
                  setProfileForm(prev => ({
                    ...prev,
                    preferences: {
                      ...prev.preferences,
                      employmentType: e.target.value,
                    },
                  }))
                }
                placeholder="دوام كامل / جزئي"
              />
            </div>
            <div className="form-group">
              <label>نوع الوظيفة</label>
              <input
                value={profileForm.preferences.jobType}
                onChange={e =>
                  setProfileForm(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, jobType: e.target.value },
                  }))
                }
                placeholder="ميداني / مكتبي"
              />
            </div>
            <div className="form-group">
              <label>راتب متوقع</label>
              <input
                type="number"
                value={profileForm.preferences.expectedSalary}
                onChange={e =>
                  setProfileForm(prev => ({
                    ...prev,
                    preferences: {
                      ...prev.preferences,
                      expectedSalary: e.target.value,
                    },
                  }))
                }
              />
            </div>
            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={profileForm.preferences.remote}
                  onChange={e =>
                    setProfileForm(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, remote: e.target.checked },
                    }))
                  }
                />
                عن بُعد
              </label>
            </div>
          </div>
        </div>

        <div className="profile-actions">
          <button className="btn-primary" onClick={saveProfile} disabled={profileSaving}>
            {profileSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderApplicationModal = () => (
    <div className="modal-overlay" onClick={() => setShowApplicationModal(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>تفاصيل الطلب</h2>
        {selectedApplication && (
          <>
            <div className="application-details">
              <h3>{selectedApplication.jobId?.title}</h3>
              <div className="detail-row">
                <span>الحالة:</span>
                <span className="status-badge" style={{ backgroundColor: getStatusColor(selectedApplication.status) }}>
                  {getStatusText(selectedApplication.status)}
                </span>
              </div>
              <div className="detail-row">
                <span>تاريخ التقديم:</span>
                <span>{new Date(selectedApplication.createdAt).toLocaleDateString('ar-SA')}</span>
              </div>
              <div className="detail-row">
                <span>الفئة:</span>
                <span>{selectedApplication.jobId?.category}</span>
              </div>
              <div className="detail-row">
                <span>الرياضة:</span>
                <span>{selectedApplication.jobId?.sport}</span>
              </div>
            </div>

            <div className="status-timeline">
              <h4>تاريخ الحالة</h4>
              <div className="timeline">
                <div className={`timeline-item ${selectedApplication.status !== 'withdrawn' ? 'active' : ''}`}>
                  <span className="timeline-dot"></span>
                  <span>تم التقديم</span>
                </div>
                {['under_review', 'interviewed', 'offered', 'hired'].includes(selectedApplication.status) && (
                  <div className="timeline-item active">
                    <span className="timeline-dot"></span>
                    <span>قيد المراجعة</span>
                  </div>
                )}
                {['interviewed', 'offered', 'hired'].includes(selectedApplication.status) && (
                  <div className="timeline-item active">
                    <span className="timeline-dot"></span>
                    <span>تمت المقابلة</span>
                  </div>
                )}
                {['offered', 'hired'].includes(selectedApplication.status) && (
                  <div className="timeline-item active">
                    <span className="timeline-dot"></span>
                    <span>عرض وظيفي</span>
                  </div>
                )}
              </div>
            </div>

            <button className="btn-secondary" onClick={() => setShowApplicationModal(false)}>
              إغلاق
            </button>
          </>
        )}
      </div>
    </div>
  );

  const renderWithdrawModal = () => (
    <div className="modal-overlay" onClick={() => setShowWithdrawModal(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>سحب الطلب</h2>
        <p>هل أنت متأكد من سحب طلبك على وظيفة "{selectedApplication?.jobId?.title}"؟</p>
        
        <div className="form-group">
          <label>سبب السحب (اختياري)</label>
          <textarea
            value={withdrawReason}
            onChange={e => setWithdrawReason(e.target.value)}
            rows="3"
            placeholder="اكتب سبب سحب الطلب..."
          />
        </div>

        <div className="form-actions">
          <button className="btn-danger" onClick={handleWithdrawApplication} disabled={loading}>
            {loading ? 'جاري السحب...' : 'تأكيد السحب'}
          </button>
          <button className="btn-secondary" onClick={() => setShowWithdrawModal(false)}>
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-dashboard-container">
      <div className="admin-header">
        <div className="admin-header-content">
          <h1>لوحة تحكم الباحث عن عمل</h1>
          <p>مرحباً، {user?.firstName || 'الباحث'}</p>
        </div>
        <div className="admin-user-info">
          <span className="role-badge" style={{ backgroundColor: '#4CAF50' }}>متقدم</span>
          <span className="user-name">{user?.firstName} {user?.lastName}</span>
        </div>
      </div>

      {error && <div className="error-message">❌ {error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="admin-tabs">
        <button 
          className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 الرئيسية
        </button>
        <button 
          className={`tab-button ${activeTab === 'applications' ? 'active' : ''}`}
          onClick={() => setActiveTab('applications')}
        >
          📝 طلباتي
        </button>
        <button 
          className={`tab-button ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => setActiveTab('jobs')}
        >
          💼 الوظائف المتاحة
        </button>
        <button 
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          👤 ملفي
        </button>
      </div>

      <div className="admin-content">
        {loading && <div className="loading">جاري التحميل...</div>}
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'applications' && renderApplications()}
        {activeTab === 'jobs' && renderAvailableJobs()}
        {activeTab === 'profile' && renderProfile()}
      </div>

      {showApplicationModal && renderApplicationModal()}
      {showWithdrawModal && renderWithdrawModal()}
    </div>
  );
};

export default ApplicantDashboard;
