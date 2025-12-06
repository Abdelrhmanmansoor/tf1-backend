import { useState, useEffect } from 'react';
import { matchService } from '../config/api';
import { useAuth } from '../context/AuthContext';
import CascadingSelect from '../components/CascadingSelect';

const MatchHub = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [regionsData, setRegionsData] = useState(null);
  const [filters, setFilters] = useState({
    region: '',
    city: '',
    neighborhood: '',
    sport: '',
    level: '',
    maxPlayers: '',
    date: ''
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMatch, setNewMatch] = useState({
    name: '',
    sport: 'football',
    region: '',
    city: '',
    neighborhood: '',
    date: '',
    time: '',
    level: 'amateur',
    maxPlayers: 10,
    description: '',
    venue: ''
  });

  useEffect(() => {
    fetchRegionsData();
    fetchMatches();
  }, []);

  const fetchRegionsData = async () => {
    try {
      const response = await matchService.getRegions();
      setRegionsData(response.data.data);
    } catch (error) {
      console.error('Error fetching regions:', error);
    }
  };

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v)
      );
      const response = await matchService.getMatches(activeFilters);
      setMatches(response.data.data.matches || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMatch = async (matchId) => {
    if (!user) {
      alert('يجب تسجيل الدخول أولاً');
      return;
    }
    try {
      await matchService.joinMatch(matchId);
      alert('✔ تم تسجيلك في المباراة بنجاح!');
      fetchMatches();
    } catch (error) {
      alert(error.response?.data?.message || 'خطأ في الانضمام');
    }
  };

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    try {
      await matchService.createMatch(newMatch);
      alert('تم إنشاء المباراة بنجاح!');
      setShowCreateModal(false);
      fetchMatches();
    } catch (error) {
      alert(error.response?.data?.message || 'خطأ في إنشاء المباراة');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    fetchMatches();
  };

  const clearFilters = () => {
    setFilters({
      region: '',
      city: '',
      neighborhood: '',
      sport: '',
      level: '',
      maxPlayers: '',
      date: ''
    });
  };

  return (
    <div className="match-hub">
      <div className="match-hub-header">
        <h1>🎯 انضم لمباراة</h1>
        <p>ابحث عن مباراة في منطقتك وانضم الآن</p>
        {user && (
          <button 
            className="create-match-btn"
            onClick={() => setShowCreateModal(true)}
          >
            + إنشاء مباراة جديدة
          </button>
        )}
      </div>

      <div className="filters-section">
        <h3>🔍 فلاتر البحث</h3>
        
        {regionsData && (
          <CascadingSelect
            regions={regionsData.regions}
            neighborhoods={regionsData.neighborhoods}
            selectedRegion={filters.region}
            selectedCity={filters.city}
            selectedNeighborhood={filters.neighborhood}
            onRegionChange={(v) => handleFilterChange('region', v)}
            onCityChange={(v) => handleFilterChange('city', v)}
            onNeighborhoodChange={(v) => handleFilterChange('neighborhood', v)}
          />
        )}

        <div className="filter-row">
          <div className="select-group">
            <label>نوع الرياضة</label>
            <select 
              value={filters.sport}
              onChange={(e) => handleFilterChange('sport', e.target.value)}
            >
              <option value="">الكل</option>
              {regionsData?.sports?.map(sport => (
                <option key={sport} value={sport}>{sport}</option>
              ))}
            </select>
          </div>

          <div className="select-group">
            <label>المستوى</label>
            <select 
              value={filters.level}
              onChange={(e) => handleFilterChange('level', e.target.value)}
            >
              <option value="">الكل</option>
              {regionsData?.levels?.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          <div className="select-group">
            <label>عدد اللاعبين</label>
            <select 
              value={filters.maxPlayers}
              onChange={(e) => handleFilterChange('maxPlayers', e.target.value)}
            >
              <option value="">الكل</option>
              <option value="5">5 لاعبين</option>
              <option value="7">7 لاعبين</option>
              <option value="11">11 لاعب</option>
            </select>
          </div>

          <div className="select-group">
            <label>التاريخ</label>
            <input 
              type="date"
              value={filters.date}
              onChange={(e) => handleFilterChange('date', e.target.value)}
            />
          </div>
        </div>

        <div className="filter-actions">
          <button className="apply-btn" onClick={applyFilters}>
            تطبيق الفلاتر
          </button>
          <button className="clear-btn" onClick={clearFilters}>
            مسح الفلاتر
          </button>
        </div>
      </div>

      <div className="matches-list">
        {loading ? (
          <div className="loading">جاري التحميل...</div>
        ) : matches.length === 0 ? (
          <div className="no-matches">
            <p>لا توجد مباريات متاحة حالياً</p>
            {user && (
              <button onClick={() => setShowCreateModal(true)}>
                كن أول من ينشئ مباراة!
              </button>
            )}
          </div>
        ) : (
          matches.map(match => (
            <div key={match._id} className="match-card">
              <div className="match-header">
                <h3>{match.name}</h3>
                <span className={`status ${match.status}`}>
                  {match.status === 'full' ? 'مكتملة' : 'متاحة'}
                </span>
              </div>
              
              <div className="match-details">
                <p>📍 {match.city} - {match.neighborhood}</p>
                <p>📅 {new Date(match.date).toLocaleDateString('ar-SA')} - {match.time}</p>
                <p>⚽ {match.sport} | 🎯 {match.level}</p>
                <p>👥 {match.registeredCount}/{match.maxPlayers} لاعب</p>
              </div>

              <div className="match-actions">
                <button 
                  className="join-btn"
                  onClick={() => handleJoinMatch(match._id)}
                  disabled={match.status === 'full' || 
                    match.registeredPlayers?.some(p => p.playerId === user?._id)}
                >
                  {match.registeredPlayers?.some(p => p.playerId === user?._id) 
                    ? '✓ مسجل' 
                    : 'انضم الآن'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>إنشاء مباراة جديدة</h2>
            <form onSubmit={handleCreateMatch}>
              <div className="form-group">
                <label>اسم المباراة</label>
                <input
                  type="text"
                  value={newMatch.name}
                  onChange={(e) => setNewMatch({...newMatch, name: e.target.value})}
                  placeholder="مثال: مباراة ودية في الرياض"
                  required
                />
              </div>

              {regionsData && (
                <CascadingSelect
                  regions={regionsData.regions}
                  neighborhoods={regionsData.neighborhoods}
                  selectedRegion={newMatch.region}
                  selectedCity={newMatch.city}
                  selectedNeighborhood={newMatch.neighborhood}
                  onRegionChange={(v) => setNewMatch({...newMatch, region: v, city: '', neighborhood: ''})}
                  onCityChange={(v) => setNewMatch({...newMatch, city: v, neighborhood: ''})}
                  onNeighborhoodChange={(v) => setNewMatch({...newMatch, neighborhood: v})}
                />
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>نوع الرياضة</label>
                  <select
                    value={newMatch.sport}
                    onChange={(e) => setNewMatch({...newMatch, sport: e.target.value})}
                  >
                    {regionsData?.sports?.map(sport => (
                      <option key={sport} value={sport}>{sport}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>المستوى</label>
                  <select
                    value={newMatch.level}
                    onChange={(e) => setNewMatch({...newMatch, level: e.target.value})}
                  >
                    {regionsData?.levels?.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>التاريخ</label>
                  <input
                    type="date"
                    value={newMatch.date}
                    onChange={(e) => setNewMatch({...newMatch, date: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>الوقت</label>
                  <input
                    type="time"
                    value={newMatch.time}
                    onChange={(e) => setNewMatch({...newMatch, time: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>عدد اللاعبين</label>
                <select
                  value={newMatch.maxPlayers}
                  onChange={(e) => setNewMatch({...newMatch, maxPlayers: parseInt(e.target.value)})}
                >
                  <option value={5}>5 لاعبين</option>
                  <option value={7}>7 لاعبين</option>
                  <option value={10}>10 لاعبين</option>
                  <option value={11}>11 لاعب</option>
                  <option value={14}>14 لاعب</option>
                  <option value={22}>22 لاعب</option>
                </select>
              </div>

              <div className="form-group">
                <label>الملعب/المكان</label>
                <input
                  type="text"
                  value={newMatch.venue}
                  onChange={(e) => setNewMatch({...newMatch, venue: e.target.value})}
                  placeholder="اسم الملعب أو العنوان"
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="submit-btn">
                  إنشاء المباراة
                </button>
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowCreateModal(false)}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchHub;
