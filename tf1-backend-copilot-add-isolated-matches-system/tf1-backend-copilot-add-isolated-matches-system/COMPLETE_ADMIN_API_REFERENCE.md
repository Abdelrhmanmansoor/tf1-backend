# 🔐 Complete Admin API Reference

**Base URL:** `http://localhost:3000/api/v1`

⚠️ **All admin endpoints require:**
- `Authorization: Bearer {adminToken}`
- User role must be `admin`

---

## 📋 Authentication

### 1️⃣ Admin Login (Create Session)
```
POST /auth/login
```

**Body:**
```json
{
  "email": "admin@sportx.com",
  "password": "adminPassword123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "507f191e810c19729de860ea",
      "email": "admin@sportx.com",
      "firstName": "Admin",
      "lastName": "User",
      "role": "admin"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Save Token:** `localStorage.setItem('adminToken', token);`

---

## 📊 Dashboard

### 2️⃣ Get Dashboard Statistics
```
GET /admin/dashboard
```

**Headers:**
```
Authorization: Bearer {adminToken}
```

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

## ⚙️ Settings Management

### 3️⃣ Get All Settings
```
GET /admin/settings
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "siteName": "SportX Platform",
    "siteDescription": "Professional Sports Network",
    "theme": {
      "primaryColor": "#1a73e8",
      "secondaryColor": "#34a853",
      "accentColor": "#fbbc04",
      "backgroundColor": "#ffffff",
      "textColor": "#202124"
    },
    "maintenanceMode": false,
    "features": {
      "registrationEnabled": true,
      "emailVerificationRequired": true,
      "blogEnabled": true,
      "jobsEnabled": true,
      "messagingEnabled": true
    }
  }
}
```

### 4️⃣ Update Settings
```
PATCH /admin/settings
```

**Body (All Optional):**
```json
{
  "siteName": "SportX v2",
  "primaryColor": "#FF5733",
  "secondaryColor": "#33FF57",
  "accentColor": "#3357FF",
  "backgroundColor": "#F5F5F5",
  "textColor": "#1A1A1A",
  "maintenanceMode": false,
  "registrationEnabled": true,
  "blogEnabled": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "data": { /* updated settings object */ }
}
```

---

## 📰 Articles Management

### 5️⃣ Get All Articles (Admin View)
```
GET /admin/articles?page=1&limit=20&status=published
```

**Query Parameters:**
- `page` (number) - Page number, default: 1
- `limit` (number) - Per page, default: 20
- `status` (string) - `draft` | `published` | `archived`

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
      "title": "Training Tips for Athletes",
      "content": "Article content...",
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
      "isFeatured": false,
      "createdAt": "2025-11-24T10:30:00Z"
    }
  ]
}
```

### 6️⃣ Feature/Unfeature Article
```
PATCH /admin/articles/{articleId}/feature
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
  "data": { /* article object */ }
}
```

---

## 👥 Users Management

### 7️⃣ Get All Users
```
GET /admin/users?page=1&limit=20&role=player
```

**Query Parameters:**
- `page` (number) - Default: 1
- `limit` (number) - Default: 20
- `role` (string) - `player` | `coach` | `club` | `specialist` | `admin`

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
      "isBlocked": false,
      "createdAt": "2025-11-20T10:00:00Z",
      "lastLogin": "2025-11-24T15:30:00Z"
    }
  ]
}
```

### 8️⃣ Delete User (Soft Delete)
```
DELETE /admin/users/{userId}
```

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

⚠️ Cannot delete admin accounts

### 9️⃣ Block/Unblock User
```
PATCH /admin/users/{userId}/block
```

**Body:**
```json
{
  "isBlocked": true,
  "reason": "Violating community guidelines"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User blocked successfully"
}
```

### 🔟 Get User Activity
```
GET /admin/user-activity/{userId}?limit=50
```

**Query Parameters:**
- `limit` (number) - Default: 50

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "507f191e810c19729de860ea",
    "name": "Ahmed Mohamed",
    "email": "ahmed@example.com",
    "role": "player",
    "createdAt": "2025-11-20T10:00:00Z",
    "lastLogin": "2025-11-24T15:30:00Z"
  },
  "activities": [
    {
      "_id": "607f1f77bcf86cd799439011",
      "action": "LOGIN",
      "details": { },
      "ipAddress": "192.168.1.1",
      "createdAt": "2025-11-24T15:30:00Z"
    }
  ]
}
```

---

## 📋 Activity Logs

### 1️⃣1️⃣ Get Activity Logs
```
GET /admin/logs?limit=50&action=LOGIN
```

**Query Parameters:**
- `limit` (number) - Default: 50
- `action` (string) - Optional filter:
  - `LOGIN` | `LOGOUT` | `REGISTER`
  - `PROFILE_UPDATE` | `PASSWORD_CHANGE`
  - `USER_BLOCKED` | `USER_UNBLOCKED`
  - `SETTINGS_UPDATE` | `ARTICLE_CREATE`
  - `FILE_UPLOAD` | `ADMIN_ACTION`
- `userId` (string) - Optional, filter by specific user
- `startDate` (string) - Optional, ISO date
- `endDate` (string) - Optional, ISO date

**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "_id": "607f1f77bcf86cd799439011",
      "userId": {
        "_id": "507f191e810c19729de860ea",
        "firstName": "Ahmed",
        "lastName": "Mohamed",
        "email": "ahmed@example.com"
      },
      "userEmail": "ahmed@example.com",
      "action": "LOGIN",
      "details": { },
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "status": "success",
      "createdAt": "2025-11-24T15:30:00Z"
    }
  ]
}
```

### 1️⃣2️⃣ Get Login History
```
GET /admin/user-logins?limit=100
```

**Query Parameters:**
- `limit` (number) - Default: 100
- `userId` (string) - Optional

**Response:**
```json
{
  "success": true,
  "count": 25,
  "data": [
    {
      "_id": "607f1f77bcf86cd799439011",
      "userId": {
        "_id": "507f191e810c19729de860ea",
        "firstName": "Ahmed",
        "lastName": "Mohamed",
        "email": "ahmed@example.com",
        "role": "player"
      },
      "userEmail": "ahmed@example.com",
      "action": "LOGIN",
      "ipAddress": "192.168.1.1",
      "createdAt": "2025-11-24T15:30:00Z"
    }
  ]
}
```

---

## 📊 Analytics

### 1️⃣3️⃣ Get System Analytics
```
GET /admin/analytics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 450,
    "newUsersThisMonth": 45,
    "loginLogsThisMonth": 1250,
    "verifiedUsers": 380,
    "blockedUsers": 12,
    "usersByRole": [
      { "role": "player", "count": 250 },
      { "role": "coach", "count": 100 },
      { "role": "club", "count": 80 },
      { "role": "specialist", "count": 20 },
      { "role": "admin", "count": 1 }
    ]
  }
}
```

---

## 🧪 Quick Testing

```bash
# 1. Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sportx.com","password":"admin123"}'

# Save the token and use it in other requests

# 2. Get Dashboard
curl http://localhost:3000/api/v1/admin/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Get Settings
curl http://localhost:3000/api/v1/admin/settings \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Get Users
curl "http://localhost:3000/api/v1/admin/users?role=player" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 5. Get Articles
curl "http://localhost:3000/api/v1/admin/articles?status=draft" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 6. Get Logs
curl "http://localhost:3000/api/v1/admin/logs?limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 7. Get Analytics
curl http://localhost:3000/api/v1/admin/analytics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ⚠️ Error Responses

### Not Admin
```json
{
  "success": false,
  "message": "Admin access required. Only administrators can perform this action.",
  "code": "ADMIN_ONLY"
}
```

### Not Authenticated
```json
{
  "success": false,
  "message": "Authentication required",
  "code": "NOT_AUTHENTICATED"
}
```

### Not Found
```json
{
  "success": false,
  "message": "User/Article not found",
  "code": "NOT_FOUND"
}
```

### Invalid Data
```json
{
  "success": false,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR"
}
```

---

## 📱 Frontend Implementation Checklist

- [ ] Create `AdminLogin` component with email/password form
- [ ] Store token in localStorage after login
- [ ] Create `AdminDashboard` component displaying stats
- [ ] Create `SettingsManager` component with color pickers
- [ ] Create `UsersManager` component with role filter and block option
- [ ] Create `ArticlesManager` component with status filter
- [ ] Create `ActivityLogsViewer` component with date filter
- [ ] Create `AdminLayout` with sidebar navigation
- [ ] Setup router with `/admin/*` routes
- [ ] Add protected routes middleware (check admin token)

---

## 🔐 Security Tips

1. **Always validate user role on backend** ✅ Done with `isAdmin` middleware
2. **Store token securely** - Use localStorage or sessionStorage
3. **Send token in Authorization header** - Not in URL or body
4. **Handle token expiration** - Implement refresh token logic
5. **Validate all inputs on backend** - Never trust client data
6. **Log all admin actions** - Already implemented with ActivityLog
7. **Rate limit admin routes** - Recommended: 1000 requests per 15 minutes

---

## 📝 Common Use Cases

### Use Case 1: Admin Changes Site Colors
```javascript
const updateColors = async () => {
  const response = await fetch('/api/v1/admin/settings', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      primaryColor: '#FF5733',
      secondaryColor: '#33FF57'
    })
  });
  const data = await response.json();
  console.log('Colors updated!');
};
```

### Use Case 2: Monitor User Activity
```javascript
const checkUserActivity = async (userId) => {
  const response = await fetch(`/api/v1/admin/user-activity/${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  console.log('User activities:', data.activities);
};
```

### Use Case 3: Block Misbehaving User
```javascript
const blockUser = async (userId, reason) => {
  const response = await fetch(`/api/v1/admin/users/${userId}/block`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ isBlocked: true, reason })
  });
  console.log('User blocked!');
};
```

---

**Last Updated:** November 24, 2025  
**Status:** ✅ Production Ready  
**Version:** 1.0.0
