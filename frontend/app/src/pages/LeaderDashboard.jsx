import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../config/api';
import '../styles/AdminDashboard.css';

const LeaderDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [error, setError] = useState('');

  // Check authorization
  useEffect(() => {
    if (!user || !['admin', 'administrator', 'leader'].includes(user.role)) {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'dashboard') {
        const res = await api.get('/leader/dashboard');
        setDashboardData(res.data.data);
      } else if (activeTab === 'team') {
        const res = await api.get('/leader/team');
        setTeamMembers(res.data.data.members || []);
      } else if (activeTab === 'logs') {
        const res = await api.get('/leader/audit-logs');
        setAuditLogs(res.data.data.logs || []);
      }
      setError('');
    } catch (err) {
      console.error('Error:', err);
      setError('خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  if (!user || !['admin', 'administrator', 'leader'].includes(user.role)) {
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
      <div className="admin-header">
        <div className="admin-header-content">
          <h1>👨‍💼 لوحة تحكم القائد</h1>
          <p>إدارة الفريق والصلاحيات والإعدادات</p>
        </div>
        <div className="admin-user-info">
          <span className="role-badge admin">قائد</span>
          <span className="user-name">{user?.firstName} {user?.lastName}</span>
        </div>
      </div>

      {error && <div className="error-message">❌ {error}</div>}

      <div className="admin-tabs">
        <button
          className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 لوحة المعلومات
        </button>
        <button
          className={`tab-button ${activeTab === 'team' ? 'active' : ''}`}
          onClick={() => setActiveTab('team')}
        >
          👥 إدارة الفريق
        </button>
        <button
          className={`tab-button ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          📋 سجل الأنشطة
        </button>
      </div>

      <div className="admin-content">
        {loading ? (
          <div className="loading">جاري التحميل...</div>
        ) : (
          <>
            {activeTab === 'dashboard' && dashboardData && (
              <div className="dashboard-tab">
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-info">
                      <h3>أعضاء الفريق</h3>
                      <p className="stat-number">{dashboardData.stats?.totalTeamMembers || 0}</p>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-info">
                      <h3>أعضاء نشطين</h3>
                      <p className="stat-number">{dashboardData.stats?.activeMembers || 0}</p>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">👨‍💻</div>
                    <div className="stat-info">
                      <h3>إجمالي المستخدمين</h3>
                      <p className="stat-number">{dashboardData.stats?.totalUsers || 0}</p>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">🔑</div>
                    <div className="stat-info">
                      <h3>مفتاح الوصول</h3>
                      <p className="stat-number" style={{ fontSize: '12px' }}>
                        {dashboardData.leader?.accessKey?.substring(0, 8)}...
                      </p>
                    </div>
                  </div>
                </div>

                <div className="recent-activities">
                  <h3>📌 الأنشطة الأخيرة</h3>
                  <div className="activities-list">
                    {dashboardData.recentActivity?.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="activity-item">
                        <span className="activity-badge">📍</span>
                        <span className="activity-message">{activity.description}</span>
                        <span className="activity-time">
                          {new Date(activity.createdAt).toLocaleString('ar-SA')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'team' && (
              <div className="users-tab">
                <h3>👥 أعضاء الفريق</h3>
                {teamMembers.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '20px' }}>لا يوجد أعضاء فريق حالياً</p>
                ) : (
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>الاسم</th>
                        <th>البريد الإلكتروني</th>
                        <th>الحالة</th>
                        <th>تاريخ الإضافة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamMembers.map((member) => (
                        <tr key={member.id}>
                          <td>{member.name}</td>
                          <td>{member.email}</td>
                          <td>
                            <span className={`status-badge ${member.isActive ? 'active' : 'inactive'}`}>
                              {member.isActive ? '✅ نشط' : '❌ غير نشط'}
                            </span>
                          </td>
                          <td>{new Date(member.joinedAt).toLocaleDateString('ar-SA')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="logs-tab">
                <h3>📋 سجل الأنشطة</h3>
                <div className="logs-list">
                  {auditLogs.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '20px' }}>لا يوجد سجل أنشطة</p>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log.id} className="log-item">
                        <div className="log-header">
                          <span className="log-user">👤 {log.userName}</span>
                          <span className="log-time">
                            {new Date(log.createdAt).toLocaleString('ar-SA')}
                          </span>
                        </div>
                        <div className="log-action">
                          <span className="action-badge">{log.action}</span>
                          <span className="log-details">{log.description}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LeaderDashboard;
