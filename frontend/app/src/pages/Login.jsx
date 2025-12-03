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

  const handleLeaderQuickLogin = () => {
    setEmail('leader@sportx.com');
    setPassword('Leader123456');
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

        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem', textAlign: 'center' }}>
            🚀 جرب حساب القائد مباشرة:
          </p>
          <button
            type="button"
            onClick={handleLeaderQuickLogin}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#FF6B6B',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginBottom: '0.5rem',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#E74C3C'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#FF6B6B'}
          >
            👨‍💼 دخول كـ قائد تجريبي
          </button>
          <p style={{ fontSize: '0.75rem', color: '#999', textAlign: 'center', marginTop: '0.5rem' }}>
            البريد: leader@sportx.com<br/>
            كلمة المرور: Leader123456
          </p>
        </div>

        <p className="auth-switch">
          ليس لديك حساب؟ <Link to="/register">سجل الآن</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
