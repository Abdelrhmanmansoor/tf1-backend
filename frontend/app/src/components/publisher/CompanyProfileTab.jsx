/**
 * Company Profile Tab - Job Publisher Dashboard
 * Handles company profile editing with proper enum values
 */

import { useState, useEffect, useRef } from 'react';
import { jobPublisherService } from '../../config/api';
import './CompanyProfileTab.css';

// Enum options with Arabic labels
const INDUSTRY_TYPES = [
  { value: 'sports', label: 'رياضة' },
  { value: 'technology', label: 'تقنية' },
  { value: 'finance', label: 'مالية' },
  { value: 'healthcare', label: 'رعاية صحية' },
  { value: 'retail', label: 'تجزئة' },
  { value: 'manufacturing', label: 'تصنيع' },
  { value: 'education', label: 'تعليم' },
  { value: 'hospitality', label: 'ضيافة' },
  { value: 'construction', label: 'بناء وتشييد' },
  { value: 'logistics', label: 'لوجستيات' },
  { value: 'consulting', label: 'استشارات' },
  { value: 'media', label: 'اعلام' },
  { value: 'real-estate', label: 'عقارات' },
  { value: 'energy', label: 'طاقة' },
  { value: 'telecommunications', label: 'اتصالات' },
  { value: 'other', label: 'اخرى' }
];

const REPRESENTATIVE_TITLES = [
  { value: 'ceo', label: 'الرئيس التنفيذي' },
  { value: 'founder', label: 'المؤسس' },
  { value: 'owner', label: 'المالك' },
  { value: 'director', label: 'المدير' },
  { value: 'manager', label: 'مدير' },
  { value: 'hr_manager', label: 'مدير الموارد البشرية' },
  { value: 'hiring_manager', label: 'مدير التوظيف' },
  { value: 'other', label: 'اخرى' }
];

const COMPANY_SIZES = [
  { value: '1-10', label: '1-10 موظفين' },
  { value: '11-50', label: '11-50 موظف' },
  { value: '51-200', label: '51-200 موظف' },
  { value: '201-500', label: '201-500 موظف' },
  { value: '500+', label: 'اكثر من 500 موظف' }
];

const CompanyProfileTab = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isNewProfile, setIsNewProfile] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    companyName: '',
    industryType: 'sports',
    companySize: '1-10',
    websiteUrl: '',
    businessRegistrationNumber: '',
    representativeName: '',
    representativeTitle: 'manager',
    representativePhone: '',
    representativeEmail: '',
    companyDescription: '',
    companyValues: [],
    companyBenefits: [],
    socialMediaLinks: {
      linkedin: '',
      twitter: '',
      facebook: '',
      instagram: ''
    },
    taxNumber: ''
  });

  const [logoPreview, setLogoPreview] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await jobPublisherService.getProfile();
      if (res.data?.profile) {
        setProfile(res.data.profile);
        populateForm(res.data.profile);
        setIsNewProfile(false);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setIsNewProfile(true);
      } else {
        setError(err.response?.data?.messageAr || 'خطا في تحميل البروفايل');
      }
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (profileData) => {
    setFormData({
      companyName: profileData.companyName || '',
      industryType: profileData.industryType || 'sports',
      companySize: profileData.companySize || '1-10',
      websiteUrl: profileData.websiteUrl || '',
      businessRegistrationNumber: profileData.businessRegistrationNumber || '',
      representativeName: profileData.representativeName || '',
      representativeTitle: profileData.representativeTitle || 'manager',
      representativePhone: profileData.representativePhone || '',
      representativeEmail: profileData.representativeEmail || '',
      companyDescription: profileData.companyDescription || '',
      companyValues: profileData.companyValues || [],
      companyBenefits: profileData.companyBenefits || [],
      socialMediaLinks: {
        linkedin: profileData.socialMediaLinks?.linkedin || '',
        twitter: profileData.socialMediaLinks?.twitter || '',
        facebook: profileData.socialMediaLinks?.facebook || '',
        instagram: profileData.socialMediaLinks?.instagram || ''
      },
      taxNumber: profileData.taxNumber || ''
    });

    if (profileData.companyLogo) {
      setLogoPreview(profileData.companyLogo);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('social_')) {
      const socialKey = name.replace('social_', '');
      setFormData(prev => ({
        ...prev,
        socialMediaLinks: {
          ...prev.socialMediaLinks,
          [socialKey]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار ملف صورة');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('حجم الصورة يجب ان يكون اقل من 5 ميجابايت');
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoPreview(event.target.result);
    };
    reader.readAsDataURL(file);

    // Upload to server
    try {
      setUploading(true);
      setError('');

      const formDataUpload = new FormData();
      formDataUpload.append('logo', file);

      const res = await jobPublisherService.uploadLogo(formDataUpload);

      if (res.data?.success) {
        const logoUrl = res.data?.data?.logoUrl || res.data?.logoUrl;
        setLogoPreview(logoUrl);
        setSuccess('تم رفع الشعار بنجاح');
        // Refresh profile to get updated logo
        fetchProfile();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(res.data?.messageAr || res.data?.message || 'فشل رفع الشعار');
        // Revert preview on failure
        if (profile?.companyLogo) {
          setLogoPreview(profile.companyLogo);
        } else {
          setLogoPreview(null);
        }
      }
    } catch (err) {
      const errorMsg = err.response?.data?.messageAr ||
                       err.response?.data?.message ||
                       'حدث خطا اثناء رفع الشعار';
      setError(errorMsg);
      if (profile?.companyLogo) {
        setLogoPreview(profile.companyLogo);
      } else {
        setLogoPreview(null);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.companyName?.trim()) {
      setError('اسم الشركة مطلوب');
      return;
    }
    if (!formData.companyDescription?.trim() || formData.companyDescription.length < 50) {
      setError('وصف الشركة مطلوب (50 حرف على الاقل)');
      return;
    }
    if (!formData.representativeName?.trim()) {
      setError('اسم الممثل مطلوب');
      return;
    }
    if (!formData.representativePhone?.trim()) {
      setError('رقم هاتف الممثل مطلوب');
      return;
    }
    if (!formData.representativeEmail?.trim()) {
      setError('البريد الالكتروني للممثل مطلوب');
      return;
    }

    try {
      setSaving(true);

      if (isNewProfile) {
        await jobPublisherService.createProfile(formData);
        setSuccess('تم انشاء البروفايل بنجاح');
        setIsNewProfile(false);
      } else {
        await jobPublisherService.updateProfile(formData);
        setSuccess('تم تحديث البروفايل بنجاح');
      }

      fetchProfile();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.messageAr ||
                       err.response?.data?.message ||
                       'حدث خطا اثناء الحفظ';
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'ش';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return (words[0][0] + (words[1]?.[0] || '')).toUpperCase();
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
        <p>جاري تحميل البروفايل...</p>
      </div>
    );
  }

  return (
    <div className="company-profile-tab">
      <div className="profile-header">
        <h2>{isNewProfile ? 'انشاء بروفايل الشركة' : 'بروفايل الشركة'}</h2>
        <p className="profile-subtitle">
          {isNewProfile
            ? 'اكمل بيانات شركتك للبدء في نشر الوظائف'
            : 'قم بتحديث معلومات شركتك'
          }
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="profile-form">
        {/* Logo Section */}
        <div className="form-section">
          <h3>شعار الشركة</h3>
          <div className="logo-upload-section">
            <div
              className={`logo-preview ${uploading ? 'uploading' : ''}`}
              onClick={handleLogoClick}
            >
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="شعار الشركة"
                  onError={() => setLogoPreview(null)}
                />
              ) : (
                <div className="logo-placeholder">
                  {getInitials(formData.companyName)}
                </div>
              )}
              {uploading && (
                <div className="upload-overlay">
                  <div className="spinner-small"></div>
                </div>
              )}
              <div className="logo-edit-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              style={{ display: 'none' }}
            />
            <p className="logo-hint">اضغط لتغيير الشعار (PNG, JPG - حد اقصى 5MB)</p>
          </div>
        </div>

        {/* Company Information */}
        <div className="form-section">
          <h3>معلومات الشركة</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>اسم الشركة <span className="required">*</span></label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                placeholder="اسم الشركة او المؤسسة"
                required
              />
            </div>

            <div className="form-group">
              <label>نوع الصناعة <span className="required">*</span></label>
              <select
                name="industryType"
                value={formData.industryType}
                onChange={handleInputChange}
                required
              >
                {INDUSTRY_TYPES.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>حجم الشركة <span className="required">*</span></label>
              <select
                name="companySize"
                value={formData.companySize}
                onChange={handleInputChange}
                required
              >
                {COMPANY_SIZES.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>الموقع الالكتروني</label>
              <input
                type="url"
                name="websiteUrl"
                value={formData.websiteUrl}
                onChange={handleInputChange}
                placeholder="https://example.com"
                dir="ltr"
              />
            </div>

            <div className="form-group">
              <label>رقم السجل التجاري {isNewProfile && <span className="required">*</span>}</label>
              <input
                type="text"
                name="businessRegistrationNumber"
                value={formData.businessRegistrationNumber}
                onChange={handleInputChange}
                placeholder="رقم السجل التجاري"
                required={isNewProfile}
                disabled={!isNewProfile}
              />
              {!isNewProfile && (
                <small className="field-note">لا يمكن تغيير رقم السجل التجاري</small>
              )}
            </div>

            <div className="form-group">
              <label>الرقم الضريبي</label>
              <input
                type="text"
                name="taxNumber"
                value={formData.taxNumber}
                onChange={handleInputChange}
                placeholder="الرقم الضريبي"
              />
            </div>
          </div>

          <div className="form-group full-width">
            <label>وصف الشركة <span className="required">*</span></label>
            <textarea
              name="companyDescription"
              value={formData.companyDescription}
              onChange={handleInputChange}
              placeholder="اكتب وصفا تفصيليا عن شركتك ونشاطها (50 حرف على الاقل)"
              rows="4"
              required
              minLength={50}
            />
            <small className="char-count">
              {formData.companyDescription?.length || 0} / 2000 حرف
            </small>
          </div>
        </div>

        {/* Representative Information */}
        <div className="form-section">
          <h3>معلومات الممثل</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>اسم الممثل <span className="required">*</span></label>
              <input
                type="text"
                name="representativeName"
                value={formData.representativeName}
                onChange={handleInputChange}
                placeholder="الاسم الكامل"
                required
              />
            </div>

            <div className="form-group">
              <label>المسمى الوظيفي <span className="required">*</span></label>
              <select
                name="representativeTitle"
                value={formData.representativeTitle}
                onChange={handleInputChange}
                required
              >
                {REPRESENTATIVE_TITLES.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>رقم الهاتف <span className="required">*</span></label>
              <input
                type="tel"
                name="representativePhone"
                value={formData.representativePhone}
                onChange={handleInputChange}
                placeholder="05xxxxxxxx"
                required
                dir="ltr"
              />
            </div>

            <div className="form-group">
              <label>البريد الالكتروني <span className="required">*</span></label>
              <input
                type="email"
                name="representativeEmail"
                value={formData.representativeEmail}
                onChange={handleInputChange}
                placeholder="email@company.com"
                required
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div className="form-section">
          <h3>روابط التواصل الاجتماعي</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>LinkedIn</label>
              <input
                type="url"
                name="social_linkedin"
                value={formData.socialMediaLinks.linkedin}
                onChange={handleInputChange}
                placeholder="https://linkedin.com/company/..."
                dir="ltr"
              />
            </div>

            <div className="form-group">
              <label>Twitter / X</label>
              <input
                type="url"
                name="social_twitter"
                value={formData.socialMediaLinks.twitter}
                onChange={handleInputChange}
                placeholder="https://twitter.com/..."
                dir="ltr"
              />
            </div>

            <div className="form-group">
              <label>Facebook</label>
              <input
                type="url"
                name="social_facebook"
                value={formData.socialMediaLinks.facebook}
                onChange={handleInputChange}
                placeholder="https://facebook.com/..."
                dir="ltr"
              />
            </div>

            <div className="form-group">
              <label>Instagram</label>
              <input
                type="url"
                name="social_instagram"
                value={formData.socialMediaLinks.instagram}
                onChange={handleInputChange}
                placeholder="https://instagram.com/..."
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="form-actions">
          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="spinner-small"></span>
                جاري الحفظ...
              </>
            ) : isNewProfile ? (
              'انشاء البروفايل'
            ) : (
              'حفظ التغييرات'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanyProfileTab;
