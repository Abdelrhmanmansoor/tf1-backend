import { useState, useEffect } from 'react';
import { profileService } from '../config/api';
import CascadingSelect from '../components/CascadingSelect';

const CoachProfile = () => {
  const [profile, setProfile] = useState({});
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, optionsRes] = await Promise.all([
        profileService.getCoachProfile(),
        profileService.getOptions()
      ]);
      setProfile(profileRes.data.data || {});
      setOptions(optionsRes.data.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await profileService.updateCoachProfile(profile);
      setMessage('✅ تم حفظ التغييرات بنجاح');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('❌ حدث خطأ في الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">جاري التحميل...</div>;

  return (
    <div className="profile-page">
      <h1>🏆 ملف المدرب الشخصي</h1>
      <p>جميع الحقول اختيارات جاهزة - لا حاجة للكتابة</p>

      {message && <div className="message">{message}</div>}

      <form onSubmit={handleSubmit} className="profile-form">
        <div className="form-section">
          <h3>📍 الموقع</h3>
          {options && (
            <CascadingSelect
              regions={options.regions}
              neighborhoods={options.neighborhoods}
              selectedRegion={profile.region}
              selectedCity={profile.city}
              selectedNeighborhood={profile.neighborhood}
              onRegionChange={(v) => handleChange('region', v)}
              onCityChange={(v) => handleChange('city', v)}
              onNeighborhoodChange={(v) => handleChange('neighborhood', v)}
            />
          )}
        </div>

        <div className="form-section">
          <h3>📜 الشهادات</h3>
          <div className="form-group">
            <label>الشهادة التدريبية</label>
            <select 
              value={profile.certificates || ''}
              onChange={(e) => handleChange('certificates', e.target.value)}
            >
              <option value="">اختر الشهادة</option>
              {options?.certificates?.map(cert => (
                <option key={cert} value={cert}>{cert}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-section">
          <h3>⚽ معلومات التدريب</h3>

          <div className="form-group">
            <label>نوع التدريب</label>
            <select 
              value={profile.coachingType || ''}
              onChange={(e) => handleChange('coachingType', e.target.value)}
            >
              <option value="">اختر نوع التدريب</option>
              {options?.coachingTypes?.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>الفئة العمرية</label>
            <select 
              value={profile.ageGroup || ''}
              onChange={(e) => handleChange('ageGroup', e.target.value)}
            >
              <option value="">اختر الفئة العمرية</option>
              {options?.ageGroups?.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>سنوات الخبرة</label>
            <select 
              value={profile.experienceYears || ''}
              onChange={(e) => handleChange('experienceYears', e.target.value)}
            >
              <option value="">اختر سنوات الخبرة</option>
              {options?.experience?.map(exp => (
                <option key={exp} value={exp}>{exp}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>نوع الفرق</label>
            <select 
              value={profile.teamTypes || ''}
              onChange={(e) => handleChange('teamTypes', e.target.value)}
            >
              <option value="">اختر نوع الفرق</option>
              <option value="academy">أكاديمية</option>
              <option value="club">نادي</option>
              <option value="school">مدرسة</option>
              <option value="university">جامعة</option>
              <option value="national">منتخب</option>
            </select>
          </div>
        </div>

        <div className="form-section">
          <h3>📱 معلومات التواصل</h3>
          <div className="form-group">
            <label>رقم الجوال</label>
            <input
              type="tel"
              value={profile.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="05XXXXXXXX"
              pattern="[0-9]*"
            />
          </div>
        </div>

        <button type="submit" className="save-btn" disabled={saving}>
          {saving ? 'جاري الحفظ...' : '💾 حفظ التغييرات'}
        </button>
      </form>
    </div>
  );
};

export default CoachProfile;
