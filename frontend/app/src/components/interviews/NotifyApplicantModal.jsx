import { useState } from 'react';
import api from '../../config/api';

const NotifyApplicantModal = ({ interview, onClose, onSent }) => {
  const [notificationType, setNotificationType] = useState('');
  const [selectedChannels, setSelectedChannels] = useState(['email']);
  const [customMessage, setCustomMessage] = useState('');
  const [customMessageAr, setCustomMessageAr] = useState('');
  const [loading, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const notificationTypes = [
    { value: 'acceptance', label: 'قبول', icon: '✅', color: '#4CAF50', description: 'إخطار المتقدم بقبوله للوظيفة' },
    { value: 'rejection', label: 'رفض', icon: '❌', color: '#F44336', description: 'إخطار المتقدم برفض طلبه' },
    { value: 'shortlist', label: 'قائمة مختصرة', icon: '⭐', color: '#FF9800', description: 'إخطار المتقدم بإضافته للقائمة المختصرة' },
    { value: 'interview_reminder', label: 'تذكير بالمقابلة', icon: '⏰', color: '#00BCD4', description: 'تذكير المتقدم بموعد المقابلة' },
    { value: 'custom', label: 'رسالة مخصصة', icon: '✉️', color: '#9C27B0', description: 'إرسال رسالة مخصصة للمتقدم' }
  ];

  const channels = [
    { value: 'email', label: 'البريد الإلكتروني', icon: '📧', available: !!getApplicantEmail() },
    { value: 'sms', label: 'رسالة نصية (SMS)', icon: '📱', available: !!getApplicantPhone() },
    { value: 'whatsapp', label: 'واتساب', icon: '💬', available: !!getApplicantPhone() }
  ];

  function getApplicantEmail() {
    return interview.applicantData?.email || interview.applicantId?.email;
  }

  function getApplicantPhone() {
    return interview.applicantData?.phone || interview.applicantId?.phone;
  }

  function getApplicantName() {
    return interview.applicantData?.name ||
           (interview.applicantId?.firstName ?
             `${interview.applicantId.firstName} ${interview.applicantId.lastName}` :
             'المتقدم');
  }

  function getJobTitle() {
    return interview.jobData?.titleAr || interview.jobData?.title ||
           interview.jobId?.titleAr || interview.jobId?.title || 'الوظيفة';
  }

  const handleChannelToggle = (channelValue) => {
    setSelectedChannels(prev =>
      prev.includes(channelValue)
        ? prev.filter(c => c !== channelValue)
        : [...prev, channelValue]
    );
  };

  const getPreviewMessage = () => {
    const templates = {
      acceptance: {
        titleAr: 'تهانينا! تم قبولك',
        messageAr: `يسعدنا إبلاغك بأنه تم قبولك لوظيفة ${getJobTitle()}.`
      },
      rejection: {
        titleAr: 'تحديث حالة الطلب',
        messageAr: `شكراً لاهتمامك بوظيفة ${getJobTitle()}. للأسف، قررنا المضي قدماً مع مرشحين آخرين.`
      },
      shortlist: {
        titleAr: 'تم إضافتك للقائمة المختصرة!',
        messageAr: `أخبار سارة! تمت إضافتك للقائمة المختصرة لوظيفة ${getJobTitle()}. سنتواصل معك قريباً بالخطوات التالية.`
      },
      interview_reminder: {
        titleAr: 'تذكير بالمقابلة',
        messageAr: `هذا تذكير بمقابلتك القادمة لوظيفة ${getJobTitle()} في ${new Date(interview.scheduledAt).toLocaleDateString('ar-SA')}.`
      },
      custom: {
        titleAr: 'رسالة مخصصة',
        messageAr: customMessageAr || customMessage || 'لم يتم كتابة رسالة بعد'
      }
    };

    return templates[notificationType] || { titleAr: '', messageAr: '' };
  };

  const handleSend = async () => {
    if (!notificationType) {
      alert('يرجى اختيار نوع الإشعار');
      return;
    }
    if (selectedChannels.length === 0) {
      alert('يرجى اختيار قناة إرسال واحدة على الأقل');
      return;
    }
    if (notificationType === 'custom' && !customMessage && !customMessageAr) {
      alert('يرجى كتابة الرسالة المخصصة');
      return;
    }

    try {
      setSending(true);
      const response = await api.post(`/publisher/interviews/${interview._id}/notify`, {
        notificationType,
        channels: selectedChannels,
        customMessage,
        customMessageAr,
        language: 'ar'
      });

      onSent(response.data);
    } catch (err) {
      console.error('Error sending notification:', err);
      onSent({
        success: false,
        error: err.response?.data?.message || 'فشل في إرسال الإشعار'
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-content"
        style={{
          backgroundColor: '#1a1f2e',
          borderRadius: '20px',
          padding: '30px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '25px',
          paddingBottom: '15px',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h2 style={{ margin: 0, color: '#e8eefc', fontSize: '1.4rem' }}>
            📨 إشعار المتقدم
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#718096',
              padding: '5px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Applicant Info */}
        <div style={{
          background: 'rgba(99, 102, 241, 0.1)',
          padding: '15px',
          borderRadius: '12px',
          marginBottom: '25px',
          border: '1px solid rgba(99, 102, 241, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem'
            }}>
              👤
            </div>
            <div>
              <h3 style={{ margin: '0 0 5px 0', color: '#e8eefc' }}>{getApplicantName()}</h3>
              <p style={{ margin: 0, color: '#a0aec0', fontSize: '0.9rem' }}>{getJobTitle()}</p>
            </div>
          </div>
          <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#718096' }}>
            {getApplicantEmail() && <div>📧 {getApplicantEmail()}</div>}
            {getApplicantPhone() && <div style={{ marginTop: '4px' }}>📱 {getApplicantPhone()}</div>}
          </div>
        </div>

        {!showPreview ? (
          <>
            {/* Notification Type Selection */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{
                display: 'block',
                marginBottom: '12px',
                color: '#e8eefc',
                fontWeight: '600'
              }}>
                نوع الإشعار *
              </label>
              <div style={{ display: 'grid', gap: '10px' }}>
                {notificationTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setNotificationType(type.value)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '15px',
                      background: notificationType === type.value
                        ? `${type.color}20`
                        : 'rgba(255,255,255,0.04)',
                      border: `2px solid ${notificationType === type.value ? type.color : 'transparent'}`,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'right',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <span style={{ fontSize: '1.5rem' }}>{type.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#e8eefc', fontWeight: '500' }}>{type.label}</div>
                      <div style={{ color: '#718096', fontSize: '0.85rem', marginTop: '2px' }}>{type.description}</div>
                    </div>
                    {notificationType === type.value && (
                      <span style={{ color: type.color, fontSize: '1.2rem' }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Message Input */}
            {notificationType === 'custom' && (
              <div style={{ marginBottom: '25px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#e8eefc',
                  fontWeight: '600'
                }}>
                  الرسالة المخصصة *
                </label>
                <textarea
                  value={customMessageAr}
                  onChange={(e) => setCustomMessageAr(e.target.value)}
                  placeholder="اكتب رسالتك هنا..."
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '15px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#e8eefc',
                    fontSize: '1rem',
                    resize: 'vertical',
                    direction: 'rtl'
                  }}
                />
              </div>
            )}

            {/* Channel Selection */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{
                display: 'block',
                marginBottom: '12px',
                color: '#e8eefc',
                fontWeight: '600'
              }}>
                قنوات الإرسال * (يمكن اختيار أكثر من قناة)
              </label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {channels.map((channel) => (
                  <button
                    key={channel.value}
                    onClick={() => channel.available && handleChannelToggle(channel.value)}
                    disabled={!channel.available}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 20px',
                      background: selectedChannels.includes(channel.value)
                        ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                        : 'rgba(255,255,255,0.04)',
                      border: selectedChannels.includes(channel.value)
                        ? 'none'
                        : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      cursor: channel.available ? 'pointer' : 'not-allowed',
                      color: channel.available ? '#e8eefc' : '#4a5568',
                      opacity: channel.available ? 1 : 0.5,
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>{channel.icon}</span>
                    <span>{channel.label}</span>
                    {!channel.available && (
                      <span style={{ fontSize: '0.75rem', color: '#F44336' }}>(غير متوفر)</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingTop: '20px'
            }}>
              <button
                onClick={onClose}
                style={{
                  padding: '12px 25px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: '#e8eefc',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                إلغاء
              </button>
              <button
                onClick={() => setShowPreview(true)}
                disabled={!notificationType || selectedChannels.length === 0}
                style={{
                  padding: '12px 25px',
                  background: (!notificationType || selectedChannels.length === 0)
                    ? '#4a5568'
                    : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: (!notificationType || selectedChannels.length === 0) ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600'
                }}
              >
                معاينة الرسالة
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Preview Mode */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{
                display: 'block',
                marginBottom: '12px',
                color: '#e8eefc',
                fontWeight: '600'
              }}>
                معاينة الرسالة
              </label>
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#e8eefc' }}>
                  {getPreviewMessage().titleAr}
                </h4>
                <p style={{ margin: 0, color: '#a0aec0', lineHeight: '1.7' }}>
                  {getPreviewMessage().messageAr}
                </p>
              </div>
            </div>

            {/* Selected Channels */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{
                display: 'block',
                marginBottom: '12px',
                color: '#e8eefc',
                fontWeight: '600'
              }}>
                سيتم الإرسال عبر:
              </label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {selectedChannels.map((ch) => {
                  const channel = channels.find(c => c.value === ch);
                  return (
                    <span
                      key={ch}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        background: 'rgba(99, 102, 241, 0.2)',
                        borderRadius: '20px',
                        color: '#e8eefc',
                        fontSize: '0.9rem'
                      }}
                    >
                      {channel?.icon} {channel?.label}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingTop: '20px'
            }}>
              <button
                onClick={() => setShowPreview(false)}
                style={{
                  padding: '12px 25px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: '#e8eefc',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                ← تعديل
              </button>
              <button
                onClick={handleSend}
                disabled={loading}
                style={{
                  padding: '12px 30px',
                  background: loading
                    ? '#4a5568'
                    : 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {loading ? (
                  <>
                    <span style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></span>
                    جاري الإرسال...
                  </>
                ) : (
                  <>📤 إرسال الإشعار</>
                )}
              </button>
            </div>
          </>
        )}

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default NotifyApplicantModal;
