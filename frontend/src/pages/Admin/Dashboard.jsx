import { useEffect, useState } from 'react';
import { getDashboardStats, getAnalytics } from '../../services/adminService';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [s, a] = await Promise.all([
          getDashboardStats(),
          getAnalytics(),
        ]);
        setStats(s);
        setAnalytics(a);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard">
      <h1>📊 Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>👥 Total Users</h3>
          <p className="value">{analytics?.totalUsers || 0}</p>
        </div>
        <div className="stat-card">
          <h3>📰 Articles</h3>
          <p className="value">{stats?.totalArticles || 0}</p>
        </div>
        <div className="stat-card">
          <h3>✅ Published</h3>
          <p className="value">{stats?.publishedArticles || 0}</p>
        </div>
        <div className="stat-card">
          <h3>📝 Drafts</h3>
          <p className="value">{stats?.draftArticles || 0}</p>
        </div>
      </div>

      <div className="analytics">
        <h2>User Breakdown by Role</h2>
        <div className="roles">
          {analytics?.usersByRole?.map((role) => (
            <div key={role.role} className="role-item">
              <span>{role.role}</span>
              <strong>{role.count}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
