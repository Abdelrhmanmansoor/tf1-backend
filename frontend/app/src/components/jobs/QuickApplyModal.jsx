/**
 * QuickApplyModal - التقديم السريع بدون تسجيل
 * TF1 Sports Platform
 */

import React, { useState } from 'react';
import api from '../../config/api';
import './QuickApplyModal.css';

const QuickApplyModal = ({ job, isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    city: '',
    coverLetter: ''
  });
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('حجم الملف يجب أن يكون أقل من 5 ميجابايت');
        return;
      }
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        setError('يرجى رفع ملف PDF أو Word فقط');
        return;
      }
      setResume(file);
      setError('');
    }
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      setError('الاسم الكامل مطلوب');
      return false;
    }
    if (!formData.email.trim()) {
      setError('البريد الإلكتروني مطلوب');
      return false;
    }
    const emailRegex = /.+@.+\..+/;
    if (!emailRegex.test(formData.email)) {
      setError('صيغة البريد الإلكتروني غير صحيحة');
      return false;
    }
    if (!formData.phone.trim()) {
      setError('رقم الجوال مطلوب');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const submitData = new FormData();
      submitData.append('fullName', formData.fullName.trim());
      submitData.append('email', formData.email.trim().toLowerCase());
      submitData.append('phone', formData.phone.trim());
      if (formData.city) {
        submitData.append('city', formData.city.trim());
      }
      if (formData.coverLetter) {
        submitData.append('coverLetter', formData.coverLetter.trim());
      }
      if (resume) {
        submitData.append('resume', resume);
      }

      const response = await api.post(`/jobs/${job._id}/quick-apply`, submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setSuccess(true);
        if (onSuccess) {
          onSuccess(response.data);
        }
      }
    } catch (err) {
      console.error('Quick apply error:', err);
      const errorMessage = err.response?.data?.messageAr || err.response?.data?.message || 'حدث خطأ أثناء إرسال الطلب';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      city: '',
      coverLetter: ''
    });
    setResume(null);
    setError('');
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="quick-apply-overlay" onClick={handleClose}>
      <div className="quick-apply-modal" onClick={e => e.stopPropagation()}>
        <button className="quick-apply-close" onClick={handleClose}>
          &times;
        </button>

        {success ? (
          <div className="quick-apply-success">
            <div className="success-icon">&#10003;</div>
            <h2>تم إرسال طلبك بنجاح</h2>
            <p>سيتم مراجعة طلبك من قبل صاحب العمل والتواصل معك عبر البريد الإلكتروني أو الجوال.</p>
            <button className="quick-apply-btn primary" onClick={handleClose}>
              إغلاق
            </button>
          </div>
        ) : (
          <>
            <div className="quick-apply-header">
              <h2>التقديم السريع</h2>
              <p className="job-title">{job?.title || 'وظيفة'}</p>
              <p className="company-name">{job?.club?.name || job?.company || 'جهة التوظيف'}</p>
            </div>

            <form onSubmit={handleSubmit} className="quick-apply-form">
              {error && (
                <div className="quick-apply-error">
                  {error}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="fullName">الاسم الكامل *</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="أدخل اسمك الكامل"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">البريد الإلكتروني *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="example@email.com"
                  required
                  disabled={loading}
                  dir="ltr"
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">رقم الجوال *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="05xxxxxxxx"
                  required
                  disabled={loading}
                  dir="ltr"
                />
              </div>

              <div className="form-group">
                <label htmlFor="city">المدينة</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="مثال: الرياض"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="resume">السيرة الذاتية (اختياري)</label>
                <div className="file-upload-wrapper">
                  <input
                    type="file"
                    id="resume"
                    name="resume"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx"
                    disabled={loading}
                  />
                  <div className="file-upload-label">
                    {resume ? (
                      <span className="file-name">{resume.name}</span>
                    ) : (
                      <span>اختر ملف PDF أو Word</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="coverLetter">رسالة للمسؤول (اختياري)</label>
                <textarea
                  id="coverLetter"
                  name="coverLetter"
                  value={formData.coverLetter}
                  onChange={handleChange}
                  placeholder="اكتب رسالة قصيرة توضح فيها سبب اهتمامك بالوظيفة..."
                  rows="3"
                  disabled={loading}
                />
              </div>

              <div className="quick-apply-actions">
                <button
                  type="submit"
                  className="quick-apply-btn primary"
                  disabled={loading}
                >
                  {loading ? 'جاري الإرسال...' : 'إرسال الطلب'}
                </button>
                <button
                  type="button"
                  className="quick-apply-btn secondary"
                  onClick={handleClose}
                  disabled={loading}
                >
                  إلغاء
                </button>
              </div>

              <p className="quick-apply-note">
                للحصول على تجربة أفضل ومتابعة طلباتك، ننصحك بإنشاء حساب على المنصة.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default QuickApplyModal;
