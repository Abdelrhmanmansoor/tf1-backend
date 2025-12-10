import { useState, useEffect, useCallback } from 'react';
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
    totalPlayers: 0,
    totalCoaches: 0,
    totalAgeGroups: 0,
    recentActivities: []
  });
  const [users, setUsers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [ageGroups, setAgeGroups] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [siteSettings, setSiteSettings] = useState({
    siteName: 'SportX',
    siteNameAr: 'سبورتس إكس',
    primaryColor: '#2196F3',
    secondaryColor: '#FF9800'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

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

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch real data from multiple endpoints
      const [usersRes, jobsRes, matchesRes] = await Promise.allSettled([
        api.get('/admin/users?limit=1'),
        api.get('/jobs?limit=1'),
        api.get('/matches?limit=1')
      ]);

      const totalUsers = usersRes.status === 'fulfilled' ? usersRes.value.data.total || 0 : 0;
      const totalJobs = jobsRes.status === 'fulfilled' ? jobsRes.value.data.pagination?.total || 0 : 0;
      const totalMatches = matchesRes.status === 'fulfilled' ? matchesRes.value.data.pagination?.total || 0 : 0;

      // Count by role
      const [playersRes, coachesRes, clubsRes] = await Promise.allSettled([
        api.get('/admin/users?role=player&limit=1'),
        api.get('/admin/users?role=coach&limit=1'),
        api.get('/admin/users?role=club&limit=1')
      ]);

      const totalPlayers = playersRes.status === 'fulfilled' ? playersRes.value.data.total || 0 : 0;
      const totalCoaches = coachesRes.status === 'fulfilled' ? coachesRes.value.data.total || 0 : 0;
      const totalClubs = clubsRes.status === 'fulfilled' ? clubsRes.value.data.total || 0 : 0;

      setDashboardData({
        totalUsers,
        totalMatches,
        totalJobs,
        totalClubs,
        totalPlayers,
        totalCoaches,
        totalAgeGroups: 0,
        recentActivities: []
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('خطأ في جلب بيانات لوحة التحكم');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async (page = 1, role = '') => {
    try {
      setLoading(true);
      setError('');
      
      let url = `/admin/users?page=${page}&limit=20`;
      if (role) url += `&role=${role}`;
      
      const res = await api.get(url);
      
      const formattedUsers = (res.data.data || []).map(u => ({
        id: u._id,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
        email: u.email,
        role: u.role || u.roles?.[0] || 'user',
        status: u.isActive !== false ? 'active' : 'inactive',
        createdAt: u.createdAt,
        isVerified: u.isEmailVerified
      }));
      
      setUsers(formattedUsers);
      setPagination({
        page: res.data.page || 1,
        pages: res.data.pages || 1,
        total: res.data.total || 0
      });
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('خطأ في جلب المستخدمين: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const res = await api.get('/admin/logs?limit=50');
      
      const formattedLogs = (res.data.data || res.data.logs || []).map((log, idx) => ({
        id: log._id || idx,
        user: log.user?.email || log.userEmail || 'النظام',
        action: log.action || log.type || 'activity',
        timestamp: log.createdAt || log.timestamp || new Date(),
        details: log.details || log.description || log.message || ''
      }));
      
      setAuditLogs(formattedLogs);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      // Don't show error if endpoint doesn't exist yet
      if (err.response?.status !== 404) {
        setError('خطأ في جلب سجل الأنشطة');
      }
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClubs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users?role=club&limit=50');
      setClubs(res.data.data || []);
    } catch (err) {
      console.error('Error fetching clubs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/jobs?limit=50');
      setJobs(res.data.jobs || []);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAgeGroups = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/age-group-supervisor/groups');
      setAgeGroups(res.data.data?.groups || []);
    } catch (err) {
      console.error('Error fetching age groups:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSettingsSave = async () => {
    try {
      setLoading(true);
      setError('');
      
      await api.patch('/settings', siteSettings);
      
      setSuccess('✅ تم حفظ الإعدادات بنجاح');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('❌ خطأ في حفظ الإعدادات: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
      try {
        setLoading(true);
        await api.delete(`/admin/users/${userId}`);
        setUsers(users.filter(u => u.id !== userId));
        setSuccess('✅ تم حذف المستخدم بنجاح');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        console.error('Error deleting user:', err);
        setError('❌ خطأ في حذف المستخدم: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: '#e91e63',
      club: '#4CAF50',
      player: '#2196F3',
      coach: '#FF9800',
      specialist: '#9C27B0',
      leader: '#f44336'
    };
    return colors[role] || '#666';
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'مدير',
      club: 'نادي',
      player: 'لاعب',
      coach: 'مدرب',
      specialist: 'أخصائي',
      leader: 'قائد'
    };
    return labels[role] || role;
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

      {/* Tabs - Sports Management */}
      <div className="admin-tabs">
        <button
          className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 لوحة المعلومات
        </button>
        <button
          className={`tab-button ${activeTab === 'clubs' ? 'active' : ''}`}
          onClick={() => { setActiveTab('clubs'); fetchClubs(); }}
        >
          🏟️ الأندية
        </button>
        <button
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 المستخدمون
        </button>
        <button
          className={`tab-button ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => { setActiveTab('jobs'); fetchJobs(); }}
        >
          💼 الوظائف
        </button>
        <button
          className={`tab-button ${activeTab === 'ageGroups' ? 'active' : ''}`}
          onClick={() => { setActiveTab('ageGroups'); fetchAgeGroups(); }}
        >
          👶 الفئات العمرية
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

        {/* Clubs Tab - Sports Management */}
        {activeTab === 'clubs' && (
          <div className="clubs-tab">
            <div className="users-header">
              <h3>🏟️ إدارة الأندية</h3>
              <span className="count-badge">{clubs.length} نادي</span>
            </div>
            
            {loading ? (
              <div className="loading">جاري التحميل...</div>
            ) : clubs.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>لا توجد أندية مسجلة</p>
            ) : (
              <div className="clubs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {clubs.map((club) => (
                  <div key={club._id} className="club-card" style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <h4 style={{ color: '#333', marginBottom: '10px' }}>
                      🏟️ {club.firstName} {club.lastName}
                    </h4>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>📧 {club.email}</p>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>📅 انضم: {new Date(club.createdAt).toLocaleDateString('ar-SA')}</p>
                    <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                      <span className={`status-badge ${club.isEmailVerified ? 'active' : 'inactive'}`}>
                        {club.isEmailVerified ? '✅ موثق' : '⏳ غير موثق'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Jobs Tab - Sports Management */}
        {activeTab === 'jobs' && (
          <div className="jobs-tab">
            <div className="users-header">
              <h3>💼 إدارة الوظائف</h3>
              <span className="count-badge">{jobs.length} وظيفة</span>
            </div>
            
            {loading ? (
              <div className="loading">جاري التحميل...</div>
            ) : jobs.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>لا توجد وظائف منشورة</p>
            ) : (
              <table className="users-table">
                <thead>
                  <tr>
                    <th>العنوان</th>
                    <th>النادي</th>
                    <th>الرياضة</th>
                    <th>الموقع</th>
                    <th>تاريخ النشر</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job._id}>
                      <td><strong>{job.title}</strong></td>
                      <td>{job.club?.name || 'غير محدد'}</td>
                      <td>{job.sport || 'عامة'}</td>
                      <td>{job.location || 'غير محدد'}</td>
                      <td>{new Date(job.postedAt).toLocaleDateString('ar-SA')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Age Groups Tab - Sports Management */}
        {activeTab === 'ageGroups' && (
          <div className="age-groups-tab">
            <div className="users-header">
              <h3>� إدارة الفئات العمرية</h3>
              <span className="count-badge">{ageGroups.length} فئة</span>
            </div>
            
            {loading ? (
              <div className="loading">جاري التحميل...</div>
            ) : ageGroups.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>لا توجد فئات عمرية</p>
            ) : (
              <div className="age-groups-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {ageGroups.map((group) => (
                  <div key={group.id} className="age-group-card" style={{ 
                    background: group.status === 'active' ? '#e8f5e9' : '#ffebee', 
                    borderRadius: '12px', 
                    padding: '20px', 
                    border: `2px solid ${group.status === 'active' ? '#4CAF50' : '#f44336'}`
                  }}>
                    <h4 style={{ color: '#333', marginBottom: '5px' }}>{group.name}</h4>
                    <p style={{ color: '#666', marginBottom: '10px' }}>{group.nameAr}</p>
                    <div style={{ display: 'grid', gap: '5px', fontSize: '0.9rem' }}>
                      <p>📅 العمر: {group.ageRange?.min} - {group.ageRange?.max} سنة</p>
                      <p>👥 اللاعبين: {group.playersCount || 0}</p>
                      <p>👨‍🏫 المدرب: {group.coachName || 'لم يتم تعيينه'}</p>
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <span className={`status-badge ${group.status}`}>
                        {group.status === 'active' ? '✅ نشطة' : '❌ معطلة'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="users-tab">
            <div className="users-header">
              <h3>👥 إدارة المستخدمين ({pagination.total})</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select 
                  value={userFilter} 
                  onChange={(e) => { setUserFilter(e.target.value); fetchUsers(1, e.target.value); }}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd' }}
                >
                  <option value="">جميع الأدوار</option>
                  <option value="player">اللاعبين</option>
                  <option value="coach">المدربين</option>
                  <option value="club">الأندية</option>
                  <option value="specialist">الأخصائيين</option>
                  <option value="admin">المديرين</option>
                </select>
              </div>
            </div>
            
            {loading ? (
              <div className="loading">جاري التحميل...</div>
            ) : users.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>لا يوجد مستخدمين</p>
            ) : (
              <>
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>الاسم</th>
                      <th>البريد الإلكتروني</th>
                      <th>الدور</th>
                      <th>الحالة</th>
                      <th>التحقق</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className="role-badge" style={{ backgroundColor: getRoleBadgeColor(u.role) }}>
                            {getRoleLabel(u.role)}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${u.status}`}>
                            {u.status === 'active' ? '✅ نشط' : '❌ غير نشط'}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: u.isVerified ? '#4CAF50' : '#FF9800' }}>
                            {u.isVerified ? '✅' : '⏳'}
                          </span>
                        </td>
                        <td>
                          <button className="btn-small delete" onClick={() => handleDeleteUser(u.id)}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
                    <button 
                      disabled={pagination.page <= 1}
                      onClick={() => fetchUsers(pagination.page - 1, userFilter)}
                      style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer' }}
                    >
                      السابق
                    </button>
                    <span style={{ padding: '8px 16px' }}>
                      صفحة {pagination.page} من {pagination.pages}
                    </span>
                    <button 
                      disabled={pagination.page >= pagination.pages}
                      onClick={() => fetchUsers(pagination.page + 1, userFilter)}
                      style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer' }}
                    >
                      التالي
                    </button>
                  </div>
                )}
              </>
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
