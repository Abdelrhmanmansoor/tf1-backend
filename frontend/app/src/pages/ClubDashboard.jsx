import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../config/api';
import '../styles/AdminDashboard.css';

const ClubDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('jobs');
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showApplicantModal, setShowApplicantModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'club') {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (activeTab === 'jobs') {
      fetchClubJobs();
    } else if (activeTab === 'notifications') {
      fetchNotifications();
    }
  }, [activeTab]);

  const fetchClubJobs = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/clubs/jobs');
      setJobs(res.data.jobs || []);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError('خطأ في جلب الوظائف');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobApplications = async (jobId) => {
    try {
      setLoading(true);
      const res = await api.get(`/jobs/${jobId}/applications`);
      setApplications(res.data.applications || []);
      setSelectedJob(jobId);
      setError('');
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError('خطأ في جلب الطلبات');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/notifications');
      setNotifications(res.data.data || res.data.notifications || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('خطأ في جلب الإشعارات');
    } finally {
      setLoading(false);
    }
  };

  const viewApplicantDetails = (application) => {
    setSelectedApplication(application);
    setShowApplicantModal(true);
  };

  const updateApplicationStatus = async (applicationId, newStatus) => {
    try {
      await api.put(`/jobs/applications/${applicationId}/status`, { status: newStatus });
      setSuccess('تم تحديث حالة الطلب بنجاح');
      setTimeout(() => setSuccess(''), 3000);
      if (selectedJob) {
        fetchJobApplications(selectedJob);
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setError('خطأ في تحديث الحالة');
    }
  };

  const downloadResume = async (applicationId, attachmentIndex, attachmentName) => {
    try {
      const response = await api.get(`/jobs/applications/${applicationId}/download/${attachmentIndex}`, {
        responseType: 'blob'
      });
      const contentDisposition = response.headers['content-disposition'];
      let filename = attachmentName || 'resume.pdf';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading resume:', err);
      setError('خطأ في تحميل السيرة الذاتية');
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'new': { text: 'جديد', color: '#2196F3' },
      'under_review': { text: 'قيد المراجعة', color: '#FF9800' },
      'shortlisted': { text: 'في القائمة المختصرة', color: '#9C27B0' },
      'interview': { text: 'مقابلة', color: '#00BCD4' },
      'offered': { text: 'عرض وظيفي', color: '#4CAF50' },
      'rejected': { text: 'مرفوض', color: '#F44336' },
      'withdrawn': { text: 'منسحب', color: '#9E9E9E' }
    };
    const info = statusMap[status] || { text: status, color: '#666' };
    return <span className="status-badge" style={{ backgroundColor: info.color }}>{info.text}</span>;
  };

  if (!user || user.role !== 'club') {
    return (
      <div className="admin-dashboard-container">
        <div className="error-message">
          ❌ ليس لديك صلاحية للوصول إلى هذه الصفحة
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      <div className="admin-header">
        <div className="admin-header-content">
          <h1>🏢 لوحة تحكم النادي</h1>
          <p>إدارة الوظائف والمتقدمين</p>
        </div>
        <div className="admin-user-info">
          <span className="role-badge" style={{ backgroundColor: '#4CAF50' }}>نادي</span>
          <span className="user-name">{user?.firstName} {user?.lastName}</span>
        </div>
      </div>

      {error && <div className="error-message">❌ {error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="admin-tabs">
        <button
          className={`tab-button ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => { setActiveTab('jobs'); setSelectedJob(null); setApplications([]); }}
        >
          💼 الوظائف
        </button>
        <button
          className={`tab-button ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          🔔 الإشعارات
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'jobs' && (
          <div className="jobs-management">
            {!selectedJob ? (
              <>
                <h3>💼 وظائف النادي</h3>
                {loading ? (
                  <div className="loading">جاري التحميل...</div>
                ) : jobs.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '20px' }}>لا توجد وظائف منشورة</p>
                ) : (
                  <div className="jobs-grid">
                    {jobs.map((job) => (
                      <div key={job._id} className="job-management-card">
                        <h4>{job.title}</h4>
                        <p>📍 {job.location || 'غير محدد'}</p>
                        <p>⚽ {job.sport || 'عامة'}</p>
                        <button 
                          className="btn-primary"
                          onClick={() => fetchJobApplications(job._id)}
                        >
                          👥 عرض المتقدمين
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3>👥 المتقدمون للوظيفة</h3>
                  <button 
                    className="btn-secondary"
                    onClick={() => { setSelectedJob(null); setApplications([]); }}
                  >
                    ← العودة للوظائف
                  </button>
                </div>
                
                {loading ? (
                  <div className="loading">جاري التحميل...</div>
                ) : applications.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '20px' }}>لا يوجد متقدمون حتى الآن</p>
                ) : (
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>الاسم</th>
                        <th>البريد الإلكتروني</th>
                        <th>الهاتف</th>
                        <th>تاريخ التقديم</th>
                        <th>الحالة</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.map((app) => (
                        <tr key={app._id}>
                          <td>
                            <strong>
                              {app.applicant?.fullName || 
                               `${app.applicant?.firstName || ''} ${app.applicant?.lastName || ''}`.trim() || 
                               'غير محدد'}
                            </strong>
                          </td>
                          <td>{app.applicant?.email || 'غير متوفر'}</td>
                          <td>{app.applicant?.phone || 'غير متوفر'}</td>
                          <td>{new Date(app.applicationDetails?.appliedAt).toLocaleDateString('ar-SA')}</td>
                          <td>{getStatusBadge(app.applicationDetails?.status)}</td>
                          <td>
                            <button 
                              className="btn-small"
                              style={{ backgroundColor: '#2196F3', color: 'white', marginLeft: '5px' }}
                              onClick={() => viewApplicantDetails(app)}
                            >
                              👁️ التفاصيل
                            </button>
                            {app.applicationDetails?.attachments?.length > 0 && (
                              <button 
                                className="btn-small"
                                style={{ backgroundColor: '#4CAF50', color: 'white' }}
                                onClick={() => downloadResume(app._id, 0, app.applicationDetails?.attachments[0]?.name)}
                              >
                                📄 السيرة
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="notifications-tab">
            <h3>🔔 الإشعارات</h3>
            {loading ? (
              <div className="loading">جاري التحميل...</div>
            ) : notifications.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '20px' }}>لا توجد إشعارات</p>
            ) : (
              <div className="notifications-list">
                {notifications.map((notif) => (
                  <div key={notif._id} className="notification-item" style={{
                    padding: '15px',
                    borderBottom: '1px solid #eee',
                    backgroundColor: notif.isRead ? 'white' : '#f0f7ff'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{notif.titleAr || notif.title}</strong>
                      <span style={{ color: '#666', fontSize: '0.85rem' }}>
                        {new Date(notif.createdAt).toLocaleString('ar-SA')}
                      </span>
                    </div>
                    <p style={{ margin: '5px 0', color: '#555' }}>{notif.messageAr || notif.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showApplicantModal && selectedApplication && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'white',
            borderRadius: '15px',
            padding: '30px',
            maxWidth: '700px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>👤 بيانات المتقدم</h2>
              <button 
                onClick={() => setShowApplicantModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div className="applicant-details" style={{ display: 'grid', gap: '15px' }}>
              <div className="detail-section" style={{ background: '#f5f5f5', padding: '15px', borderRadius: '10px' }}>
                <h4 style={{ color: '#333', marginBottom: '10px' }}>📋 المعلومات الأساسية</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <p><strong>الاسم:</strong> {selectedApplication.applicant?.fullName || `${selectedApplication.applicant?.firstName || ''} ${selectedApplication.applicant?.lastName || ''}`}</p>
                  <p><strong>البريد:</strong> {selectedApplication.applicant?.email || 'غير متوفر'}</p>
                  <p><strong>الهاتف:</strong> {selectedApplication.applicant?.phone || 'غير متوفر'}</p>
                  <p><strong>الدور:</strong> {selectedApplication.applicant?.role || 'غير محدد'}</p>
                </div>
              </div>

              <div className="detail-section" style={{ background: '#e3f2fd', padding: '15px', borderRadius: '10px' }}>
                <h4 style={{ color: '#333', marginBottom: '10px' }}>⚽ الخبرة الرياضية</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <p><strong>الرياضة:</strong> {selectedApplication.applicant?.sport || 'غير محدد'}</p>
                  <p><strong>المركز:</strong> {selectedApplication.applicant?.position || 'غير محدد'}</p>
                  <p><strong>سنوات الخبرة:</strong> {selectedApplication.applicant?.experienceYears || 'غير محدد'}</p>
                  <p><strong>التقييم:</strong> {selectedApplication.applicant?.rating || 'غير متوفر'}</p>
                </div>
              </div>

              <div className="detail-section" style={{ background: '#fff3e0', padding: '15px', borderRadius: '10px' }}>
                <h4 style={{ color: '#333', marginBottom: '10px' }}>📝 تفاصيل الطلب</h4>
                <p><strong>تاريخ التقديم:</strong> {new Date(selectedApplication.applicationDetails?.appliedAt).toLocaleString('ar-SA')}</p>
                <p><strong>الحالة:</strong> {getStatusBadge(selectedApplication.applicationDetails?.status)}</p>
                {selectedApplication.applicationDetails?.coverLetter && (
                  <div style={{ marginTop: '10px' }}>
                    <strong>رسالة التغطية:</strong>
                    <p style={{ background: 'white', padding: '10px', borderRadius: '5px', marginTop: '5px' }}>
                      {selectedApplication.applicationDetails.coverLetter}
                    </p>
                  </div>
                )}
              </div>

              {selectedApplication.applicant?.bio && (
                <div className="detail-section" style={{ background: '#e8f5e9', padding: '15px', borderRadius: '10px' }}>
                  <h4 style={{ color: '#333', marginBottom: '10px' }}>📄 نبذة عن المتقدم</h4>
                  <p>{selectedApplication.applicant.bio}</p>
                </div>
              )}

              {selectedApplication.applicationDetails?.attachments?.length > 0 && (
                <div className="detail-section" style={{ background: '#fce4ec', padding: '15px', borderRadius: '10px' }}>
                  <h4 style={{ color: '#333', marginBottom: '10px' }}>📎 المرفقات</h4>
                  {selectedApplication.applicationDetails.attachments.map((att, idx) => (
                    <button 
                      key={idx}
                      onClick={() => downloadResume(selectedApplication._id, idx, att.name)}
                      style={{
                        background: '#e91e63',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        marginLeft: '10px'
                      }}
                    >
                      📥 تحميل {att.name || 'السيرة الذاتية'}
                    </button>
                  ))}
                </div>
              )}

              <div className="actions-section" style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => updateApplicationStatus(selectedApplication._id, 'under_review')}
                  style={{ background: '#FF9800', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}
                >
                  📋 قيد المراجعة
                </button>
                <button 
                  onClick={() => updateApplicationStatus(selectedApplication._id, 'shortlisted')}
                  style={{ background: '#9C27B0', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}
                >
                  ⭐ قائمة مختصرة
                </button>
                <button 
                  onClick={() => updateApplicationStatus(selectedApplication._id, 'interview')}
                  style={{ background: '#00BCD4', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}
                >
                  🎤 مقابلة
                </button>
                <button 
                  onClick={() => updateApplicationStatus(selectedApplication._id, 'offered')}
                  style={{ background: '#4CAF50', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}
                >
                  ✅ عرض وظيفي
                </button>
                <button 
                  onClick={() => updateApplicationStatus(selectedApplication._id, 'rejected')}
                  style={{ background: '#F44336', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}
                >
                  ❌ رفض
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubDashboard;
