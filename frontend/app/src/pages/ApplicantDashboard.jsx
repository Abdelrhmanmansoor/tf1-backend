import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { applicantService } from '../config/api';
import '../styles/AdminDashboard.css';

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

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await applicantService.getDashboard();
      setDashboardData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.messageAr || 'خطأ في تحميل لوحة التحكم');
    } finally {
      setLoading(false);
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
      <h2>لوحة التحكم</h2>
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
              {dashboardData.recommendedJobs?.length > 0 ? (
                dashboardData.recommendedJobs.map(job => (
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
              )}
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
    <div className="admin-dashboard applicant-dashboard">
      <div className="dashboard-header">
        <h1>لوحة تحكم المتقدم</h1>
        <p>مرحباً، {user?.firstName || 'المتقدم'}</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="dashboard-tabs">
        <button 
          className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          الرئيسية
        </button>
        <button 
          className={`tab ${activeTab === 'applications' ? 'active' : ''}`}
          onClick={() => setActiveTab('applications')}
        >
          طلباتي
        </button>
        <button 
          className={`tab ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => setActiveTab('jobs')}
        >
          الوظائف المتاحة
        </button>
      </div>

      <div className="dashboard-content">
        {loading && <div className="loading-spinner">جاري التحميل...</div>}
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'applications' && renderApplications()}
        {activeTab === 'jobs' && renderAvailableJobs()}
      </div>

      {showApplicationModal && renderApplicationModal()}
      {showWithdrawModal && renderWithdrawModal()}
    </div>
  );
};

export default ApplicantDashboard;
