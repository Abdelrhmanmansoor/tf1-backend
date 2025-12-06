import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerificationNotice, setShowVerificationNotice] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setShowVerificationNotice(false);
    setLoading(true);

    console.log('Attempting login with:', email);
    
    try {
      const result = await login(email, password);
      console.log('Login result:', result);
      
      if (result.success) {
        if (result.requiresVerification) {
          setShowVerificationNotice(true);
          setTimeout(() => {
            navigate('/matches');
          }, 3000);
        } else {
          navigate('/matches');
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Login exception:', err);
      setError('حدث خطأ في الاتصال');
    }
    
    setLoading(false);
  };


  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>🔐 تسجيل الدخول</h1>
        
        {error && <div className="error-message">{error}</div>}

        {showVerificationNotice && (
          <div style={{
            background: '#fff3e0',
            border: '1px solid #ffb74d',
            padding: '1rem',
            borderRadius: '10px',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            <p style={{ color: '#e65100', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              ⚠️ حسابك غير مؤكد
            </p>
            <p style={{ color: '#f57c00', fontSize: '0.9rem' }}>
              يرجى التحقق من بريدك الإلكتروني وتأكيد حسابك
            </p>
            <p style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              جاري التحويل للصفحة الرئيسية...
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              style={{ direction: 'ltr', textAlign: 'right' }}
            />
          </div>

          <div className="form-group">
            <label>كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading || showVerificationNotice}>
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>

        <p className="auth-switch">
          ليس لديك حساب؟ <Link to="/register">سجل الآن</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
