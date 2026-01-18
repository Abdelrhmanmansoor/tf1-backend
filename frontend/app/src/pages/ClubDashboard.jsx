import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../config/api';
import '../styles/AdminDashboard.css';
import InterviewsTab from '../components/interviews/InterviewsTab';
import SiteTour from '../components/tour/SiteTour';

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
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [interviewData, setInterviewData] = useState({ date: '', location: '', notes: '' });
  const [notifications, setNotifications] = useState([]);
  const [teams, setTeams] = useState([]);
  const [ageGroups, setAgeGroups] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showAssignSupervisorModal, setShowAssignSupervisorModal] = useState(false);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState('');
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

  const updateApplicationStatus = async (applicationId, newStatus, additionalData = {}) => {
    try {
      setLoading(true);
      const payload = { status: newStatus, ...additionalData };
      
      await api.put(`/jobs/applications/${applicationId}/status`, payload);
      
      setSuccess(`✅ تم تحديث حالة الطلب إلى: ${getStatusText(newStatus)}`);
      setTimeout(() => setSuccess(''), 3000);
      
      // Refresh applications list
      if (selectedJob) {
        fetchJobApplications(selectedJob);
      }
      
      // Close modals
      setShowApplicantModal(false);
      setShowInterviewModal(false);
    } catch (err) {
      console.error('Error updating status:', err);
      setError('❌ خطأ في تحديث الحالة: ' + (err.response?.data?.messageAr || err.message));
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      'new': 'جديد',
      'under_review': 'قيد المراجعة',
      'shortlisted': 'القائمة المختصرة',
      'interview': 'مقابلة',
      'offered': 'عرض وظيفي',
      'hired': 'تم التوظيف',
      'rejected': 'مرفوض'
    };
    return statusMap[status] || status;
  };

  const sendMessageToApplicant = async () => {
    if (!messageText.trim()) {
      setError('يرجى كتابة رسالة');
      return;
    }
    
    try {
      setLoading(true);
      await api.post(`/jobs/applications/${selectedApplication._id}/message`, {
        message: messageText,
        messageAr: messageText
      });
      
      setSuccess('✅ تم إرسال الرسالة بنجاح');
      setMessageText('');
      setShowMessageModal(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('❌ خطأ في إرسال الرسالة: ' + (err.response?.data?.messageAr || err.message));
    } finally {
      setLoading(false);
    }
  };

  const scheduleInterview = async () => {
    if (!interviewData.date) {
      setError('يرجى تحديد موعد المقابلة');
      return;
    }
    
    await updateApplicationStatus(selectedApplication._id, 'interview', {
      interviewDate: interviewData.date,
      interviewLocation: interviewData.location,
      notes: interviewData.notes
    });
    
    setInterviewData({ date: '', location: '', notes: '' });
    setShowInterviewModal(false);
  };

  const fetchTeams = async () => {
    try {
      const res = await api.get('/clubs/teams');
      setTeams(res.data.data || res.data.teams || []);
    } catch (err) {
      console.error('Error fetching teams:', err);
    }
  };

  const fetchAgeGroups = async () => {
    try {
      const res = await api.get('/age-group-supervisor/groups');
      setAgeGroups(res.data.data?.groups || []);
    } catch (err) {
      console.error('Error fetching age groups:', err);
    }
  };

  const fetchSupervisors = async () => {
    try {
      const res = await api.get('/admin/users?role=age-group-supervisor&limit=50');
      setSupervisors(res.data.data || []);
    } catch (err) {
      console.error('Error fetching supervisors:', err);
      // Try fetching coaches as fallback
      try {
        const coachRes = await api.get('/admin/users?role=coach&limit=50');
        setSupervisors(coachRes.data.data || []);
      } catch (e) {
        console.error('Error fetching coaches:', e);
      }
    }
  };

  const assignSupervisorToGroup = async () => {
    if (!selectedSupervisorId || !selectedGroup) {
      setError('يرجى اختيار مشرف');
      return;
    }
    
    try {
      setLoading(true);
      await api.post(`/age-group-supervisor/groups/${selectedGroup.id}/assign-supervisor`, {
        supervisorId: selectedSupervisorId
      });
      
      setSuccess('✅ تم تعيين المشرف بنجاح');
      setShowAssignSupervisorModal(false);
      setSelectedSupervisorId('');
      setSelectedGroup(null);
      fetchAgeGroups();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error assigning supervisor:', err);
      setError('❌ خطأ في تعيين المشرف: ' + (err.response?.data?.error?.messageAr || err.message));
    } finally {
      setLoading(false);
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
          data-tour="jobs"
          className={`tab-button ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => { setActiveTab('jobs'); setSelectedJob(null); setApplications([]); }}
        >
          💼 الوظائف
        </button>
        <button
          data-tour="interviews"
          className={`tab-button ${activeTab === 'interviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('interviews')}
        >
          📅 المقابلات
        </button>
        <button
          data-tour="teams"
          className={`tab-button ${activeTab === 'teams' ? 'active' : ''}`}
          onClick={() => { setActiveTab('teams'); fetchTeams(); }}
        >
          ⚽ الفرق
        </button>
        <button
          data-tour="ageGroups"
          className={`tab-button ${activeTab === 'ageGroups' ? 'active' : ''}`}
          onClick={() => { setActiveTab('ageGroups'); fetchAgeGroups(); }}
        >
          👶 الفئات العمرية
        </button>
        <button
          data-tour="notifications"
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

        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <div className="teams-tab">
            <div className="users-header">
              <h3>⚽ فرق النادي</h3>
              <span className="count-badge">{teams.length} فريق</span>
            </div>
            {loading ? (
              <div className="loading">جاري التحميل...</div>
            ) : teams.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>لا توجد فرق مسجلة</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {teams.map((team) => (
                  <div key={team._id} style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <h4 style={{ color: '#333', marginBottom: '10px' }}>⚽ {team.name}</h4>
                    <p style={{ color: '#666' }}>👥 اللاعبين: {team.players?.length || 0}</p>
                    <p style={{ color: '#666' }}>👨‍🏫 المدربين: {team.coaches?.length || 0}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Age Groups Tab */}
        {activeTab === 'ageGroups' && (
          <div className="age-groups-tab">
            <div className="users-header">
              <h3>👶 الفئات العمرية</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span className="count-badge">{ageGroups.length} فئة</span>
                <button 
                  onClick={() => { fetchSupervisors(); }}
                  style={{ padding: '8px 15px', background: '#9C27B0', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                >
                  👤 تحميل المشرفين
                </button>
              </div>
            </div>
            {loading ? (
              <div className="loading">جاري التحميل...</div>
            ) : ageGroups.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>لا توجد فئات عمرية</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {ageGroups.map((group) => (
                  <div key={group.id} style={{ 
                    background: group.status === 'active' ? '#e8f5e9' : '#ffebee', 
                    borderRadius: '12px', 
                    padding: '20px', 
                    border: `2px solid ${group.status === 'active' ? '#4CAF50' : '#f44336'}`
                  }}>
                    <h4 style={{ color: '#333', marginBottom: '5px' }}>{group.name}</h4>
                    <p style={{ color: '#666', marginBottom: '10px' }}>{group.nameAr}</p>
                    <div style={{ display: 'grid', gap: '5px', fontSize: '0.9rem' }}>
                      <p>📅 العمر: {group.ageRange?.min} - {group.ageRange?.max} سنة</p>
                      <p>👥 اللاعبين: {group.playersCount || 0}</p>
                      <p>👨‍🏫 المدرب: {group.coachName || 'لم يتم تعيينه'}</p>
                      <p>👤 المشرف: {group.supervisorName || 'لم يتم تعيينه'}</p>
                    </div>
                    <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                      <button 
                        onClick={() => { 
                          setSelectedGroup(group); 
                          setShowAssignSupervisorModal(true); 
                          if (supervisors.length === 0) fetchSupervisors();
                        }}
                        style={{ 
                          padding: '8px 15px', 
                          background: '#673AB7', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '5px', 
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        👤 تعيين مشرف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Interviews Tab */}
        {activeTab === 'interviews' && (
          <InterviewsTab />
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

              <div className="actions-section" style={{ marginTop: '20px' }}>
                <h4 style={{ marginBottom: '15px', color: '#333' }}>📌 تحديث حالة الطلب</h4>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
                  <button 
                    onClick={() => updateApplicationStatus(selectedApplication._id, 'under_review')}
                    style={{ background: '#FF9800', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}
                    disabled={loading}
                  >
                    📋 قيد المراجعة
                  </button>
                  <button 
                    onClick={() => updateApplicationStatus(selectedApplication._id, 'shortlisted')}
                    style={{ background: '#9C27B0', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}
                    disabled={loading}
                  >
                    ⭐ قائمة مختصرة
                  </button>
                  <button 
                    onClick={() => { setShowApplicantModal(false); setShowInterviewModal(true); }}
                    style={{ background: '#00BCD4', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}
                  >
                    🎤 جدولة مقابلة
                  </button>
                  <button 
                    onClick={() => updateApplicationStatus(selectedApplication._id, 'offered')}
                    style={{ background: '#4CAF50', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}
                    disabled={loading}
                  >
                    ✅ عرض وظيفي
                  </button>
                  <button 
                    onClick={() => updateApplicationStatus(selectedApplication._id, 'hired')}
                    style={{ background: '#2196F3', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}
                    disabled={loading}
                  >
                    🎉 توظيف
                  </button>
                  <button 
                    onClick={() => updateApplicationStatus(selectedApplication._id, 'rejected')}
                    style={{ background: '#F44336', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}
                    disabled={loading}
                  >
                    ❌ رفض
                  </button>
                </div>
                
                <h4 style={{ marginBottom: '10px', color: '#333' }}>💬 التواصل مع المتقدم</h4>
                <button 
                  onClick={() => { setShowApplicantModal(false); setShowMessageModal(true); }}
                  style={{ background: '#673AB7', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '5px', cursor: 'pointer' }}
                >
                  ✉️ إرسال رسالة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && selectedApplication && (
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
            maxWidth: '500px',
            width: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>✉️ إرسال رسالة</h2>
              <button 
                onClick={() => { setShowMessageModal(false); setMessageText(''); }}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            
            <p style={{ marginBottom: '15px', color: '#666' }}>
              إرسال رسالة إلى: <strong>{selectedApplication.applicant?.fullName || selectedApplication.applicant?.firstName}</strong>
            </p>
            
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="اكتب رسالتك هنا..."
              style={{
                width: '100%',
                minHeight: '150px',
                padding: '15px',
                borderRadius: '10px',
                border: '1px solid #ddd',
                fontSize: '1rem',
                resize: 'vertical'
              }}
            />
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => { setShowMessageModal(false); setMessageText(''); }}
                style={{ background: '#9E9E9E', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '5px', cursor: 'pointer' }}
              >
                إلغاء
              </button>
              <button 
                onClick={sendMessageToApplicant}
                disabled={loading || !messageText.trim()}
                style={{ 
                  background: loading ? '#ccc' : '#673AB7', 
                  color: 'white', 
                  border: 'none', 
                  padding: '12px 25px', 
                  borderRadius: '5px', 
                  cursor: loading ? 'not-allowed' : 'pointer' 
                }}
              >
                {loading ? 'جاري الإرسال...' : '📤 إرسال'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interview Modal */}
      {showInterviewModal && selectedApplication && (
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
            maxWidth: '500px',
            width: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>🎤 جدولة مقابلة</h2>
              <button 
                onClick={() => { setShowInterviewModal(false); setInterviewData({ date: '', location: '', notes: '' }); }}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            
            <p style={{ marginBottom: '15px', color: '#666' }}>
              مقابلة مع: <strong>{selectedApplication.applicant?.fullName || selectedApplication.applicant?.firstName}</strong>
            </p>
            
            <div style={{ display: 'grid', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>📅 موعد المقابلة *</label>
                <input
                  type="datetime-local"
                  value={interviewData.date}
                  onChange={(e) => setInterviewData({ ...interviewData, date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '1rem'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>📍 مكان المقابلة</label>
                <input
                  type="text"
                  value={interviewData.location}
                  onChange={(e) => setInterviewData({ ...interviewData, location: e.target.value })}
                  placeholder="مثال: مقر النادي - قاعة الاجتماعات"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '1rem'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>📝 ملاحظات</label>
                <textarea
                  value={interviewData.notes}
                  onChange={(e) => setInterviewData({ ...interviewData, notes: e.target.value })}
                  placeholder="أي ملاحظات إضافية..."
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '1rem',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => { setShowInterviewModal(false); setInterviewData({ date: '', location: '', notes: '' }); }}
                style={{ background: '#9E9E9E', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '5px', cursor: 'pointer' }}
              >
                إلغاء
              </button>
              <button 
                onClick={scheduleInterview}
                disabled={loading || !interviewData.date}
                style={{ 
                  background: loading ? '#ccc' : '#00BCD4', 
                  color: 'white', 
                  border: 'none', 
                  padding: '12px 25px', 
                  borderRadius: '5px', 
                  cursor: loading ? 'not-allowed' : 'pointer' 
                }}
              >
                {loading ? 'جاري الحفظ...' : '✅ تأكيد المقابلة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Site Tour */}
      <SiteTour
        tourKey="club-dashboard"
        steps={[
          {
            selector: '[data-tour="jobs"]',
            title: 'الوظائف',
            content: 'هنا يمكنك إدارة جميع الوظائف المنشورة وعرض المتقدمين لكل وظيفة وتحديث حالات الطلبات.'
          },
          {
            selector: '[data-tour="interviews"]',
            title: 'المقابلات',
            content: 'عرض جميع المقابلات المجدولة وإرسال إشعارات للمتقدمين عبر البريد الإلكتروني أو الرسائل النصية أو الواتساب.'
          },
          {
            selector: '[data-tour="teams"]',
            title: 'الفرق',
            content: 'إدارة فرق النادي وتعيين اللاعبين والمدربين لكل فريق.'
          },
          {
            selector: '[data-tour="ageGroups"]',
            title: 'الفئات العمرية',
            content: 'تنظيم اللاعبين حسب الفئات العمرية وتعيين المشرفين لكل فئة.'
          },
          {
            selector: '[data-tour="notifications"]',
            title: 'الإشعارات',
            content: 'متابعة جميع الإشعارات الواردة والتنبيهات المهمة.'
          }
        ]}
        onComplete={() => console.log('Tour completed!')}
        onSkip={() => console.log('Tour skipped')}
      />

      {/* Assign Supervisor Modal */}
      {showAssignSupervisorModal && selectedGroup && (
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
            maxWidth: '500px',
            width: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>👤 تعيين مشرف للفئة</h2>
              <button 
                onClick={() => { setShowAssignSupervisorModal(false); setSelectedSupervisorId(''); }}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
              <p><strong>الفئة:</strong> {selectedGroup.name} ({selectedGroup.nameAr})</p>
              <p><strong>العمر:</strong> {selectedGroup.ageRange?.min} - {selectedGroup.ageRange?.max} سنة</p>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>اختر المشرف:</label>
              {supervisors.length === 0 ? (
                <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
                  جاري تحميل المشرفين... أو لا يوجد مشرفين متاحين
                </p>
              ) : (
                <select
                  value={selectedSupervisorId}
                  onChange={(e) => setSelectedSupervisorId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '1rem'
                  }}
                >
                  <option value="">-- اختر مشرف --</option>
                  {supervisors.map((sup) => (
                    <option key={sup._id} value={sup._id}>
                      {sup.firstName} {sup.lastName} ({sup.email})
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => { setShowAssignSupervisorModal(false); setSelectedSupervisorId(''); }}
                style={{ background: '#9E9E9E', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '5px', cursor: 'pointer' }}
              >
                إلغاء
              </button>
              <button 
                onClick={assignSupervisorToGroup}
                disabled={loading || !selectedSupervisorId}
                style={{ 
                  background: loading || !selectedSupervisorId ? '#ccc' : '#673AB7', 
                  color: 'white', 
                  border: 'none', 
                  padding: '12px 25px', 
                  borderRadius: '5px', 
                  cursor: loading || !selectedSupervisorId ? 'not-allowed' : 'pointer' 
                }}
              >
                {loading ? 'جاري التعيين...' : '✅ تعيين المشرف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubDashboard;
