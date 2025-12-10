import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../config/api';
import '../styles/AgeGroupSupervisor.css';

const AgeGroupSupervisor = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('groups');
  const [groups, setGroups] = useState([]);
  const [players, setPlayers] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [matches, setMatches] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    ageRange: { min: 8, max: 10 },
    status: 'active'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // If user is age-group-supervisor, fetch only their assigned groups
    // If user is club/admin, fetch all groups
    if (user?.role === 'age-group-supervisor') {
      fetchMyAssignedGroups();
    } else {
      fetchGroups();
    }
    fetchDashboard();
  }, [user]);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/age-group-supervisor/dashboard');
      setDashboardStats(res.data.data?.stats || {});
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    }
  };

  const fetchMyAssignedGroups = async () => {
    try {
      setLoading(true);
      console.log('📥 Fetching my assigned age groups...');
      const response = await api.get('/age-group-supervisor/my-groups');
      console.log('✅ My groups fetched:', response.data);
      setGroups(response.data.data?.groups || []);
      setError('');
    } catch (err) {
      console.error('❌ Error fetching my groups:', err);
      // Fallback to all groups if endpoint fails
      fetchGroups();
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/age-group-supervisor/players');
      setPlayers(res.data.data?.players || res.data.players || []);
    } catch (err) {
      console.error('Error fetching players:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const res = await api.get('/age-group-supervisor/schedule');
      setSchedule(res.data.data?.sessions || res.data.sessions || []);
    } catch (err) {
      console.error('Error fetching schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const res = await api.get('/age-group-supervisor/matches');
      setMatches(res.data.data?.matches || res.data.matches || []);
    } catch (err) {
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      setLoading(true);
      console.log('📥 Fetching age groups...');
      const response = await api.get('/age-group-supervisor/groups');
      console.log('✅ Groups fetched:', response.data);
      setGroups(response.data.data.groups || []);
      setError('');
    } catch (err) {
      console.error('❌ Error fetching groups:', err);
      console.error('Response:', err.response?.data);
      setError('خطأ في جلب الفئات العمرية');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🔍 SUBMIT TRIGGERED - Form Data:', formData);
    console.log('Name:', formData.name, 'NameAr:', formData.nameAr);
    console.log('Age Range:', formData.ageRange);
    
    // Validate
    if (!formData.name || !formData.nameAr) {
      console.warn('❌ Validation failed: Missing name or nameAr');
      setError('جميع الحقول مطلوبة');
      return;
    }

    if (formData.ageRange.min >= formData.ageRange.max) {
      console.warn('❌ Validation failed: min >= max');
      setError('يجب أن تكون السن الصغرى أقل من السن الكبرى');
      return;
    }

    try {
      console.log('📤 Sending request to backend...');
      
      const payload = {
        name: formData.name.trim(),
        nameAr: formData.nameAr.trim(),
        ageRange: {
          min: parseInt(formData.ageRange.min),
          max: parseInt(formData.ageRange.max)
        },
        status: formData.status
      };
      
      console.log('Payload:', payload);
      
      let response;
      if (editingId) {
        console.log(`PATCH /age-group-supervisor/groups/${editingId}`);
        response = await api.patch(`/age-group-supervisor/groups/${editingId}`, payload);
        setSuccess('✅ تم تحديث الفئة العمرية بنجاح');
      } else {
        console.log('POST /age-group-supervisor/groups');
        response = await api.post('/age-group-supervisor/groups', payload);
        setSuccess('✅ تم إضافة الفئة العمرية بنجاح');
      }
      
      console.log('✅ SUCCESS Response:', response.data);
      
      setFormData({ name: '', nameAr: '', ageRange: { min: 8, max: 10 }, status: 'active' });
      setEditingId(null);
      setShowForm(false);
      setError('');
      
      setTimeout(() => {
        setSuccess('');
        fetchGroups();
      }, 2000);
    } catch (err) {
      console.error('❌ ERROR Details:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        config: err.config?.url
      });
      
      const errorMsg = err.response?.data?.error?.messageAr || 
                      err.response?.data?.message ||
                      err.message || 
                      'حدث خطأ ما';
      setError(errorMsg);
      setSuccess('');
    }
  };

  const handleEdit = (group) => {
    setFormData({
      name: group.name,
      nameAr: group.nameAr,
      ageRange: group.ageRange,
      status: group.status
    });
    setEditingId(group.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الفئة العمرية؟')) {
      try {
        await api.delete(`/age-group-supervisor/groups/${id}`);
        setSuccess('تم حذف الفئة العمرية بنجاح');
        setTimeout(() => {
          setSuccess('');
          fetchGroups();
        }, 1500);
      } catch (err) {
        setError('خطأ في حذف الفئة العمرية');
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', nameAr: '', ageRange: { min: 8, max: 10 }, status: 'active' });
    setError('');
  };

  if (!user || !['age-group-supervisor', 'admin', 'administrator', 'club'].includes(user.role)) {
    return (
      <div className="age-group-container">
        <div className="error-message">
          ❌ ليس لديك صلاحية للوصول إلى هذه الصفحة
        </div>
      </div>
    );
  }

  return (
    <div className="age-group-container">
      <div className="age-group-header">
        <h1>👶 لوحة تحكم مشرف الفئات العمرية</h1>
        <p>إدارة الفئات العمرية واللاعبين والجداول والمباريات</p>
      </div>

      {/* Dashboard Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <div style={{ background: '#e3f2fd', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem' }}>👶</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1976D2' }}>{dashboardStats.totalAgeGroups || 0}</div>
          <div style={{ color: '#666' }}>الفئات العمرية</div>
        </div>
        <div style={{ background: '#e8f5e9', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem' }}>⚽</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#388E3C' }}>{dashboardStats.totalPlayers || 0}</div>
          <div style={{ color: '#666' }}>اللاعبين</div>
        </div>
        <div style={{ background: '#fff3e0', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem' }}>📅</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#F57C00' }}>{dashboardStats.activeTrainings || 0}</div>
          <div style={{ color: '#666' }}>التدريبات</div>
        </div>
        <div style={{ background: '#fce4ec', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem' }}>🏆</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#C2185B' }}>{dashboardStats.upcomingMatches || 0}</div>
          <div style={{ color: '#666' }}>المباريات</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setActiveTab('groups')}
          style={{ 
            padding: '10px 20px', 
            borderRadius: '8px', 
            border: 'none', 
            background: activeTab === 'groups' ? '#2196F3' : '#e0e0e0',
            color: activeTab === 'groups' ? 'white' : '#333',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          👶 الفئات العمرية
        </button>
        <button 
          onClick={() => { setActiveTab('players'); fetchPlayers(); }}
          style={{ 
            padding: '10px 20px', 
            borderRadius: '8px', 
            border: 'none', 
            background: activeTab === 'players' ? '#2196F3' : '#e0e0e0',
            color: activeTab === 'players' ? 'white' : '#333',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          ⚽ اللاعبين
        </button>
        <button 
          onClick={() => { setActiveTab('schedule'); fetchSchedule(); }}
          style={{ 
            padding: '10px 20px', 
            borderRadius: '8px', 
            border: 'none', 
            background: activeTab === 'schedule' ? '#2196F3' : '#e0e0e0',
            color: activeTab === 'schedule' ? 'white' : '#333',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          📅 الجداول
        </button>
        <button 
          onClick={() => { setActiveTab('matches'); fetchMatches(); }}
          style={{ 
            padding: '10px 20px', 
            borderRadius: '8px', 
            border: 'none', 
            background: activeTab === 'matches' ? '#2196F3' : '#e0e0e0',
            color: activeTab === 'matches' ? 'white' : '#333',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          🏆 المباريات
        </button>
      </div>

      {error && <div className="error-message">❌ {error}</div>}
      {success && <div className="success-message">✅ {success}</div>}

      {/* Groups Tab */}
      {activeTab === 'groups' && (
        <>
          {!showForm && (
            <button className="btn-add" onClick={() => setShowForm(true)}>
              ➕ إضافة فئة عمرية جديدة
            </button>
          )}

      {showForm && (
        <div className="form-container">
          <h2>{editingId ? 'تعديل' : 'إضافة'} فئة عمرية</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>الاسم (إنجليزي) *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: Under 10"
                required
              />
            </div>

            <div className="form-group">
              <label>الاسم (عربي) *</label>
              <input
                type="text"
                value={formData.nameAr}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                placeholder="مثال: تحت 10 سنوات"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>السن الصغرى *</label>
                <input
                  type="number"
                  min="4"
                  max="25"
                  value={formData.ageRange.min}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    ageRange: { ...formData.ageRange, min: parseInt(e.target.value) }
                  })}
                  required
                />
              </div>

              <div className="form-group">
                <label>السن الكبرى *</label>
                <input
                  type="number"
                  min="4"
                  max="30"
                  value={formData.ageRange.max}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    ageRange: { ...formData.ageRange, max: parseInt(e.target.value) }
                  })}
                  required
                />
              </div>

              <div className="form-group">
                <label>الحالة *</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">نشطة</option>
                  <option value="inactive">معطلة</option>
                </select>
              </div>
            </div>

            <div className="form-buttons">
              <button 
                type="submit" 
                className="btn-save"
                onClick={(e) => {
                  console.log('🔘 BUTTON CLICKED');
                  e.preventDefault();
                  handleSubmit(e);
                }}
              >
                💾 حفظ
              </button>
              <button type="button" className="btn-cancel" onClick={handleCancel}>❌ إلغاء</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading">جاري التحميل...</div>
      ) : (
        <div className="groups-list">
          <h2>الفئات العمرية ({groups.length})</h2>
          {groups.length === 0 ? (
            <div className="empty-state">لا توجد فئات عمرية حالياً</div>
          ) : (
            <div className="groups-grid">
              {groups.map(group => (
                <div key={group.id} className={`group-card status-${group.status}`}>
                  <div className="group-header">
                    <h3>{group.name}</h3>
                    <span className="group-name-ar">{group.nameAr}</span>
                  </div>

                  <div className="group-info">
                    <div className="info-item">
                      <span className="label">العمر:</span>
                      <span className="value">{group.ageRange.min} - {group.ageRange.max} سنة</span>
                    </div>
                    <div className="info-item">
                      <span className="label">عدد اللاعبين:</span>
                      <span className="value">{group.playersCount || 0}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">المدرب:</span>
                      <span className="value">{group.coachName || 'لم يتم تعيينه'}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">الحالة:</span>
                      <span className={`status-badge status-${group.status}`}>
                        {group.status === 'active' ? '✅ نشطة' : '❌ معطلة'}
                      </span>
                    </div>
                  </div>

                  <div className="group-actions">
                    <button 
                      className="btn-edit"
                      onClick={() => handleEdit(group)}
                    >
                      ✏️ تعديل
                    </button>
                    <button 
                      className="btn-delete"
                      onClick={() => handleDelete(group.id)}
                    >
                      🗑️ حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
        </>
      )}

      {/* Players Tab */}
      {activeTab === 'players' && (
        <div className="players-tab">
          <h3>⚽ اللاعبين المسجلين</h3>
          {loading ? (
            <div className="loading">جاري التحميل...</div>
          ) : players.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>لا يوجد لاعبين مسجلين</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
              {players.map((player, idx) => (
                <div key={player._id || idx} style={{ background: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                  <h4>⚽ {player.firstName} {player.lastName}</h4>
                  <p style={{ color: '#666' }}>📧 {player.email}</p>
                  <p style={{ color: '#666' }}>🎂 العمر: {player.age || 'غير محدد'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="schedule-tab">
          <h3>📅 جداول التدريب</h3>
          {loading ? (
            <div className="loading">جاري التحميل...</div>
          ) : schedule.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>لا توجد جداول تدريب</p>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {schedule.map((session, idx) => (
                <div key={session._id || idx} style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', borderRight: '4px solid #2196F3' }}>
                  <h4>📅 {session.title || 'تدريب'}</h4>
                  <p>📆 التاريخ: {session.date ? new Date(session.date).toLocaleDateString('ar-SA') : 'غير محدد'}</p>
                  <p>⏰ الوقت: {session.time || 'غير محدد'}</p>
                  <p>📍 المكان: {session.location || 'غير محدد'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Matches Tab */}
      {activeTab === 'matches' && (
        <div className="matches-tab">
          <h3>🏆 المباريات</h3>
          {loading ? (
            <div className="loading">جاري التحميل...</div>
          ) : matches.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>لا توجد مباريات</p>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {matches.map((match, idx) => (
                <div key={match._id || idx} style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', borderRight: '4px solid #4CAF50' }}>
                  <h4>🏆 {match.title || `${match.homeTeam} vs ${match.awayTeam}`}</h4>
                  <p>📆 التاريخ: {match.date ? new Date(match.date).toLocaleDateString('ar-SA') : 'غير محدد'}</p>
                  <p>📍 المكان: {match.location || 'غير محدد'}</p>
                  <p>📊 الحالة: {match.status || 'مجدولة'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AgeGroupSupervisor;
