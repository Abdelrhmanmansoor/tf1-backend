# Admin Backend API - Complete Commands Reference

## Authentication Required ✅
All endpoints require **JWT token** in header:
```
Authorization: Bearer YOUR_TOKEN
```

### Get Admin Token (Test Login)
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@sportx.com",
    "password": "admin123"
  }'
```

---

## 1️⃣ GET /api/v1/admin/dashboard
**Get admin dashboard statistics**

### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "totalArticles": 25,
    "publishedArticles": 20,
    "draftArticles": 5,
    "timestamp": "2025-11-24T18:00:00.000Z"
  }
}
```

### Test Command:
```bash
curl -X GET http://localhost:3000/api/v1/admin/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 2️⃣ GET /api/v1/admin/users
**Get all users with pagination and filters**

### Query Parameters:
- `page` (default: 1) - Page number
- `limit` (default: 20) - Items per page
- `role` (optional) - Filter by role: player, coach, club, specialist

### Response (200 OK):
```json
{
  "success": true,
  "count": 20,
  "total": 150,
  "page": 1,
  "pages": 8,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "email": "player@example.com",
      "firstName": "Ahmed",
      "lastName": "Hassan",
      "role": "player",
      "isBlocked": false,
      "blockReason": null,
      "isVerified": true,
      "createdAt": "2025-11-20T10:00:00.000Z"
    }
  ]
}
```

### Test Commands:
```bash
# Get all users
curl -X GET http://localhost:3000/api/v1/admin/users \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get by role
curl -X GET "http://localhost:3000/api/v1/admin/users?role=player&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 3️⃣ PATCH /api/v1/admin/users/:id/block
**Block or unblock a user**

### URL Parameters:
- `id` - User MongoDB ID

### Request Body:
```json
{
  "isBlocked": true,
  "reason": "Inappropriate behavior on platform"
}
```

### Response (200 OK):
```json
{
  "success": true,
  "message": "User blocked successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "player@example.com",
    "isBlocked": true,
    "blockReason": "Inappropriate behavior on platform"
  }
}
```

### Test Commands:
```bash
# Block a user
curl -X PATCH http://localhost:3000/api/v1/admin/users/507f1f77bcf86cd799439011/block \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "isBlocked": true,
    "reason": "Inappropriate behavior"
  }'

# Unblock a user
curl -X PATCH http://localhost:3000/api/v1/admin/users/507f1f77bcf86cd799439011/block \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "isBlocked": false,
    "reason": null
  }'
```

---

## 4️⃣ PATCH /api/v1/admin/settings
**Update system settings (colors, site name, maintenance mode)**

### Request Body:
```json
{
  "siteName": "SportX Platform",
  "siteDescription": "LinkedIn for Sports in Middle East",
  "primaryColor": "#FF6B35",
  "secondaryColor": "#004E89",
  "accentColor": "#F7B801",
  "backgroundColor": "#FFFFFF",
  "textColor": "#333333",
  "maintenanceMode": false,
  "maintenanceMessage": "Server maintenance in progress",
  "registrationEnabled": true,
  "emailVerificationRequired": true,
  "supportEmail": "support@sportx.com"
}
```

### Response (200 OK):
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "siteName": "SportX Platform",
    "theme": {
      "primaryColor": "#FF6B35",
      "secondaryColor": "#004E89",
      "accentColor": "#F7B801"
    },
    "maintenanceMode": false,
    "features": {
      "registrationEnabled": true,
      "emailVerificationRequired": true
    }
  }
}
```

### Test Command:
```bash
curl -X PATCH http://localhost:3000/api/v1/admin/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "siteName": "SportX Platform",
    "primaryColor": "#FF6B35",
    "maintenanceMode": false
  }'
```

---

## 5️⃣ GET /api/v1/admin/settings
**Get current system settings**

### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "siteName": "SportX Platform",
    "theme": {
      "primaryColor": "#FF6B35",
      "secondaryColor": "#004E89"
    },
    "maintenanceMode": false,
    "features": {
      "registrationEnabled": true
    }
  }
}
```

### Test Command:
```bash
curl -X GET http://localhost:3000/api/v1/admin/settings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 6️⃣ GET /api/v1/admin/logs
**Get activity logs (all admin and user actions)**

### Query Parameters:
- `limit` (default: 50) - Number of logs to return
- `action` (optional) - Filter by action (LOGIN, USER_BLOCKED, SETTINGS_UPDATE, etc)
- `userId` (optional) - Filter by specific user
- `startDate` (optional) - ISO date format
- `endDate` (optional) - ISO date format

### Response (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "userId": "507f1f77bcf86cd799439011",
      "userEmail": "admin@sportx.com",
      "action": "USER_BLOCKED",
      "details": {
        "reason": "Inappropriate behavior"
      },
      "ipAddress": "192.168.1.1",
      "createdAt": "2025-11-24T18:00:00.000Z"
    }
  ]
}
```

### Test Command:
```bash
curl -X GET "http://localhost:3000/api/v1/admin/logs?limit=50&action=LOGIN" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 7️⃣ GET /api/v1/admin/analytics
**Get platform analytics (user statistics)**

### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "newUsersThisMonth": 25,
    "usersByRole": {
      "player": 80,
      "coach": 30,
      "club": 25,
      "specialist": 15
    },
    "verifiedUsers": 120,
    "blockedUsers": 5,
    "activeUsers": 145
  }
}
```

### Test Command:
```bash
curl -X GET http://localhost:3000/api/v1/admin/analytics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 8️⃣ DELETE /api/v1/admin/users/:id
**Soft delete a user (cannot delete admins)**

### Response (200 OK):
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

### Test Command:
```bash
curl -X DELETE http://localhost:3000/api/v1/admin/users/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 9️⃣ GET /api/v1/admin/user-activity/:userId
**Get specific user activity history**

### Response (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "action": "LOGIN",
      "timestamp": "2025-11-24T18:00:00.000Z",
      "ipAddress": "192.168.1.1"
    }
  ]
}
```

---

## 🔟 GET /api/v1/admin/user-logins
**Get user login history (all users)**

### Response (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "userId": "507f1f77bcf86cd799439011",
      "email": "player@example.com",
      "lastLogin": "2025-11-24T18:00:00.000Z",
      "loginCount": 50
    }
  ]
}
```

---

## Error Responses

### 401 Unauthorized (Missing/Invalid Token)
```json
{
  "success": false,
  "message": "Authentication required",
  "code": "AUTH_REQUIRED"
}
```

### 403 Forbidden (Not Admin)
```json
{
  "success": false,
  "message": "Admin access required",
  "code": "ADMIN_ONLY"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "User not found",
  "code": "NOT_FOUND"
}
```

### 500 Server Error
```json
{
  "success": false,
  "message": "Error processing request",
  "code": "ERROR_CODE"
}
```

---

## Testing with Postman

**Base URL:** `http://localhost:3000`

**Headers (All requests):**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

---

## Implementation Notes

- ✅ All endpoints require **JWT authentication**
- ✅ All endpoints require **admin role**
- ✅ Admin can manage users but **cannot delete or block other admins**
- ✅ All actions are **logged** in activity logs
- ✅ **Soft deletes** are used (isDeleted flag)
- ✅ **Pagination** supported on users endpoint
- ✅ **Filtering** supported for logs and users

---

**Last Updated:** November 24, 2025  
**API Version:** v1  
**Status:** ✅ Production Ready
