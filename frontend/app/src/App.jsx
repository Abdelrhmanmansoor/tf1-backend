import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthProvider from './context/AuthProvider';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import MatchHub from './pages/MatchHub';
import Jobs from './pages/Jobs';
import Profile from './pages/Profile';
import Login from './pages/Login';
import LeaderLogin from './pages/LeaderLogin';
import Register from './pages/Register';
import AgeGroupSupervisor from './pages/AgeGroupSupervisor';
import AdminDashboard from './pages/AdminDashboard';
import LeaderDashboard from './pages/LeaderDashboard';
import ClubDashboard from './pages/ClubDashboard';
import JobPublisherDashboard from './pages/JobPublisherDashboard';
import ApplicantDashboard from './pages/ApplicantDashboard';
import './App.css';

// Basic protected route - requires authentication only
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="loading">جاري التحميل...</div>;
  if (!user) return <Navigate to="/login" />;
  
  return children;
};

// Role-based protected route - requires specific roles
const RoleProtectedRoute = ({ children, allowedRoles, redirectTo = '/' }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="loading">جاري التحميل...</div>;
  if (!user) return <Navigate to="/login" />;
  
  // Check if user has one of the allowed roles
  const userRole = user.role || user.roles?.[0];
  if (!allowedRoles.includes(userRole)) {
    console.warn(`Access denied: User role "${userRole}" not in allowed roles:`, allowedRoles);
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '50vh',
        textAlign: 'center',
        padding: '20px'
      }}>
        <h2 style={{ color: '#f44336', marginBottom: '15px' }}>⛔ غير مصرح</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
        <a href={redirectTo} style={{ 
          padding: '10px 25px', 
          background: '#2196F3', 
          color: 'white', 
          borderRadius: '8px', 
          textDecoration: 'none' 
        }}>
          العودة للرئيسية
        </a>
      </div>
    );
  }
  
  return children;
};

const Home = () => (
  <div className="home-page">
    <div className="hero">
      <h1>⚽ SportX Platform</h1>
      <p>منصة الرياضة الأولى في الشرق الأوسط</p>
      <p>ابحث عن مباريات، وظائف، ومدربين</p>
      <div className="hero-buttons">
        {/* زر المباريات مخفي مؤقتاً
        <a href="/matches" className="hero-btn primary">
          🎯 انضم لمباراة
        </a>
        */}
        <a href="/jobs" className="hero-btn secondary">
          💼 تصفح الوظائف
        </a>
      </div>
    </div>

    <div className="features">
      {/* كارت المباريات مخفي مؤقتاً
      <div className="feature-card">
        <span className="feature-icon">🎯</span>
        <h3>مباريات حية</h3>
        <p>ابحث عن مباريات في منطقتك وانضم فوراً</p>
      </div>
      */}
      <div className="feature-card">
        <span className="feature-icon">💼</span>
        <h3>فرص عمل</h3>
        <p>وظائف في الأندية والأكاديميات الرياضية</p>
      </div>
      <div className="feature-card">
        <span className="feature-icon">🏆</span>
        <h3>مدربين محترفين</h3>
        <p>تواصل مع أفضل المدربين في مجالك</p>
      </div>
      <div className="feature-card">
        <span className="feature-icon">🔔</span>
        <h3>إشعارات فورية</h3>
        <p>تنبيهات مباشرة لكل جديد</p>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/matches" element={<MatchHub />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/login" element={<Login />} />
              <Route path="/leader/login" element={<LeaderLogin />} />
              <Route path="/register" element={<Register />} />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              {/* Age Group Supervisor Dashboard - restricted to specific roles */}
              <Route 
                path="/age-group-supervisor" 
                element={
                  <RoleProtectedRoute allowedRoles={['age-group-supervisor', 'admin', 'administrator', 'club']}>
                    <AgeGroupSupervisor />
                  </RoleProtectedRoute>
                } 
              />
              {/* Admin Dashboard - restricted to admin roles */}
              <Route 
                path="/admin-dashboard" 
                element={
                  <RoleProtectedRoute allowedRoles={['admin', 'administrator', 'leader']}>
                    <AdminDashboard />
                  </RoleProtectedRoute>
                } 
              />
              {/* System Admin Secure Panel - alternative path */}
              <Route 
                path="/sys-admin-secure-panel" 
                element={
                  <RoleProtectedRoute allowedRoles={['admin', 'administrator', 'leader']}>
                    <AdminDashboard />
                  </RoleProtectedRoute>
                } 
              />
              {/* Leader Dashboard - restricted to leader role */}
              <Route 
                path="/dashboard/leader"
                element={
                  <RoleProtectedRoute allowedRoles={['leader', 'admin']}>
                    <LeaderDashboard />
                  </RoleProtectedRoute>
                }
              />
              {/* Club Dashboard - restricted to club role */}
              <Route 
                path="/dashboard/club"
                element={
                  <RoleProtectedRoute allowedRoles={['club']}>
                    <ClubDashboard />
                  </RoleProtectedRoute>
                }
              />
              {/* Job Publisher Dashboard - restricted to job-publisher role */}
              <Route 
                path="/dashboard/publisher"
                element={
                  <RoleProtectedRoute allowedRoles={['job-publisher']}>
                    <JobPublisherDashboard />
                  </RoleProtectedRoute>
                }
              />
              {/* Applicant Dashboard - restricted to applicant role */}
              <Route 
                path="/dashboard/applicant"
                element={
                  <RoleProtectedRoute allowedRoles={['applicant']}>
                    <ApplicantDashboard />
                  </RoleProtectedRoute>
                }
              />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
