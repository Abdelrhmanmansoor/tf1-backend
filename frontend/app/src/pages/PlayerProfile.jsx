import { useState, useEffect } from 'react';
import { profileService } from '../config/api';
import CascadingSelect from '../components/CascadingSelect';

const PlayerProfile = () => {
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
        profileService.getPlayerProfile(),
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
      await profileService.updatePlayerProfile(profile);
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
      <h1>👤 ملف اللاعب الشخصي</h1>
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
          <h3>⚽ معلومات اللعب</h3>
          
          <div className="form-group">
            <label>الدوري</label>
            <select 
              value={profile.league || ''}
              onChange={(e) => handleChange('league', e.target.value)}
            >
              <option value="">اختر الدوري</option>
              {options?.leagues?.map(league => (
                <option key={league} value={league}>{league}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>المركز</label>
            <select 
              value={profile.position || ''}
              onChange={(e) => handleChange('position', e.target.value)}
            >
              <option value="">اختر المركز</option>
              {options?.positions?.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>المستوى</label>
            <select 
              value={profile.level || ''}
              onChange={(e) => handleChange('level', e.target.value)}
            >
              <option value="">اختر المستوى</option>
              {options?.levels?.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>القدم المفضلة</label>
            <select 
              value={profile.preferredFoot || ''}
              onChange={(e) => handleChange('preferredFoot', e.target.value)}
            >
              <option value="">اختر</option>
              {options?.preferredFoot?.map(foot => (
                <option key={foot} value={foot}>{foot}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-section">
          <h3>📊 معلومات إضافية</h3>

          <div className="form-group">
            <label>العمر</label>
            <select 
              value={profile.age || ''}
              onChange={(e) => handleChange('age', e.target.value)}
            >
              <option value="">اختر العمر</option>
              {Array.from({length: 40}, (_, i) => i + 15).map(age => (
                <option key={age} value={age}>{age} سنة</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>الخبرة</label>
            <select 
              value={profile.experience || ''}
              onChange={(e) => handleChange('experience', e.target.value)}
            >
              <option value="">اختر الخبرة</option>
              {options?.experience?.map(exp => (
                <option key={exp} value={exp}>{exp}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>عدد المباريات أسبوعياً</label>
            <select 
              value={profile.matchesPerWeek || ''}
              onChange={(e) => handleChange('matchesPerWeek', e.target.value)}
            >
              <option value="">اختر</option>
              {options?.matchesPerWeek?.map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
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

export default PlayerProfile;
