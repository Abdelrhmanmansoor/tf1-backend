import { useState, useEffect } from 'react';
import { matchService } from '../config/api';
import { useAuth } from '../context/AuthContext';

const MatchFriends = ({ matchId }) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('in-match'); // in-match, all-friends, suggestions

  useEffect(() => {
    if (user && matchId) {
      fetchFriendsData();
    }
  }, [matchId, activeTab, user]);

  const fetchFriendsData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'in-match') {
        const response = await matchService.getFriendsInMatch(matchId);
        setFriends(response.data.data?.friends || []);
      } else if (activeTab === 'all-friends') {
        const response = await matchService.getFriends();
        setFriends(response.data.data?.friends || []);
      } else if (activeTab === 'suggestions') {
        const response = await matchService.getFriendSuggestions();
        setFriends(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching friends:', err);
      setError(err.response?.data?.message || 'خطأ في تحميل الأصدقاء');
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async (friendId) => {
    try {
      await matchService.sendFriendRequest(friendId);
      alert('تم إرسال طلب صداقة بنجاح');
      fetchFriendsData();
    } catch (err) {
      alert(err.response?.data?.message || 'خطأ في إرسال طلب الصداقة');
    }
  };

  return (
    <div className="match-friends-panel">
      <h3>الأصدقاء</h3>

      <div className="friends-tabs">
        <button
          className={`tab-btn ${activeTab === 'in-match' ? 'active' : ''}`}
          onClick={() => setActiveTab('in-match')}
        >
          👥 في المباراة ({friends.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'all-friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('all-friends')}
        >
          👨‍👩‍👧‍👦 كل الأصدقاء
        </button>
        <button
          className={`tab-btn ${activeTab === 'suggestions' ? 'active' : ''}`}
          onClick={() => setActiveTab('suggestions')}
        >
          ⭐ مقترحات
        </button>
      </div>

      <div className="friends-list">
        {loading && <p className="loading">جاري التحميل...</p>}
        {error && <p className="error-message">❌ {error}</p>}
        
        {!loading && friends.length === 0 && (
          <p className="empty-state">
            {activeTab === 'in-match' && 'لا توجد أصدقاء في هذه المباراة'}
            {activeTab === 'all-friends' && 'لا توجد أصدقاء بعد'}
            {activeTab === 'suggestions' && 'لا توجد مقترحات متاحة'}
          </p>
        )}

        {!loading && friends.map(friend => (
          <div key={friend._id || friend.id} className="friend-card">
            <div className="friend-info">
              {friend.profilePicture && (
                <img src={friend.profilePicture} alt={friend.name} className="friend-avatar" />
              )}
              <div className="friend-details">
                <h4>{friend.name}</h4>
                {friend.position && <p className="position">{friend.position}</p>}
                {friend.level && <p className="level">المستوى: {friend.level}</p>}
              </div>
            </div>

            <div className="friend-actions">
              {activeTab === 'suggestions' && (
                <button
                  className="add-friend-btn"
                  onClick={() => handleSendFriendRequest(friend._id || friend.id)}
                >
                  + إضافة
                </button>
              )}
              {activeTab === 'in-match' && (
                <span className="in-match-badge">✓ في المباراة</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .match-friends-panel {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          max-height: 600px;
          overflow-y: auto;
        }

        .match-friends-panel h3 {
          margin: 0 0 15px 0;
          color: #333;
          font-size: 18px;
          font-weight: 600;
        }

        .friends-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 15px;
          border-bottom: 2px solid #eee;
        }

        .tab-btn {
          padding: 8px 12px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 14px;
          color: #666;
          border-bottom: 3px solid transparent;
          transition: all 0.3s;
        }

        .tab-btn.active {
          color: #1976d2;
          border-bottom-color: #1976d2;
          font-weight: 600;
        }

        .tab-btn:hover {
          color: #1976d2;
        }

        .friends-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .friend-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #f9f9f9;
          border-radius: 8px;
          border-left: 4px solid #1976d2;
        }

        .friend-info {
          display: flex;
          gap: 12px;
          flex: 1;
        }

        .friend-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          background: #ddd;
        }

        .friend-details {
          flex: 1;
        }

        .friend-details h4 {
          margin: 0 0 4px 0;
          font-size: 14px;
          color: #333;
          font-weight: 600;
        }

        .friend-details p {
          margin: 0;
          font-size: 12px;
          color: #999;
        }

        .friend-actions {
          display: flex;
          gap: 8px;
        }

        .add-friend-btn {
          padding: 6px 12px;
          background: #1976d2;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: background 0.3s;
        }

        .add-friend-btn:hover {
          background: #1565c0;
        }

        .in-match-badge {
          padding: 6px 12px;
          background: #4caf50;
          color: white;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }

        .loading,
        .empty-state {
          text-align: center;
          padding: 20px;
          color: #999;
          font-size: 14px;
        }

        .error-message {
          text-align: center;
          padding: 12px;
          background: #fee;
          color: #c33;
          border-radius: 6px;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
};

export default MatchFriends;
