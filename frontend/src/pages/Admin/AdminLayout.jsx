import { useEffect } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { logoutAdmin } from '../../services/adminService';
import '../../styles/AdminLayout.css';

export default function AdminLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('adminToken')) {
      navigate('/admin/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    logoutAdmin();
    navigate('/admin/login');
  };

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>🏆 SportX</h2>
          <p>Admin</p>
        </div>

        <nav className="nav">
          <Link to="/dashboard/admin" className="nav-link">
            📊 Dashboard
          </Link>
          <Link to="/dashboard/admin/settings" className="nav-link">
            ⚙️ Settings
          </Link>
          <Link to="/dashboard/admin/users" className="nav-link">
            👥 Users
          </Link>
        </nav>

        <button onClick={handleLogout} className="logout-btn">
          🚪 Logout
        </button>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
