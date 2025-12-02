import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import MatchHub from './pages/MatchHub';
import Jobs from './pages/Jobs';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="loading">جاري التحميل...</div>;
  if (!user) return <Navigate to="/login" />;
  
  return children;
};

const Home = () => (
  <div className="home-page">
    <div className="hero">
      <h1>⚽ SportX Platform</h1>
      <p>منصة الرياضة الأولى في الشرق الأوسط</p>
      <p>ابحث عن مباريات، وظائف، ومدربين</p>
      <div className="hero-buttons">
        <a href="/matches" className="hero-btn primary">
          🎯 انضم لمباراة
        </a>
        <a href="/jobs" className="hero-btn secondary">
          💼 تصفح الوظائف
        </a>
      </div>
    </div>

    <div className="features">
      <div className="feature-card">
        <span className="feature-icon">🎯</span>
        <h3>مباريات حية</h3>
        <p>ابحث عن مباريات في منطقتك وانضم فوراً</p>
      </div>
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
              <Route path="/register" element={<Register />} />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
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
