# 🎨 Frontend Admin Dashboard Implementation Guide

## 📋 Installation & Setup

```bash
# Install dependencies
npm install axios react-router-dom recharts date-fns lucide-react

# or
yarn add axios react-router-dom recharts date-fns lucide-react
```

---

## 🔐 1. Admin Auth Service

```typescript
// src/services/adminAuthService.ts
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

const loginAdmin = async (email: string, password: string) => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password,
    });

    if (response.data.data.user.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const token = response.data.data.accessToken;
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminUser', JSON.stringify(response.data.data.user));

    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Login failed');
  }
};

const logoutAdmin = () => {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
};

const getAdminToken = () => {
  return localStorage.getItem('adminToken');
};

const isAdminLoggedIn = () => {
  return !!getAdminToken();
};

export { loginAdmin, logoutAdmin, getAdminToken, isAdminLoggedIn };
```

---

## 📊 2. Admin Dashboard Service

```typescript
// src/services/adminService.ts
import axios from 'axios';
import { getAdminToken } from './adminAuthService';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

const getHeaders = () => ({
  Authorization: `Bearer ${getAdminToken()}`,
});

// Dashboard Stats
const getDashboardStats = async () => {
  const response = await axios.get(`${API_URL}/admin/dashboard`, {
    headers: getHeaders(),
  });
  return response.data.data;
};

// Settings
const getSettings = async () => {
  const response = await axios.get(`${API_URL}/admin/settings`, {
    headers: getHeaders(),
  });
  return response.data.data;
};

const updateSettings = async (settings: any) => {
  const response = await axios.patch(`${API_URL}/admin/settings`, settings, {
    headers: getHeaders(),
  });
  return response.data.data;
};

// Articles
const getAllArticles = async (page = 1, status?: string) => {
  const query = status ? `?page=${page}&status=${status}` : `?page=${page}`;
  const response = await axios.get(`${API_URL}/admin/articles${query}`, {
    headers: getHeaders(),
  });
  return response.data;
};

const featureArticle = async (articleId: string, isFeatured: boolean) => {
  const response = await axios.patch(
    `${API_URL}/admin/articles/${articleId}/feature`,
    { isFeatured },
    { headers: getHeaders() }
  );
  return response.data;
};

// Users
const getAllUsers = async (page = 1, role?: string) => {
  const query = role ? `?page=${page}&role=${role}` : `?page=${page}`;
  const response = await axios.get(`${API_URL}/admin/users${query}`, {
    headers: getHeaders(),
  });
  return response.data;
};

const deleteUser = async (userId: string) => {
  const response = await axios.delete(`${API_URL}/admin/users/${userId}`, {
    headers: getHeaders(),
  });
  return response.data;
};

const blockUser = async (userId: string, reason: string) => {
  const response = await axios.patch(
    `${API_URL}/admin/users/${userId}/block`,
    { isBlocked: true, reason },
    { headers: getHeaders() }
  );
  return response.data;
};

const unblockUser = async (userId: string) => {
  const response = await axios.patch(
    `${API_URL}/admin/users/${userId}/block`,
    { isBlocked: false },
    { headers: getHeaders() }
  );
  return response.data;
};

// Logs & Activity
const getActivityLogs = async (limit = 50, action?: string) => {
  const query = action ? `?limit=${limit}&action=${action}` : `?limit=${limit}`;
  const response = await axios.get(`${API_URL}/admin/logs${query}`, {
    headers: getHeaders(),
  });
  return response.data;
};

const getUserLoginHistory = async (limit = 100) => {
  const response = await axios.get(`${API_URL}/admin/user-logins?limit=${limit}`, {
    headers: getHeaders(),
  });
  return response.data;
};

const getUserActivity = async (userId: string, limit = 50) => {
  const response = await axios.get(
    `${API_URL}/admin/user-activity/${userId}?limit=${limit}`,
    { headers: getHeaders() }
  );
  return response.data;
};

// Analytics
const getAnalytics = async () => {
  const response = await axios.get(`${API_URL}/admin/analytics`, {
    headers: getHeaders(),
  });
  return response.data.data;
};

export {
  getDashboardStats,
  getSettings,
  updateSettings,
  getAllArticles,
  featureArticle,
  getAllUsers,
  deleteUser,
  blockUser,
  unblockUser,
  getActivityLogs,
  getUserLoginHistory,
  getUserActivity,
  getAnalytics,
};
```

---

## 🎨 3. Admin Login Page

```typescript
// src/pages/AdminLogin.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginAdmin } from '../services/adminAuthService';
import './AdminLogin.css';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await loginAdmin(email, password);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="login-box">
        <div className="logo-section">
          <h1>🔐 SportX Admin</h1>
          <p>Dashboard Control Panel</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@sportx.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? 'Logging in...' : 'Login to Admin Panel'}
          </button>
        </form>

        <div className="security-notice">
          <p>⚠️ Restricted Access - Admin Only</p>
          <p>All logins are monitored and logged</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
```

**CSS:**
```css
/* src/pages/AdminLogin.css */
.admin-login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.login-box {
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 400px;
}

.logo-section {
  text-align: center;
  margin-bottom: 30px;
}

.logo-section h1 {
  font-size: 28px;
  color: #333;
  margin: 0;
}

.logo-section p {
  color: #666;
  font-size: 14px;
  margin: 5px 0 0 0;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 20px;
  font-size: 14px;
}

.login-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.3s;
}

.login-btn:hover {
  opacity: 0.9;
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.security-notice {
  margin-top: 20px;
  padding: 15px;
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  border-radius: 5px;
  text-align: center;
}

.security-notice p {
  margin: 5px 0;
  font-size: 12px;
  color: #856404;
}
```

---

## 📊 4. Main Dashboard

```typescript
// src/pages/Admin/Dashboard.tsx
import { useEffect, useState } from 'react';
import { getDashboardStats, getAnalytics } from '../../services/adminService';
import StatCard from '../../components/Admin/StatCard';
import './Dashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, analyticsData] = await Promise.all([
          getDashboardStats(),
          getAnalytics(),
        ]);
        setStats(statsData);
        setAnalytics(analyticsData);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="loading">Loading Dashboard...</div>;

  return (
    <div className="dashboard-container">
      <h1>📊 Admin Dashboard</h1>

      <div className="stats-grid">
        <StatCard
          title="Total Users"
          value={analytics?.totalUsers}
          icon="👥"
          color="#3498db"
        />
        <StatCard
          title="Articles"
          value={analytics?.totalArticles}
          icon="📰"
          color="#e74c3c"
        />
        <StatCard
          title="Published"
          value={analytics?.publishedArticles}
          icon="✅"
          color="#2ecc71"
        />
        <StatCard
          title="New Users (Month)"
          value={analytics?.newUsersThisMonth}
          icon="🆕"
          color="#f39c12"
        />
      </div>

      <div className="analytics-section">
        <h2>User Statistics by Role</h2>
        <div className="roles-breakdown">
          {analytics?.usersByRole?.map((role: any) => (
            <div key={role.role} className="role-item">
              <span className="role-name">{role.role.toUpperCase()}</span>
              <span className="role-count">{role.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="quick-stats">
        <div className="stat-box">
          <h3>✅ Verified Users</h3>
          <p className="stat-value">{analytics?.verifiedUsers}</p>
        </div>
        <div className="stat-box">
          <h3>🚫 Blocked Users</h3>
          <p className="stat-value">{analytics?.blockedUsers}</p>
        </div>
        <div className="stat-box">
          <h3>📈 Logins This Month</h3>
          <p className="stat-value">{analytics?.loginLogsThisMonth}</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
```

---

## 🎨 5. Settings Management

```typescript
// src/pages/Admin/Settings.tsx
import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../../services/adminService';
import './Settings.css';

const SettingsPage = () => {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await getSettings();
        setSettings(data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setSettings({
      ...settings,
      [name]: newValue,
    });
  };

  const handleThemeChange = (field: string, value: string) => {
    setSettings({
      ...settings,
      theme: {
        ...settings.theme,
        [field]: value,
      },
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(settings);
      alert('Settings updated successfully!');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading Settings...</div>;

  return (
    <div className="settings-container">
      <h1>⚙️ Site Settings</h1>

      <div className="settings-sections">
        {/* Site Info */}
        <div className="settings-section">
          <h2>📝 Site Information</h2>
          <div className="form-group">
            <label>Site Name</label>
            <input
              type="text"
              name="siteName"
              value={settings?.siteName || ''}
              onChange={handleInputChange}
              placeholder="SportX Platform"
            />
          </div>
          <div className="form-group">
            <label>Site Description</label>
            <input
              type="text"
              name="siteDescription"
              value={settings?.siteDescription || ''}
              onChange={handleInputChange}
              placeholder="Professional Sports Networking"
            />
          </div>
        </div>

        {/* Theme Colors */}
        <div className="settings-section">
          <h2>🎨 Theme Colors</h2>
          <div className="color-grid">
            <div className="color-input">
              <label>Primary Color</label>
              <div className="color-picker-group">
                <input
                  type="color"
                  value={settings?.theme?.primaryColor || '#1a73e8'}
                  onChange={(e) =>
                    handleThemeChange('primaryColor', e.target.value)
                  }
                />
                <span>{settings?.theme?.primaryColor}</span>
              </div>
            </div>

            <div className="color-input">
              <label>Secondary Color</label>
              <div className="color-picker-group">
                <input
                  type="color"
                  value={settings?.theme?.secondaryColor || '#34a853'}
                  onChange={(e) =>
                    handleThemeChange('secondaryColor', e.target.value)
                  }
                />
                <span>{settings?.theme?.secondaryColor}</span>
              </div>
            </div>

            <div className="color-input">
              <label>Accent Color</label>
              <div className="color-picker-group">
                <input
                  type="color"
                  value={settings?.theme?.accentColor || '#fbbc04'}
                  onChange={(e) =>
                    handleThemeChange('accentColor', e.target.value)
                  }
                />
                <span>{settings?.theme?.accentColor}</span>
              </div>
            </div>

            <div className="color-input">
              <label>Background Color</label>
              <div className="color-picker-group">
                <input
                  type="color"
                  value={settings?.theme?.backgroundColor || '#ffffff'}
                  onChange={(e) =>
                    handleThemeChange('backgroundColor', e.target.value)
                  }
                />
                <span>{settings?.theme?.backgroundColor}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Maintenance */}
        <div className="settings-section">
          <h2>🔧 Maintenance</h2>
          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                name="maintenanceMode"
                checked={settings?.maintenanceMode || false}
                onChange={handleInputChange}
              />
              Enable Maintenance Mode
            </label>
          </div>
          <div className="form-group">
            <label>Maintenance Message</label>
            <input
              type="text"
              name="maintenanceMessage"
              value={settings?.maintenanceMessage || ''}
              onChange={handleInputChange}
              placeholder="Platform under maintenance..."
            />
          </div>
        </div>

        {/* Features */}
        <div className="settings-section">
          <h2>✨ Features</h2>
          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={settings?.features?.registrationEnabled || false}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    features: {
                      ...settings.features,
                      registrationEnabled: e.target.checked,
                    },
                  })
                }
              />
              Allow User Registration
            </label>
          </div>
          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={settings?.features?.blogEnabled || false}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    features: {
                      ...settings.features,
                      blogEnabled: e.target.checked,
                    },
                  })
                }
              />
              Enable Blog
            </label>
          </div>
          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={settings?.features?.jobsEnabled || false}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    features: {
                      ...settings.features,
                      jobsEnabled: e.target.checked,
                    },
                  })
                }
              />
              Enable Jobs
            </label>
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="save-btn">
        {saving ? '💾 Saving...' : '✅ Save Changes'}
      </button>
    </div>
  );
};

export default SettingsPage;
```

---

## 👥 6. Users Management

```typescript
// src/pages/Admin/UsersManagement.tsx
import { useEffect, useState } from 'react';
import { getAllUsers, blockUser, unblockUser } from '../../services/adminService';
import './UsersManagement.css';

const UsersManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await getAllUsers(page, roleFilter || undefined);
        setUsers(data.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [page, roleFilter]);

  const handleBlockUser = async (userId: string, reason: string) => {
    try {
      await blockUser(userId, reason);
      alert('User blocked successfully');
      // Refresh list
      const data = await getAllUsers(page, roleFilter || undefined);
      setUsers(data.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      await unblockUser(userId);
      alert('User unblocked successfully');
      // Refresh list
      const data = await getAllUsers(page, roleFilter || undefined);
      setUsers(data.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) return <div className="loading">Loading Users...</div>;

  return (
    <div className="users-management">
      <h1>👥 Users Management</h1>

      <div className="filter-section">
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          <option value="player">Players</option>
          <option value="coach">Coaches</option>
          <option value="club">Clubs</option>
          <option value="specialist">Specialists</option>
        </select>
      </div>

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Verified</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id} className={user.isBlocked ? 'blocked' : ''}>
                <td>{user.firstName} {user.lastName}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge role-${user.role}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <span className={`status ${user.isBlocked ? 'blocked' : 'active'}`}>
                    {user.isBlocked ? '🚫 Blocked' : '✅ Active'}
                  </span>
                </td>
                <td>{user.isVerified ? '✅' : '❌'}</td>
                <td className="actions">
                  {user.isBlocked ? (
                    <button
                      onClick={() => handleUnblockUser(user._id)}
                      className="btn-unblock"
                    >
                      🔓 Unblock
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const reason = prompt('Enter block reason:');
                        if (reason) handleBlockUser(user._id, reason);
                      }}
                      className="btn-block"
                    >
                      🚫 Block
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersManagement;
```

---

## 📰 7. Articles Management

```typescript
// src/pages/Admin/ArticlesManagement.tsx
import { useEffect, useState } from 'react';
import { getAllArticles, featureArticle } from '../../services/adminService';
import './ArticlesManagement.css';

const ArticlesManagement = () => {
  const [articles, setArticles] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const data = await getAllArticles(1, statusFilter || undefined);
        setArticles(data.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [statusFilter]);

  const handleFeatureArticle = async (articleId: string) => {
    try {
      await featureArticle(articleId, true);
      alert('Article featured!');
      // Refresh
      const data = await getAllArticles(1, statusFilter || undefined);
      setArticles(data.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) return <div className="loading">Loading Articles...</div>;

  return (
    <div className="articles-management">
      <h1>📰 Articles Management</h1>

      <div className="filter-section">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="draft">Drafts</option>
          <option value="published">Published</option>
        </select>
      </div>

      <div className="articles-grid">
        {articles.map((article) => (
          <div key={article._id} className="article-card">
            <div className="article-header">
              <h3>{article.title}</h3>
              <span className={`status-badge ${article.status}`}>
                {article.status.toUpperCase()}
              </span>
            </div>

            <p className="article-author">
              By: {article.author.firstName} {article.author.lastName}
            </p>

            <div className="article-stats">
              <span>👁️ {article.views} views</span>
              <span>❤️ {article.likes.length} likes</span>
              <span>💬 {article.comments.length} comments</span>
            </div>

            <div className="article-actions">
              <button
                onClick={() => handleFeatureArticle(article._id)}
                className="btn-feature"
              >
                ⭐ Feature
              </button>
              <button className="btn-edit">✏️ Edit</button>
              <button className="btn-delete">🗑️ Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArticlesManagement;
```

---

## 📊 8. Activity Logs

```typescript
// src/pages/Admin/ActivityLogs.tsx
import { useEffect, useState } from 'react';
import { getActivityLogs, getUserLoginHistory } from '../../services/adminService';
import './ActivityLogs.css';

const ActivityLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [logins, setLogins] = useState<any[]>([]);
  const [tab, setTab] = useState<'activity' | 'logins'>('activity');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        if (tab === 'activity') {
          const data = await getActivityLogs();
          setLogs(data.data);
        } else {
          const data = await getUserLoginHistory();
          setLogins(data.data);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchLogs();
  }, [tab]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="activity-logs">
      <h1>📋 Activity Logs</h1>

      <div className="tabs">
        <button
          className={`tab ${tab === 'activity' ? 'active' : ''}`}
          onClick={() => setTab('activity')}
        >
          All Activities
        </button>
        <button
          className={`tab ${tab === 'logins' ? 'active' : ''}`}
          onClick={() => setTab('logins')}
        >
          Login History
        </button>
      </div>

      <div className="logs-table">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Email</th>
              <th>Action</th>
              <th>Details</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {(tab === 'activity' ? logs : logins).map((log, i) => (
              <tr key={i}>
                <td>{formatDate(log.createdAt)}</td>
                <td>
                  {log.userId?.firstName} {log.userId?.lastName}
                </td>
                <td>{log.userEmail}</td>
                <td>
                  <span className="action-badge">{log.action}</span>
                </td>
                <td className="details">
                  {JSON.stringify(log.details).substring(0, 50)}...
                </td>
                <td>{log.ipAddress}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ActivityLogs;
```

---

## 🛣️ 9. Admin Routes Setup

```typescript
// src/pages/Admin/AdminLayout.tsx
import { useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { isAdminLoggedIn, logoutAdmin } from '../../services/adminAuthService';
import './AdminLayout.css';

const AdminLayout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      navigate('/admin/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    logoutAdmin();
    navigate('/admin/login');
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <h2>🏆 SportX</h2>
          <p>Admin Panel</p>
        </div>

        <nav className="sidebar-nav">
          <Link to="/admin/dashboard" className="nav-link">
            📊 Dashboard
          </Link>
          <Link to="/admin/settings" className="nav-link">
            ⚙️ Settings
          </Link>
          <Link to="/admin/articles" className="nav-link">
            📰 Articles
          </Link>
          <Link to="/admin/users" className="nav-link">
            👥 Users
          </Link>
          <Link to="/admin/logs" className="nav-link">
            📋 Activity Logs
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
};

export default AdminLayout;
```

**Router Configuration:**
```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './pages/Admin/AdminLayout';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Admin/Dashboard';
import Settings from './pages/Admin/Settings';
import ArticlesManagement from './pages/Admin/ArticlesManagement';
import UsersManagement from './pages/Admin/UsersManagement';
import ActivityLogs from './pages/Admin/ActivityLogs';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="articles" element={<ArticlesManagement />} />
          <Route path="users" element={<UsersManagement />} />
          <Route path="logs" element={<ActivityLogs />} />
        </Route>

        <Route path="/" element={<Navigate to="/admin/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

## 🎨 10. CSS Styles

```css
/* src/styles/admin.css */
.admin-layout {
  display: flex;
  height: 100vh;
}

.admin-sidebar {
  width: 280px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  overflow-y: auto;
}

.sidebar-header {
  margin-bottom: 30px;
  text-align: center;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 24px;
}

.sidebar-header p {
  margin: 5px 0 0 0;
  opacity: 0.8;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.nav-link {
  display: block;
  padding: 12px 15px;
  border-radius: 8px;
  color: white;
  text-decoration: none;
  transition: background 0.3s;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.2);
}

.nav-link.active {
  background: rgba(0, 0, 0, 0.2);
}

.logout-btn {
  width: 100%;
  padding: 12px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: auto;
  transition: background 0.3s;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.admin-main {
  flex: 1;
  overflow-y: auto;
  padding: 30px;
  background: #f5f7fa;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.stat-card h3 {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.stat-card .value {
  font-size: 32px;
  font-weight: bold;
  color: #333;
  margin: 10px 0 0 0;
}

table {
  width: 100%;
  background: white;
  border-collapse: collapse;
  border-radius: 10px;
  overflow: hidden;
}

table thead {
  background: #f8f9fa;
}

table th {
  padding: 15px;
  text-align: left;
  font-weight: 600;
  color: #666;
}

table td {
  padding: 15px;
  border-top: 1px solid #eee;
}

table tr:hover {
  background: #fafafa;
}

.btn-primary {
  background: #667eea;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: opacity 0.3s;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-danger {
  background: #e74c3c;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.btn-danger:hover {
  opacity: 0.9;
}
```

---

## ✅ Quick Setup Checklist

```bash
# 1. Install packages
npm install axios react-router-dom

# 2. Create .env
REACT_APP_API_URL=http://localhost:3000/api/v1

# 3. Create file structure
src/
├── pages/
│   ├── AdminLogin.tsx
│   └── Admin/
│       ├── AdminLayout.tsx
│       ├── Dashboard.tsx
│       ├── Settings.tsx
│       ├── ArticlesManagement.tsx
│       ├── UsersManagement.tsx
│       └── ActivityLogs.tsx
├── services/
│   ├── adminAuthService.ts
│   └── adminService.ts
└── components/
    └── Admin/
        └── StatCard.tsx

# 4. Run
npm start
```

---

## 🔗 Backend API Summary

```
GET /api/v1/admin/dashboard - Dashboard stats
GET /api/v1/admin/settings - Get settings
PATCH /api/v1/admin/settings - Update settings
GET /api/v1/admin/articles - All articles
PATCH /api/v1/admin/articles/:id/feature - Feature article
GET /api/v1/admin/users - All users
PATCH /api/v1/admin/users/:id/block - Block user
GET /api/v1/admin/logs - Activity logs
GET /api/v1/admin/user-logins - Login history
GET /api/v1/admin/analytics - Analytics
```

---

**Last Updated:** November 24, 2025  
**Status:** ✅ Ready to Implement
