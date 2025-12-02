import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { profileService } from '../config/api';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    role: 'player',
    organizationName: '',
    establishedDate: '',
    businessRegistrationNumber: '',
    organizationType: 'club'
  });
  const [options, setOptions] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const response = await profileService.getOptions();
      setOptions(response.data.data);
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
    }
    if (!/[A-Z]/.test(password)) {
      return 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل (A-Z)';
    }
    if (!/[a-z]/.test(password)) {
      return 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل (a-z)';
    }
    if (!/[0-9]/.test(password)) {
      return 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    const isClub = formData.role === 'club';

    if (isClub) {
      if (!formData.organizationName.trim()) {
        setError('اسم المؤسسة مطلوب');
        return;
      }
      if (!formData.establishedDate) {
        setError('تاريخ التأسيس مطلوب');
        return;
      }
      if (!formData.businessRegistrationNumber.trim()) {
        setError('رقم السجل التجاري مطلوب');
        return;
      }
    } else {
      if (!formData.firstName.trim()) {
        setError('الاسم الأول مطلوب');
        return;
      }
      if (!formData.lastName.trim()) {
        setError('الاسم الأخير مطلوب');
        return;
      }
    }

    setLoading(true);

    const dataToSend = {
      email: formData.email,
      password: formData.password,
      role: formData.role
    };

    if (formData.phone && formData.phone.trim()) {
      dataToSend.phone = formData.phone.trim();
    }

    if (isClub) {
      dataToSend.organizationName = formData.organizationName.trim();
      dataToSend.establishedDate = formData.establishedDate;
      dataToSend.businessRegistrationNumber = formData.businessRegistrationNumber.trim();
      dataToSend.organizationType = formData.organizationType;
    } else {
      dataToSend.firstName = formData.firstName.trim();
      dataToSend.lastName = formData.lastName.trim();
    }

    console.log('Sending registration data:', dataToSend);

    const result = await register(dataToSend);
    
    if (result.success) {
      setRegisteredEmail(formData.email);
      setRegistrationSuccess(true);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const roles = [
    { value: 'player', label: 'لاعب' },
    { value: 'coach', label: 'مدرب' },
    { value: 'club', label: 'نادي / مؤسسة' },
    { value: 'specialist', label: 'أخصائي' },
    { value: 'administrator', label: 'إداري' },
    { value: 'age-group-supervisor', label: 'مشرف فئة عمرية' },
    { value: 'sports-director', label: 'مدير رياضي' },
    { value: 'executive-director', label: 'مدير تنفيذي' },
    { value: 'secretary', label: 'سكرتير' }
  ];

  const organizationTypes = [
    { value: 'club', label: 'نادي رياضي' },
    { value: 'academy', label: 'أكاديمية رياضية' },
    { value: 'federation', label: 'اتحاد رياضي' },
    { value: 'sports-center', label: 'مركز رياضي' }
  ];

  const isClub = formData.role === 'club';

  if (registrationSuccess) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📧</div>
          <h2 style={{ color: '#34a853', marginBottom: '1rem' }}>تم التسجيل بنجاح!</h2>
          <div style={{ 
            background: '#e8f5e9', 
            padding: '1.5rem', 
            borderRadius: '10px',
            marginBottom: '1.5rem'
          }}>
            <p style={{ color: '#2e7d32', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              تم إرسال رابط التأكيد إلى:
            </p>
            <p style={{ color: '#1a73e8', fontSize: '1.1rem', fontWeight: 'bold' }}>
              {registeredEmail}
            </p>
          </div>
          <div style={{ 
            background: '#fff3e0', 
            padding: '1rem', 
            borderRadius: '10px',
            marginBottom: '1.5rem'
          }}>
            <p style={{ color: '#e65100', fontSize: '0.9rem' }}>
              ⚠️ يرجى التحقق من بريدك الإلكتروني وتأكيد حسابك للاستفادة من جميع الميزات
            </p>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="submit-btn"
            style={{ marginTop: '0.5rem' }}
          >
            الذهاب لتسجيل الدخول
          </button>
          <p style={{ marginTop: '1rem', color: '#666', fontSize: '0.9rem' }}>
            لم تستلم البريد؟{' '}
            <button 
              onClick={() => {
                alert('سيتم إرسال رابط التأكيد مرة أخرى');
              }}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#1a73e8', 
                cursor: 'pointer',
                fontWeight: 'bold',
                textDecoration: 'underline'
              }}
            >
              إعادة الإرسال
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: isClub ? '520px' : '420px' }}>
        <h1>📝 تسجيل جديد</h1>
        
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>نوع الحساب *</label>
            <select
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value)}
              required
            >
              {roles.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          {isClub ? (
            <>
              <div className="form-group">
                <label>اسم المؤسسة / النادي *</label>
                <input
                  type="text"
                  value={formData.organizationName}
                  onChange={(e) => handleChange('organizationName', e.target.value)}
                  placeholder="مثال: نادي الهلال"
                  required
                />
              </div>

              <div className="form-group">
                <label>نوع المؤسسة *</label>
                <select
                  value={formData.organizationType}
                  onChange={(e) => handleChange('organizationType', e.target.value)}
                  required
                >
                  {organizationTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>تاريخ التأسيس *</label>
                <input
                  type="date"
                  value={formData.establishedDate}
                  onChange={(e) => handleChange('establishedDate', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  required
                  style={{ direction: 'ltr', textAlign: 'right' }}
                />
              </div>

              <div className="form-group">
                <label>رقم السجل التجاري *</label>
                <input
                  type="text"
                  value={formData.businessRegistrationNumber}
                  onChange={(e) => handleChange('businessRegistrationNumber', e.target.value)}
                  placeholder="مثال: 1234567890"
                  required
                  style={{ direction: 'ltr', textAlign: 'right' }}
                />
              </div>
            </>
          ) : (
            <div className="form-row">
              <div className="form-group">
                <label>الاسم الأول *</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  placeholder="أحمد"
                  required
                />
              </div>

              <div className="form-group">
                <label>الاسم الأخير *</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  placeholder="محمد"
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>البريد الإلكتروني *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="example@email.com"
              required
              style={{ direction: 'ltr', textAlign: 'right' }}
            />
          </div>

          <div className="form-group">
            <label>رقم الجوال (اختياري)</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+966 5XX XXX XXXX"
              style={{ direction: 'ltr', textAlign: 'right' }}
            />
          </div>

          <div className="form-group">
            <label>كلمة المرور *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="••••••••"
              minLength={8}
              required
            />
            <small style={{ color: '#666', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
              8 أحرف على الأقل، حرف كبير، حرف صغير، ورقم
            </small>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'جاري التسجيل...' : 'إنشاء حساب'}
          </button>
        </form>

        <p className="auth-switch">
          لديك حساب بالفعل؟ <Link to="/login">سجل دخول</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
