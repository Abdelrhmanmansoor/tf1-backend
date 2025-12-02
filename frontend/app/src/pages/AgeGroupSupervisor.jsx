import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../config/api';
import '../styles/AgeGroupSupervisor.css';

const AgeGroupSupervisor = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
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
    fetchGroups();
  }, []);

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
    
    console.log('🔍 Form Data:', formData);
    
    if (!formData.name || !formData.nameAr) {
      setError('جميع الحقول مطلوبة');
      return;
    }

    if (formData.ageRange.min >= formData.ageRange.max) {
      setError('يجب أن تكون السن الصغرى أقل من السن الكبرى');
      return;
    }

    try {
      console.log('📤 Sending request...');
      const endpoint = editingId 
        ? `/age-group-supervisor/groups/${editingId}` 
        : '/age-group-supervisor/groups';
      
      const method = editingId ? 'patch' : 'post';
      console.log(`${method.toUpperCase()} ${endpoint}`, formData);
      
      let response;
      if (editingId) {
        response = await api.patch(endpoint, formData);
        setSuccess('✅ تم تحديث الفئة العمرية بنجاح');
      } else {
        response = await api.post(endpoint, formData);
        setSuccess('✅ تم إضافة الفئة العمرية بنجاح');
      }
      
      console.log('✅ Response:', response.data);
      
      setFormData({ name: '', nameAr: '', ageRange: { min: 8, max: 10 }, status: 'active' });
      setEditingId(null);
      setShowForm(false);
      setError('');
      
      setTimeout(() => {
        setSuccess('');
        fetchGroups();
      }, 2000);
    } catch (err) {
      console.error('❌ Error:', err);
      console.error('Response:', err.response?.data);
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
        <h1>👥 إدارة الفئات العمرية</h1>
        <p>أضف وأدر الفئات العمرية للاعبين</p>
      </div>

      {error && <div className="error-message">❌ {error}</div>}
      {success && <div className="success-message">✅ {success}</div>}

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
              <button type="submit" className="btn-save" disabled={!formData.name || !formData.nameAr}>
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
    </div>
  );
};

export default AgeGroupSupervisor;
