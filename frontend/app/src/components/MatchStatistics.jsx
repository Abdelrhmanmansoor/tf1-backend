import { useState, useEffect } from 'react';
import { matchService } from '../config/api';
import { useAuth } from '../context/AuthContext';

const MatchStatistics = ({ matchId, userId }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('personal'); // personal, match, leaderboard

  useEffect(() => {
    if (user) {
      fetchStatistics();
    }
  }, [activeTab, user, matchId, userId]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'personal') {
        const response = await matchService.getUserAnalytics(userId || user?._id);
        setStats(response.data.data);
      } else if (activeTab === 'match' && matchId) {
        const response = await matchService.getMatchStats(matchId);
        setStats(response.data.data);
      } else if (activeTab === 'leaderboard') {
        const response = await matchService.getLeaderboard('points');
        setLeaderboard(response.data.data?.leaderboard || []);
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
      
      // تحقق إذا كان الخطأ من عدم وجود authorization
      if (err.response?.status === 401) {
        // Unauthorized - توكن منتهي الصلاحية
        // دع الـ interceptor يتعامل مع refresh
        setError('انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول');
      } else if (err.response?.status === 403) {
        setError('لا تملك صلاحية للوصول إلى هذه البيانات');
      } else if (!err.response) {
        // Network error
        setError('خطأ في الاتصال، يرجى التحقق من الإنترنت');
      } else {
        setError(err.response?.data?.message || 'خطأ في تحميل الإحصائيات');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderPersonalStats = () => {
    if (!stats) return null;

    return (
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">إجمالي المباريات</span>
          <span className="stat-value">{stats.totalMatches || 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">الانتصارات</span>
          <span className="stat-value" style={{ color: '#4caf50' }}>
            {stats.totalWins || 0}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">نسبة الفوز</span>
          <span className="stat-value">
            {stats.totalMatches ? ((stats.totalWins || 0) / stats.totalMatches * 100).toFixed(1) : 0}%
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">النقاط</span>
          <span className="stat-value" style={{ color: '#1976d2' }}>
            {stats.totalPoints || 0}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">متوسط الأداء</span>
          <span className="stat-value">
            {stats.averagePerformance?.toFixed(1) || '0.0'}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">آخر مباراة</span>
          <span className="stat-value">
            {stats.lastMatchDate 
              ? new Date(stats.lastMatchDate).toLocaleDateString('ar-SA')
              : 'لم يلعب بعد'}
          </span>
        </div>
      </div>
    );
  };

  const renderMatchStats = () => {
    if (!stats || !matchId) return null;

    return (
      <div className="match-stats-container">
        <div className="match-stat-section">
          <h4>📊 إحصائيات المباراة</h4>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">إجمالي اللاعبين</span>
              <span className="stat-value">{stats.totalPlayers || 0}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">المدة المتبقية</span>
              <span className="stat-value">
                {stats.timeRemaining ? `${stats.timeRemaining} دقيقة` : 'قريباً'}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">الحالة</span>
              <span className="stat-value" style={{ 
                color: stats.status === 'ongoing' ? '#ff9800' : '#4caf50' 
              }}>
                {stats.status === 'ongoing' ? 'جارية' : 'مكتملة'}
              </span>
            </div>
          </div>
        </div>

        {stats.topPerformers && (
          <div className="match-stat-section">
            <h4>🏆 أفضل الأداء</h4>
            <ul className="performers-list">
              {stats.topPerformers.slice(0, 3).map((player, idx) => (
                <li key={player._id || idx} className="performer-item">
                  <span className="rank">#{idx + 1}</span>
                  <span className="player-name">{player.name}</span>
                  <span className="player-score">{player.score || 0} نقطة</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderLeaderboard = () => {
    return (
      <div className="leaderboard-container">
        <h4>🏅 الترتيب</h4>
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>اللاعب</th>
              <th>النقاط</th>
              <th>المباريات</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.slice(0, 10).map((player, idx) => (
              <tr key={player._id || idx} className={user?._id === player._id ? 'current-user' : ''}>
                <td className="rank">{idx + 1}</td>
                <td className="player-name">{player.name}</td>
                <td className="score">{player.totalPoints || 0}</td>
                <td className="matches">{player.totalMatches || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="match-statistics-panel">
      <h3>الإحصائيات</h3>

      <div className="stats-tabs">
        <button
          className={`tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          👤 الإحصائيات الشخصية
        </button>
        {matchId && (
          <button
            className={`tab-btn ${activeTab === 'match' ? 'active' : ''}`}
            onClick={() => setActiveTab('match')}
          >
            ⚽ إحصائيات المباراة
          </button>
        )}
        <button
          className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          🏆 الترتيب
        </button>
      </div>

      <div className="stats-content">
        {loading && <p className="loading">جاري تحميل الإحصائيات...</p>}
        {error && <p className="error-message">❌ {error}</p>}

        {!loading && activeTab === 'personal' && renderPersonalStats()}
        {!loading && activeTab === 'match' && renderMatchStats()}
        {!loading && activeTab === 'leaderboard' && renderLeaderboard()}
      </div>

      <style jsx>{`
        .match-statistics-panel {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          max-height: 600px;
          overflow-y: auto;
        }

        .match-statistics-panel h3 {
          margin: 0 0 15px 0;
          color: #333;
          font-size: 18px;
          font-weight: 600;
        }

        .stats-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 15px;
          border-bottom: 2px solid #eee;
          flex-wrap: wrap;
        }

        .tab-btn {
          padding: 8px 12px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 13px;
          color: #666;
          border-bottom: 3px solid transparent;
          transition: all 0.3s;
          white-space: nowrap;
        }

        .tab-btn.active {
          color: #1976d2;
          border-bottom-color: #1976d2;
          font-weight: 600;
        }

        .stats-content {
          margin-top: 15px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 10px;
        }

        .stat-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 15px;
          background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
          border-radius: 8px;
          border: 1px solid #ddd;
        }

        .stat-label {
          font-size: 11px;
          color: #999;
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 8px;
          text-align: center;
        }

        .stat-value {
          font-size: 20px;
          font-weight: 700;
          color: #333;
        }

        .match-stats-container {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .match-stat-section h4 {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 14px;
          font-weight: 600;
        }

        .performers-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .performer-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: #f9f9f9;
          border-radius: 6px;
          border-left: 3px solid #1976d2;
        }

        .rank {
          font-weight: 700;
          color: #1976d2;
          min-width: 30px;
        }

        .player-name {
          flex: 1;
          font-weight: 600;
          color: #333;
        }

        .player-score {
          font-size: 13px;
          color: #666;
          font-weight: 600;
        }

        .leaderboard-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .leaderboard-table thead {
          background: #f5f5f5;
          border-bottom: 2px solid #ddd;
        }

        .leaderboard-table th {
          padding: 10px;
          text-align: right;
          font-weight: 600;
          color: #666;
        }

        .leaderboard-table td {
          padding: 10px;
          border-bottom: 1px solid #eee;
        }

        .leaderboard-table tr.current-user {
          background: #e3f2fd;
          font-weight: 600;
        }

        .leaderboard-table .rank {
          color: #1976d2;
          font-weight: 700;
        }

        .loading,
        .error-message {
          text-align: center;
          padding: 20px;
          color: #999;
          font-size: 14px;
        }

        .error-message {
          background: #fee;
          color: #c33;
          border-radius: 6px;
        }
      `}</style>
    </div>
  );
};

export default MatchStatistics;
