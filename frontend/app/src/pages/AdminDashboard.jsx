import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../config/api';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    totalUsers: 0,
    totalMatches: 0,
    totalJobs: 0,
    totalClubs: 0,
    recentActivities: []
  });
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [siteSettings, setSiteSettings] = useState({
    siteName: 'SportX',
    siteNameAr: 'سبورتس إكس',
    primaryColor: '#2196F3',
    secondaryColor: '#FF9800'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // دقق أولاً على الصلاحيات
  useEffect(() => {
    if (!user || !['admin', 'administrator', 'club', 'leader'].includes(user.role)) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'logs') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // في الواقع، سنجلب هذه من endpoints كاملة
      // لكن حالياً سنظهر البيانات الأساسية
      setDashboardData({
        totalUsers: 45,
        totalMatches: 12,
        totalJobs: 28,
        totalClubs: 5,
        recentActivities: [
          { id: 1, type: 'user_created', message: 'تم إنشاء مستخدم جديد', timestamp: new Date() },
          { id: 2, type: 'match_created', message: 'تم إضافة مباراة جديدة', timestamp: new Date() },
          { id: 3, type: 'job_posted', message: 'تم نشر وظيفة جديدة', timestamp: new Date() }
        ]
      });
      setError('');
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('خطأ في جلب بيانات لوحة التحكم');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // سيتم توصيل هذا بـ endpoints حقيقية
      setUsers([
        { id: 1, name: 'أحمد علي', email: 'ahmed@sportx.com', role: 'player', status: 'active' },
        { id: 2, name: 'سارة محمد', email: 'sara@sportx.com', role: 'coach', status: 'active' },
        { id: 3, name: 'محمود حسن', email: 'mahmoud@sportx.com', role: 'admin', status: 'active' }
      ]);
      setError('');
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('خطأ في جلب المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      // سيتم توصيل هذا بـ endpoints حقيقية
      setAuditLogs([
        { id: 1, user: 'admin@sportx.com', action: 'create_user', timestamp: new Date(), details: 'تم إنشاء مستخدم جديد' },
        { id: 2, user: 'admin@sportx.com', action: 'update_settings', timestamp: new Date(), details: 'تم تحديث الإعدادات' },
        { id: 3, user: 'admin@sportx.com', action: 'delete_match', timestamp: new Date(), details: 'تم حذف مباراة' }
      ]);
      setError('');
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError('خطأ في جلب سجل الأنشطة');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsSave = async () => {
    try {
      setLoading(true);
      // سيتم توصيل هذا بـ endpoints حقيقية
      setSuccess('✅ تم حفظ الإعدادات بنجاح');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('❌ خطأ في حفظ الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
      try {
        setUsers(users.filter(u => u.id !== userId));
        setSuccess('✅ تم حذف المستخدم بنجاح');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError('❌ خطأ في حذف المستخدم');
      }
    }
  };

  if (!user || !['admin', 'administrator', 'club', 'leader'].includes(user.role)) {
    return (
      <div className="admin-dashboard-container">
        <div className="error-message">
          ❌ ليس لديك صلاحية للوصول إلى هذه الصفحة
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-content">
          <h1>👨‍💼 لوحة التحكم الإدارية</h1>
          <p>القائد - التحكم الكامل بالمنصة</p>
        </div>
        <div className="admin-user-info">
          <span className="role-badge admin">قائد النظام</span>
          <span className="user-name">{user?.firstName} {user?.lastName}</span>
        </div>
      </div>

      {/* Messages */}
      {error && <div className="error-message">❌ {error}</div>}
      {success && <div className="success-message">✅ {success}</div>}

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 لوحة المعلومات
        </button>
        <button
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 المستخدمون
        </button>
        <button
          className={`tab-button ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          📋 سجل الأنشطة
        </button>
        <button
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ الإعدادات
        </button>
      </div>

      {/* Content */}
      <div className="admin-content">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-tab">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <h3>إجمالي المستخدمين</h3>
                  <p className="stat-number">{dashboardData.totalUsers}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🎯</div>
                <div className="stat-info">
                  <h3>إجمالي المباريات</h3>
                  <p className="stat-number">{dashboardData.totalMatches}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">💼</div>
                <div className="stat-info">
                  <h3>الوظائف المنشورة</h3>
                  <p className="stat-number">{dashboardData.totalJobs}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🏆</div>
                <div className="stat-info">
                  <h3>الأندية المسجلة</h3>
                  <p className="stat-number">{dashboardData.totalClubs}</p>
                </div>
              </div>
            </div>

            <div className="recent-activities">
              <h3>📌 الأنشطة الأخيرة</h3>
              <div className="activities-list">
                {dashboardData.recentActivities.map((activity) => (
                  <div key={activity.id} className="activity-item">
                    <span className="activity-badge">📍</span>
                    <span className="activity-message">{activity.message}</span>
                    <span className="activity-time">{new Date(activity.timestamp).toLocaleString('ar-SA')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="users-tab">
            <div className="users-header">
              <h3>👥 إدارة المستخدمين</h3>
              <button className="btn-add">➕ إضافة مستخدم جديد</button>
            </div>
            
            {loading ? (
              <div className="loading">جاري التحميل...</div>
            ) : (
              <table className="users-table">
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>البريد الإلكتروني</th>
                    <th>الدور</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td><span className="role-badge">{u.role}</span></td>
                      <td><span className={`status-badge ${u.status}`}>{u.status === 'active' ? 'نشط' : 'غير نشط'}</span></td>
                      <td>
                        <button className="btn-small edit">✏️ تعديل</button>
                        <button className="btn-small delete" onClick={() => handleDeleteUser(u.id)}>🗑️ حذف</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="logs-tab">
            <h3>📋 سجل الأنشطة</h3>
            
            {loading ? (
              <div className="loading">جاري التحميل...</div>
            ) : (
              <div className="logs-list">
                {auditLogs.map((log) => (
                  <div key={log.id} className="log-item">
                    <div className="log-header">
                      <span className="log-user">👤 {log.user}</span>
                      <span className="log-time">{new Date(log.timestamp).toLocaleString('ar-SA')}</span>
                    </div>
                    <div className="log-action">
                      <span className="action-badge">{log.action}</span>
                      <span className="log-details">{log.details}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="settings-tab">
            <h3>⚙️ إعدادات الموقع</h3>
            
            <div className="settings-form">
              <div className="form-group">
                <label>اسم الموقع (English)</label>
                <input
                  type="text"
                  value={siteSettings.siteName}
                  onChange={(e) => setSiteSettings({ ...siteSettings, siteName: e.target.value })}
                  placeholder="اسم الموقع بالإنجليزية"
                />
              </div>

              <div className="form-group">
                <label>اسم الموقع (العربية)</label>
                <input
                  type="text"
                  value={siteSettings.siteNameAr}
                  onChange={(e) => setSiteSettings({ ...siteSettings, siteNameAr: e.target.value })}
                  placeholder="اسم الموقع بالعربية"
                />
              </div>

              <div className="form-group">
                <label>اللون الأساسي</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={siteSettings.primaryColor}
                    onChange={(e) => setSiteSettings({ ...siteSettings, primaryColor: e.target.value })}
                  />
                  <input
                    type="text"
                    value={siteSettings.primaryColor}
                    onChange={(e) => setSiteSettings({ ...siteSettings, primaryColor: e.target.value })}
                    placeholder="#2196F3"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>اللون الثانوي</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={siteSettings.secondaryColor}
                    onChange={(e) => setSiteSettings({ ...siteSettings, secondaryColor: e.target.value })}
                  />
                  <input
                    type="text"
                    value={siteSettings.secondaryColor}
                    onChange={(e) => setSiteSettings({ ...siteSettings, secondaryColor: e.target.value })}
                    placeholder="#FF9800"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button className="btn-save" onClick={handleSettingsSave} disabled={loading}>
                  {loading ? 'جاري الحفظ...' : '💾 حفظ الإعدادات'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
