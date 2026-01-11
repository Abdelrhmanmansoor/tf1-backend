import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { jobPublisherService } from '../config/api';
import '../styles/AdminDashboard.css';

const JobPublisherDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [dashboardData, setDashboardData] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [jobFormData, setJobFormData] = useState({
    title: '',
    titleAr: '',
    description: '',
    descriptionAr: '',
    sport: 'football',
    category: 'coaching',
    jobType: 'full-time',
    status: 'draft',
  });
  const [statusFilter, setStatusFilter] = useState('');
  const [jobsPagination, setJobsPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [appsPagination, setAppsPagination] = useState({ page: 1, limit: 10, total: 0 });

  useEffect(() => {
    if (!user || user.role !== 'job-publisher') {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboard();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'jobs') {
      fetchJobs();
    }
  }, [activeTab, jobsPagination.page]);

  useEffect(() => {
    if (activeTab === 'applications') {
      fetchApplications();
    }
  }, [activeTab, appsPagination.page, statusFilter, selectedJob]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await jobPublisherService.getDashboard();
      setDashboardData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.messageAr || 'خطأ في تحميل لوحة التحكم');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await jobPublisherService.getMyJobs({ page: jobsPagination.page, limit: jobsPagination.limit });
      setJobs(res.data.data?.jobs || []);
      if (res.data.data?.pagination) {
        setJobsPagination(prev => ({ ...prev, ...res.data.data.pagination }));
      }
    } catch (err) {
      setError(err.response?.data?.messageAr || 'خطأ في تحميل الوظائف');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = { page: appsPagination.page, limit: appsPagination.limit };
      if (statusFilter) params.status = statusFilter;
      
      let res;
      if (selectedJob) {
        res = await jobPublisherService.getJobApplications(selectedJob._id, params);
      } else {
        res = await jobPublisherService.getAllApplications(params);
      }
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

  const handleCreateJob = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await jobPublisherService.createJob(jobFormData);
      setSuccess('تم إنشاء الوظيفة بنجاح');
      setShowJobModal(false);
      setJobFormData({ title: '', titleAr: '', description: '', descriptionAr: '', sport: 'football', category: 'coaching', jobType: 'full-time', status: 'draft' });
      fetchJobs();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.messageAr || 'خطأ في إنشاء الوظيفة');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الوظيفة؟')) return;
    try {
      setLoading(true);
      await jobPublisherService.deleteJob(jobId);
      setSuccess('تم حذف الوظيفة بنجاح');
      fetchJobs();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.messageAr || 'خطأ في حذف الوظيفة');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicationDetails = async (applicationId) => {
    try {
      setLoading(true);
      const res = await jobPublisherService.getApplicationDetails(applicationId);
      setSelectedApplication(res.data.data);
      setShowApplicationModal(true);
    } catch (err) {
      setError(err.response?.data?.messageAr || 'خطأ في تحميل تفاصيل الطلب');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (applicationId, newStatus, message = '') => {
    try {
      setLoading(true);
      await jobPublisherService.updateApplicationStatus(applicationId, newStatus, message);
      setSuccess(`تم تحديث حالة الطلب إلى: ${getStatusText(newStatus)}`);
      const updatedRes = await jobPublisherService.getApplicationDetails(applicationId);
      setSelectedApplication(updatedRes.data.data);
      fetchApplications();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.messageAr || 'خطأ في تحديث الحالة');
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
      'withdrawn': 'منسحب'
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
      'withdrawn': '#9E9E9E'
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
              <span className="stat-icon">📋</span>
              <div className="stat-info">
                <h3>{dashboardData.stats?.totalJobs || 0}</h3>
                <p>إجمالي الوظائف</p>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">✅</span>
              <div className="stat-info">
                <h3>{dashboardData.stats?.activeJobs || 0}</h3>
                <p>وظائف نشطة</p>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">📝</span>
              <div className="stat-info">
                <h3>{dashboardData.stats?.totalApplications || 0}</h3>
                <p>إجمالي الطلبات</p>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">🆕</span>
              <div className="stat-info">
                <h3>{dashboardData.stats?.newApplications || 0}</h3>
                <p>طلبات جديدة</p>
              </div>
            </div>
          </div>

          <div className="recent-section">
            <h3>آخر الطلبات</h3>
            <div className="recent-list">
              {dashboardData.recentApplications?.length > 0 ? (
                dashboardData.recentApplications.map(app => (
                  <div key={app._id} className="recent-item">
                    <div className="recent-info">
                      <strong>{app.applicantId?.firstName} {app.applicantId?.lastName}</strong>
                      <span>{app.jobId?.title}</span>
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
        </>
      )}
    </div>
  );

  const renderJobs = () => (
    <div className="jobs-section">
      <div className="section-header">
        <h2>الوظائف المنشورة</h2>
        <button className="btn-primary" onClick={() => setShowJobModal(true)}>
          + إضافة وظيفة جديدة
        </button>
      </div>

      <div className="jobs-list">
        {jobs.length > 0 ? (
          jobs.map(job => (
            <div key={job._id} className="job-card">
              <div className="job-header">
                <h3>{job.titleAr || job.title}</h3>
                <span className={`status-badge status-${job.status}`}>
                  {job.status === 'active' ? 'نشط' : job.status === 'draft' ? 'مسودة' : 'مغلق'}
                </span>
              </div>
              <div className="job-meta">
                <span>🏷️ {job.category}</span>
                <span>⚽ {job.sport}</span>
                <span>📅 {new Date(job.createdAt).toLocaleDateString('ar-SA')}</span>
              </div>
              <div className="job-actions">
                <button className="btn-secondary" onClick={() => {
                  setSelectedJob(job);
                  setAppsPagination(prev => ({ ...prev, page: 1 }));
                  setActiveTab('applications');
                }}>
                  عرض الطلبات ({job.applicationsCount || 0})
                </button>
                <button className="btn-danger" onClick={() => handleDeleteJob(job._id)}>
                  حذف
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="empty-message">لا توجد وظائف منشورة</p>
        )}
      </div>
    </div>
  );

  const renderApplications = () => (
    <div className="applications-section">
      <div className="section-header">
        <h2>
          {selectedJob ? `طلبات وظيفة: ${selectedJob.titleAr || selectedJob.title}` : 'جميع طلبات التوظيف'}
          {selectedJob && (
            <button className="btn-small" onClick={() => { setSelectedJob(null); setAppsPagination(prev => ({ ...prev, page: 1 })); }} style={{ marginRight: '10px' }}>
              عرض الكل
            </button>
          )}
        </h2>
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
        </select>
      </div>

      <div className="applications-pipeline">
        {applications.length > 0 ? (
          <table className="applications-table">
            <thead>
              <tr>
                <th>المتقدم</th>
                <th>الوظيفة</th>
                <th>الحالة</th>
                <th>تاريخ التقديم</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {applications.map(app => (
                <tr key={app._id}>
                  <td>
                    <strong>{app.applicantId?.firstName} {app.applicantId?.lastName}</strong>
                    <br />
                    <small>{app.applicantId?.email}</small>
                  </td>
                  <td>{app.jobId?.title}</td>
                  <td>
                    <span className="status-badge" style={{ backgroundColor: getStatusColor(app.status) }}>
                      {getStatusText(app.status)}
                    </span>
                  </td>
                  <td>{new Date(app.createdAt).toLocaleDateString('ar-SA')}</td>
                  <td>
                    <button 
                      className="btn-small"
                      onClick={() => fetchApplicationDetails(app._id)}
                    >
                      عرض التفاصيل
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-message">لا توجد طلبات</p>
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
            <div className="applicant-info">
              <h3>{selectedApplication.applicantId?.firstName} {selectedApplication.applicantId?.lastName}</h3>
              <p>البريد: {selectedApplication.applicantId?.email}</p>
              <p>الهاتف: {selectedApplication.applicantId?.phone || 'غير متوفر'}</p>
              <p>الوظيفة: {selectedApplication.jobId?.title}</p>
              <p>الحالة الحالية: 
                <span className="status-badge" style={{ backgroundColor: getStatusColor(selectedApplication.status), marginRight: '8px' }}>
                  {getStatusText(selectedApplication.status)}
                </span>
              </p>
            </div>

            <div className="status-actions">
              <h4>تغيير الحالة:</h4>
              <div className="status-buttons">
                {['under_review', 'interviewed', 'offered', 'hired', 'rejected'].map(status => (
                  <button
                    key={status}
                    className="status-btn"
                    style={{ backgroundColor: getStatusColor(status) }}
                    onClick={() => handleUpdateStatus(selectedApplication._id, status)}
                    disabled={selectedApplication.status === status}
                  >
                    {getStatusText(status)}
                  </button>
                ))}
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

  const renderJobModal = () => (
    <div className="modal-overlay" onClick={() => setShowJobModal(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>إنشاء وظيفة جديدة</h2>
        <form onSubmit={handleCreateJob}>
          <div className="form-group">
            <label>العنوان (English)</label>
            <input
              type="text"
              value={jobFormData.title}
              onChange={e => setJobFormData({ ...jobFormData, title: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>العنوان (عربي)</label>
            <input
              type="text"
              value={jobFormData.titleAr}
              onChange={e => setJobFormData({ ...jobFormData, titleAr: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>الوصف</label>
            <textarea
              value={jobFormData.description}
              onChange={e => setJobFormData({ ...jobFormData, description: e.target.value })}
              rows="4"
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>الرياضة</label>
              <select
                value={jobFormData.sport}
                onChange={e => setJobFormData({ ...jobFormData, sport: e.target.value })}
              >
                <option value="football">كرة القدم</option>
                <option value="basketball">كرة السلة</option>
                <option value="volleyball">الكرة الطائرة</option>
                <option value="tennis">التنس</option>
                <option value="swimming">السباحة</option>
              </select>
            </div>
            <div className="form-group">
              <label>الفئة</label>
              <select
                value={jobFormData.category}
                onChange={e => setJobFormData({ ...jobFormData, category: e.target.value })}
              >
                <option value="coaching">تدريب</option>
                <option value="management">إدارة</option>
                <option value="medical">طبي</option>
                <option value="technical">فني</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>نوع العمل</label>
              <select
                value={jobFormData.jobType}
                onChange={e => setJobFormData({ ...jobFormData, jobType: e.target.value })}
              >
                <option value="full-time">دوام كامل</option>
                <option value="part-time">دوام جزئي</option>
                <option value="contract">عقد</option>
                <option value="temporary">مؤقت</option>
              </select>
            </div>
            <div className="form-group">
              <label>الحالة</label>
              <select
                value={jobFormData.status}
                onChange={e => setJobFormData({ ...jobFormData, status: e.target.value })}
              >
                <option value="draft">مسودة</option>
                <option value="active">نشط</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'جاري الإنشاء...' : 'إنشاء الوظيفة'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowJobModal(false)}>
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="admin-dashboard publisher-dashboard">
      <div className="dashboard-header">
        <h1>لوحة تحكم ناشر الوظائف</h1>
        <p>مرحباً، {user?.firstName || 'ناشر الوظائف'}</p>
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
          className={`tab ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => setActiveTab('jobs')}
        >
          الوظائف
        </button>
        <button 
          className={`tab ${activeTab === 'applications' ? 'active' : ''}`}
          onClick={() => setActiveTab('applications')}
        >
          الطلبات
        </button>
      </div>

      <div className="dashboard-content">
        {loading && <div className="loading-spinner">جاري التحميل...</div>}
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'jobs' && renderJobs()}
        {activeTab === 'applications' && renderApplications()}
      </div>

      {showApplicationModal && renderApplicationModal()}
      {showJobModal && renderJobModal()}
    </div>
  );
};

export default JobPublisherDashboard;
