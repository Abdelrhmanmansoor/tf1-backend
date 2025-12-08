# 🔐 Admin Dashboard API Guide

## 🔒 Authentication
جميع endpoints تحتاج:
- **Token:** من `/api/v1/auth/login` (يجب أن يكون user role = 'admin')
- **Header:** `Authorization: Bearer {token}`

⚠️ **أدمن فقط يقدر يستخدم هذه الـ endpoints**

---

## 📊 Dashboard Endpoints

### 1️⃣ Get Dashboard Stats
```
GET /api/v1/admin/dashboard
```

**Authentication:** ✅ Required (Admin Only)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 450,
    "totalArticles": 89,
    "publishedArticles": 67,
    "draftArticles": 22,
    "timestamp": "2025-11-24T18:30:00Z"
  }
}
```

---

## 📰 Articles Management

### 2️⃣ Get All Articles (Admin View)
```
GET /api/v1/admin/articles?page=1&limit=20&status=published
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Per page (default: 20)
- `status` - Filter by status: `draft`, `published`, `archived`

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 45,
  "page": 1,
  "pages": 5,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "Article Title",
      "status": "published",
      "isPublished": true,
      "author": {
        "_id": "507f191e810c19729de860ea",
        "firstName": "Ahmed",
        "lastName": "Mohamed",
        "email": "ahmed@example.com"
      },
      "views": 324,
      "likes": 45,
      "comments": 12,
      "createdAt": "2025-11-24T10:30:00Z",
      "updatedAt": "2025-11-24T12:00:00Z"
    }
  ]
}
```

### 3️⃣ Feature Article
```
PATCH /api/v1/admin/articles/{articleId}/feature
```

**Body:**
```json
{
  "isFeatured": true,
  "featuredUntil": "2025-12-24T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Article featured successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "isFeatured": true,
    "featuredUntil": "2025-12-24T23:59:59Z"
  }
}
```

---

## 👥 Users Management

### 4️⃣ Get All Users
```
GET /api/v1/admin/users?page=1&limit=20&role=player
```

**Query Parameters:**
- `page` - Page number
- `limit` - Per page
- `role` - Filter by role: `player`, `coach`, `club`, `specialist`, `admin`

**Response:**
```json
{
  "success": true,
  "count": 20,
  "total": 450,
  "page": 1,
  "pages": 23,
  "data": [
    {
      "_id": "507f191e810c19729de860ea",
      "firstName": "Ahmed",
      "lastName": "Mohamed",
      "email": "ahmed@example.com",
      "role": "player",
      "isVerified": true,
      "createdAt": "2025-11-20T10:00:00Z"
    }
  ]
}
```

### 5️⃣ Delete User
```
DELETE /api/v1/admin/users/{userId}
```

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

⚠️ **Cannot delete admin accounts**

---

## 🛠️ Frontend Implementation Commands

### Installation
```bash
npm install axios
```

### 1. Admin Authentication
```typescript
// src/services/authService.ts
const loginAsAdmin = async (email: string, password: string) => {
  const response = await axios.post('/api/v1/auth/login', {
    email,
    password,
  });
  
  if (response.data.data.user.role !== 'admin') {
    throw new Error('Admin access required');
  }
  
  localStorage.setItem('token', response.data.data.accessToken);
  return response.data.data;
};
```

### 2. Dashboard Component
```typescript
// src/pages/Admin/Dashboard.tsx
import { useEffect, useState } from 'react';
import axios from 'axios';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          '/api/v1/admin/dashboard',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setStats(response.data.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="dashboard">
      <h1>Admin Dashboard</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Users</h3>
          <p className="stat-value">{stats?.totalUsers}</p>
        </div>
        <div className="stat-card">
          <h3>Total Articles</h3>
          <p className="stat-value">{stats?.totalArticles}</p>
        </div>
        <div className="stat-card">
          <h3>Published</h3>
          <p className="stat-value">{stats?.publishedArticles}</p>
        </div>
        <div className="stat-card">
          <h3>Drafts</h3>
          <p className="stat-value">{stats?.draftArticles}</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
```

### 3. Articles Management
```typescript
// src/pages/Admin/ArticlesManager.tsx
const ArticlesManager = () => {
  const [articles, setArticles] = useState([]);
  const [page, setPage] = useState(1);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await axios.get(
          `/api/v1/admin/articles?page=${page}&limit=20`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setArticles(response.data.data);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchArticles();
  }, [page, token]);

  // Feature article
  const handleFeatureArticle = async (articleId: string) => {
    try {
      await axios.patch(
        `/api/v1/admin/articles/${articleId}/feature`,
        {
          isFeatured: true,
          featuredUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert('Article featured!');
    } catch (error) {
      console.error('Error featuring article:', error);
    }
  };

  // Delete article
  const handleDeleteArticle = async (articleId: string) => {
    try {
      await axios.delete(
        `/api/v1/blog/articles/${articleId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert('Article deleted!');
      setArticles(articles.filter(a => a._id !== articleId));
    } catch (error) {
      console.error('Error deleting article:', error);
    }
  };

  return (
    <div className="articles-manager">
      <h2>Articles Management</h2>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Views</th>
            <th>Author</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {articles.map(article => (
            <tr key={article._id}>
              <td>{article.title}</td>
              <td>{article.status}</td>
              <td>{article.views}</td>
              <td>{article.author.firstName} {article.author.lastName}</td>
              <td>
                <button onClick={() => handleFeatureArticle(article._id)}>
                  Feature
                </button>
                <button onClick={() => handleDeleteArticle(article._id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ArticlesManager;
```

### 4. Users Management
```typescript
// src/pages/Admin/UsersManager.tsx
const UsersManager = () => {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const query = roleFilter ? `?role=${roleFilter}` : '';
        const response = await axios.get(
          `/api/v1/admin/users${query}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setUsers(response.data.data);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchUsers();
  }, [roleFilter, token]);

  // Delete user
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await axios.delete(
        `/api/v1/admin/users/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUsers(users.filter(u => u._id !== userId));
      alert('User deleted!');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="users-manager">
      <h2>Users Management</h2>
      <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
        <option value="">All Roles</option>
        <option value="player">Players</option>
        <option value="coach">Coaches</option>
        <option value="club">Clubs</option>
        <option value="specialist">Specialists</option>
      </select>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Verified</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user._id}>
              <td>{user.firstName} {user.lastName}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>{user.isVerified ? '✅' : '❌'}</td>
              <td>
                <button onClick={() => handleDeleteUser(user._id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UsersManager;
```

### 5. Create Article (Admin)
```typescript
// src/pages/Admin/CreateArticle.tsx
const CreateArticle = () => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'other',
    tags: [],
  });
  const [file, setFile] = useState(null);
  const token = localStorage.getItem('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formDataToSend = new FormData();
    formDataToSend.append('title', formData.title);
    formDataToSend.append('content', formData.content);
    formDataToSend.append('category', formData.category);
    formDataToSend.append('tags', JSON.stringify(formData.tags));
    if (file) formDataToSend.append('coverImage', file);

    try {
      const response = await axios.post(
        '/api/v1/blog/articles',
        formDataToSend,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      alert(`Article created! ID: ${response.data.data._id}`);
      
      // Now publish it
      await axios.post(
        `/api/v1/blog/articles/${response.data.data._id}/publish`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      alert('Article published!');
    } catch (error) {
      console.error('Error:', error);
      alert('Error creating/publishing article');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="create-article-form">
      <input
        type="text"
        placeholder="Article Title"
        value={formData.title}
        onChange={e => setFormData({ ...formData, title: e.target.value })}
        required
      />
      <textarea
        placeholder="Article Content (min 100 chars)"
        value={formData.content}
        onChange={e => setFormData({ ...formData, content: e.target.value })}
        required
        minLength={100}
      />
      <select
        value={formData.category}
        onChange={e => setFormData({ ...formData, category: e.target.value })}
      >
        <option value="other">Select Category</option>
        <option value="sports_news">Sports News</option>
        <option value="training_tips">Training Tips</option>
        <option value="nutrition">Nutrition</option>
        <option value="injury_prevention">Injury Prevention</option>
      </select>
      <input
        type="file"
        accept="image/*"
        onChange={e => setFile(e.target.files?.[0] || null)}
      />
      <button type="submit">Create & Publish Article</button>
    </form>
  );
};

export default CreateArticle;
```

---

## 🔗 Main Admin Layout
```typescript
// src/pages/Admin/AdminLayout.tsx
import { Link, Outlet } from 'react-router-dom';
import './AdminLayout.css';

const AdminLayout = () => {
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <h1>Admin Panel</h1>
        <nav>
          <Link to="/admin/dashboard">📊 Dashboard</Link>
          <Link to="/admin/articles">📰 Articles</Link>
          <Link to="/admin/create-article">✍️ Create Article</Link>
          <Link to="/admin/users">👥 Users</Link>
        </nav>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </aside>
      
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
```

---

## ⚠️ Error Codes

| Code | Meaning |
|------|---------|
| `ADMIN_ONLY` | User is not admin |
| `NOT_FOUND` | Resource not found |
| `FETCH_ERROR` | Server error |
| `UPDATE_ERROR` | Update failed |
| `DELETE_ERROR` | Delete failed |

---

## 📱 Quick Test Commands

```bash
# Login as admin
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Get dashboard stats
curl http://localhost:3000/api/v1/admin/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get all articles
curl "http://localhost:3000/api/v1/admin/articles?status=draft" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get all users
curl "http://localhost:3000/api/v1/admin/users?role=player" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

**Last Updated:** November 24, 2025  
**Status:** ✅ Ready to Use
