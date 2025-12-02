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
    role: 'player',
    organizationName: '',
    establishedDate: '',
    businessRegistrationNumber: '',
    organizationType: 'club'
  });
  const [options, setOptions] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

    setLoading(true);

    const dataToSend = { ...formData };
    
    if (formData.role !== 'club') {
      delete dataToSend.organizationName;
      delete dataToSend.establishedDate;
      delete dataToSend.businessRegistrationNumber;
      delete dataToSend.organizationType;
    } else {
      delete dataToSend.firstName;
      delete dataToSend.lastName;
    }

    const result = await register(dataToSend);
    
    if (result.success) {
      alert('تم التسجيل بنجاح! يمكنك الآن تسجيل الدخول');
      navigate('/login');
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
    { value: 'admin', label: 'مدير النظام' },
    { value: 'administrator', label: 'إداري' },
    { value: 'age-group-supervisor', label: 'مشرف فئة عمرية' },
    { value: 'sports-director', label: 'مدير رياضي' },
    { value: 'executive-director', label: 'مدير تنفيذي' },
    { value: 'secretary', label: 'سكرتير' }
  ];

  const organizationTypes = [
    { value: 'club', label: 'نادي رياضي' },
    { value: 'academy', label: 'أكاديمية' },
    { value: 'federation', label: 'اتحاد' },
    { value: 'sports-center', label: 'مركز رياضي' }
  ];

  const isClub = formData.role === 'club';

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: isClub ? '500px' : '400px' }}>
        <h1>📝 تسجيل جديد</h1>
        
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>نوع الحساب</label>
            <select
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value)}
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

              <div className="form-row">
                <div className="form-group">
                  <label>تاريخ التأسيس *</label>
                  <input
                    type="date"
                    value={formData.establishedDate}
                    onChange={(e) => handleChange('establishedDate', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>رقم السجل التجاري *</label>
                  <input
                    type="text"
                    value={formData.businessRegistrationNumber}
                    onChange={(e) => handleChange('businessRegistrationNumber', e.target.value)}
                    placeholder="1234567890"
                    required
                  />
                </div>
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
                  required
                />
              </div>

              <div className="form-group">
                <label>الاسم الأخير *</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
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
            />
          </div>

          <div className="form-group">
            <label>كلمة المرور *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="مثال: Ahmed123"
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
