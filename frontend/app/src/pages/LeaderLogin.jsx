import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LeaderLogin = () => {
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

    try {
      const result = await login(email, password);
      
      if (result.success) {
        if (result.user?.role !== 'leader') {
          setError('هذا الحساب ليس لديه صلاحيات القائد');
          setLoading(false);
          return;
        }

        if (result.requiresVerification) {
          setShowVerificationNotice(true);
          setTimeout(() => {
            navigate('/dashboard/leader');
          }, 3000);
        } else {
          navigate('/dashboard/leader');
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
        <h1>👨‍💼 دخول القائد</h1>
        
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
              جاري التحويل لـ لوحة القيادة...
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

        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #eee', textAlign: 'center' }}>
          <p style={{ fontSize: '0.9rem', color: '#666' }}>
            هل تحتاج إلى <a href="/login" style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 'bold' }}>دخول عادي؟</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LeaderLogin;
