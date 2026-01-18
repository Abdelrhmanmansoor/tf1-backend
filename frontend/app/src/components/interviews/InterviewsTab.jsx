import { useState, useEffect } from 'react';
import api from '../../config/api';
import NotifyApplicantModal from './NotifyApplicantModal';

const InterviewsTab = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('upcoming'); // upcoming, completed, cancelled
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [showNotifyModal, setShowNotifyModal] = useState(false);

  useEffect(() => {
    fetchInterviews();
  }, [filter]);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {};
      if (filter === 'upcoming') {
        params.status = 'scheduled';
      } else if (filter === 'completed') {
        params.status = 'completed';
      } else if (filter === 'cancelled') {
        params.status = 'cancelled';
      }

      const res = await api.get('/publisher/interviews', { params });
      setInterviews(res.data.data?.interviews || []);
    } catch (err) {
      console.error('Error fetching interviews:', err);
      setError('خطأ في جلب المقابلات');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'scheduled': { text: 'مجدولة', color: '#00BCD4', icon: '📅' },
      'rescheduled': { text: 'معاد جدولتها', color: '#FF9800', icon: '🔄' },
      'completed': { text: 'مكتملة', color: '#4CAF50', icon: '✅' },
      'cancelled': { text: 'ملغاة', color: '#F44336', icon: '❌' },
      'no-show': { text: 'لم يحضر', color: '#9E9E9E', icon: '👤' }
    };
    const info = statusMap[status] || { text: status, color: '#666', icon: '📋' };
    return (
      <span
        className="status-badge"
        style={{
          backgroundColor: info.color,
          color: 'white',
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '0.85rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        {info.icon} {info.text}
      </span>
    );
  };

  const getInterviewTypeBadge = (type) => {
    const types = {
      'online': { text: 'أونلاين', color: '#2196F3', icon: '💻' },
      'onsite': { text: 'حضوري', color: '#9C27B0', icon: '🏢' }
    };
    const info = types[type] || { text: type, color: '#666', icon: '📍' };
    return (
      <span style={{
        backgroundColor: `${info.color}20`,
        color: info.color,
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '0.8rem'
      }}>
        {info.icon} {info.text}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleNotifyClick = (interview) => {
    setSelectedInterview(interview);
    setShowNotifyModal(true);
  };

  const handleNotificationSent = (result) => {
    if (result.success) {
      setSuccess('تم إرسال الإشعار بنجاح');
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError('فشل في إرسال الإشعار');
      setTimeout(() => setError(''), 3000);
    }
    setShowNotifyModal(false);
    setSelectedInterview(null);
  };

  return (
    <div className="interviews-tab">
      {/* Header */}
      <div className="users-header" style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          📅 المقابلات
        </h3>
        <span className="count-badge">{interviews.length} مقابلة</span>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setFilter('upcoming')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            backgroundColor: filter === 'upcoming' ? '#00BCD4' : 'rgba(255,255,255,0.1)',
            color: filter === 'upcoming' ? 'white' : '#e8eefc',
            fontWeight: filter === 'upcoming' ? '600' : '400',
            transition: 'all 0.3s ease'
          }}
        >
          قادمة
        </button>
        <button
          onClick={() => setFilter('completed')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            backgroundColor: filter === 'completed' ? '#4CAF50' : 'rgba(255,255,255,0.1)',
            color: filter === 'completed' ? 'white' : '#e8eefc',
            fontWeight: filter === 'completed' ? '600' : '400',
            transition: 'all 0.3s ease'
          }}
        >
          مكتملة
        </button>
        <button
          onClick={() => setFilter('cancelled')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            backgroundColor: filter === 'cancelled' ? '#F44336' : 'rgba(255,255,255,0.1)',
            color: filter === 'cancelled' ? 'white' : '#e8eefc',
            fontWeight: filter === 'cancelled' ? '600' : '400',
            transition: 'all 0.3s ease'
          }}
        >
          ملغاة
        </button>
      </div>

      {/* Messages */}
      {error && <div className="error-message" style={{ marginBottom: '15px' }}>❌ {error}</div>}
      {success && <div className="success-message" style={{ marginBottom: '15px' }}>{success}</div>}

      {/* Content */}
      {loading ? (
        <div className="loading" style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255,255,255,0.1)',
            borderTop: '3px solid #00BCD4',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 15px'
          }}></div>
          جاري التحميل...
        </div>
      ) : interviews.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>📅</div>
          <p style={{ color: '#a0aec0', fontSize: '1.1rem', margin: 0 }}>
            لا توجد مقابلات {filter === 'upcoming' ? 'قادمة' : filter === 'completed' ? 'مكتملة' : 'ملغاة'}
          </p>
          <p style={{ color: '#718096', fontSize: '0.9rem', marginTop: '10px' }}>
            جدول مقابلة من صفحة الطلبات
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '20px'
        }}>
          {interviews.map((interview) => (
            <div
              key={interview._id}
              style={{
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid rgba(255,255,255,0.08)',
                transition: 'all 0.3s ease'
              }}
            >
              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '15px'
              }}>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#e8eefc' }}>
                    {interview.applicantData?.name ||
                     (interview.applicantId?.firstName ?
                       `${interview.applicantId.firstName} ${interview.applicantId.lastName}` :
                       'متقدم')}
                  </h4>
                  <p style={{ margin: 0, color: '#a0aec0', fontSize: '0.9rem' }}>
                    {interview.jobData?.titleAr || interview.jobData?.title ||
                     interview.jobId?.titleAr || interview.jobId?.title || 'وظيفة'}
                  </p>
                </div>
                {getStatusBadge(interview.status)}
              </div>

              {/* Details */}
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                padding: '15px',
                borderRadius: '10px',
                marginBottom: '15px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span>🕐</span>
                  <span style={{ color: '#e8eefc' }}>{formatDate(interview.scheduledAt)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span>⏱️</span>
                  <span style={{ color: '#a0aec0' }}>{interview.duration || 60} دقيقة</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {getInterviewTypeBadge(interview.type)}
                  {interview.type === 'online' && interview.meetingUrl && (
                    <a
                      href={interview.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#00BCD4', fontSize: '0.85rem' }}
                    >
                      رابط الاجتماع
                    </a>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div style={{
                fontSize: '0.85rem',
                color: '#718096',
                marginBottom: '15px',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px'
              }}>
                {(interview.applicantData?.email || interview.applicantId?.email) && (
                  <div>📧 {interview.applicantData?.email || interview.applicantId?.email}</div>
                )}
                {(interview.applicantData?.phone || interview.applicantId?.phone) && (
                  <div>📱 {interview.applicantData?.phone || interview.applicantId?.phone}</div>
                )}
              </div>

              {/* Actions */}
              <div style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                paddingTop: '15px'
              }}>
                <button
                  onClick={() => handleNotifyClick(interview)}
                  style={{
                    flex: 1,
                    padding: '10px 15px',
                    backgroundColor: '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  📨 إشعار المتقدم
                </button>
                {interview.status === 'scheduled' && (
                  <button
                    style={{
                      padding: '10px 15px',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      color: '#e8eefc',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    ✏️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notify Modal */}
      {showNotifyModal && selectedInterview && (
        <NotifyApplicantModal
          interview={selectedInterview}
          onClose={() => {
            setShowNotifyModal(false);
            setSelectedInterview(null);
          }}
          onSent={handleNotificationSent}
        />
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default InterviewsTab;
