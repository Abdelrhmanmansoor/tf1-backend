import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="logo">
          <span className="logo-icon">⚽</span>
          <span className="logo-text">SportX</span>
        </Link>

        <div className={`nav-links ${menuOpen ? 'active' : ''}`}>
          <Link to="/matches" className="nav-link match-btn">
            🎯 انضم لمباراة
          </Link>
          <Link to="/jobs" className="nav-link">
            💼 الوظائف
          </Link>
          {user ? (
            <>
              <Link to="/profile" className="nav-link">
                👤 ملفي الشخصي
              </Link>
              {['age-group-supervisor', 'admin', 'administrator', 'club'].includes(user.role) && (
                <Link to="/age-group-supervisor" className="nav-link">
                  👥 إدارة الفئات
                </Link>
              )}
              {['admin', 'administrator', 'leader'].includes(user.role) && (
                <Link to="/admin-dashboard" className="nav-link admin-dashboard-link">
                  ⚙️ Admin
                </Link>
              )}
              <NotificationBell />
              <button onClick={handleLogout} className="logout-btn">
                خروج
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                دخول
              </Link>
              <Link to="/register" className="nav-link register-btn">
                تسجيل جديد
              </Link>
            </>
          )}
        </div>

        <button 
          className="menu-toggle" 
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
