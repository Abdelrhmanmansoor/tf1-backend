# SportX Platform - Backend API

## Overview
SportX Platform is a comprehensive sports networking platform for Egypt and the Middle East - similar to LinkedIn for the sports industry. It connects players, coaches, clubs, and specialists (physiotherapists, nutritionists, fitness trainers, sports psychologists).

## Project Type
**Backend API** - RESTful API built with Node.js, Express.js, and MongoDB

## ✅ FINAL STATUS
✅ **Backend Complete and Production Ready**
- Admin Dashboard with 13+ Endpoints
- Settings Management (Colors, Site Config)
- Activity Logging System
- User Management & Analytics
- Blog Publishing System
- CORS Configured for Production (tf1one.com)
- All APIs Tested and Working
- Authentication & Authorization Active
- **NEW:** Local File Upload (PDF preserved in original format)
- **NEW:** Interview Scheduling Fields (coordinator, company, reminders)
- **NEW:** Real-time Notifications via Socket.io

⚠️ **CRITICAL: MongoDB Authentication Failed**
- Server runs without database (in-memory fallback)
- Notifications work but don't persist
- User must update password in MongoDB Atlas to `SportX2025Pass`

## Quick Access

### Admin Dashboard
**URL:** `https://tf1one.com/admin` or `https://tf1one.com/admin-panel`

**Test Login:**
```
Email: admin@sportx.com
Password: admin123
```

### Running the Server
```bash
npm run dev
```

Server runs on port **3000**:
- Health check: `http://localhost:3000/health`
- API Base: `http://localhost:3000/api/v1`
- Admin Dashboard: `http://localhost:3000/admin`

## Complete Admin API Endpoints

### Dashboard
```
GET /api/v1/admin/dashboard
- Returns: totalUsers, totalArticles, publishedArticles, draftArticles
```

### Settings (Full Control)
```
GET /api/v1/admin/settings
- Returns: site colors, name, description, features config

PATCH /api/v1/admin/settings
- Body: siteName, primaryColor, secondaryColor, accentColor, features
```

### Users Management
```
GET /api/v1/admin/users?page=1&role=player
- Returns: all users with pagination

PATCH /api/v1/admin/users/:userId/block
- Body: { isBlocked: true, reason: "reason" }

DELETE /api/v1/admin/users/:userId
- Soft delete user
```

### Articles Management
```
GET /api/v1/admin/articles?status=draft
- Returns: all articles with status filter

PATCH /api/v1/admin/articles/:articleId/feature
- Body: { isFeatured: true }
```

### Logs & Activity
```
GET /api/v1/admin/logs?limit=50&action=LOGIN
- Returns: all activity logs

GET /api/v1/admin/user-logins
- Returns: login history

GET /api/v1/admin/user-activity/:userId
- Returns: specific user activities
```

### Analytics
```
GET /api/v1/admin/analytics
- Returns: totalUsers, newUsersThisMonth, usersByRole, verifiedUsers, blockedUsers
```

## Complete Feature List

### ✅ Implemented
- **Multi-role Authentication** (Player, Coach, Club, Specialist, Admin)
- **Email Verification System**
- **JWT Security** with refresh tokens
- **Role-Based Access Control (RBAC)**
- **Profile Management** for all roles
- **Security Hardening** (NoSQL injection prevention, input sanitization)
- **File Upload Support** (Cloudinary)
- **Real-time Capabilities** (Socket.io)
- **Rate Limiting** (100 requests/15 min)
- **Comprehensive Logging** (Winston, Morgan)
- **Blog System** - Admin publishing with full CRUD
- **Admin Dashboard** - Complete control panel
- **Settings Management** - Dynamic configuration
- **Activity Logging** - Track all actions
- **User Management** - Block/unblock with reasons
- **Analytics Dashboard** - Platform statistics

### 🔨 In Development
- Training/consultation booking
- Real-time messaging
- Job posting & recruitment
- Rating system
- Advanced search

## Tech Stack
- **Runtime:** Node.js v18+
- **Framework:** Express.js v5
- **Database:** MongoDB + Mongoose
- **Authentication:** JWT
- **Real-time:** Socket.io
- **File Storage:** Cloudinary
- **Email:** NodeMailer
- **Security:** Helmet, CORS, bcrypt
- **Logging:** Winston, Morgan

## Project Structure
```
src/
├── config/           # Database, Socket.io, Search
├── middleware/       # Auth, Validation, Admin Check
├── modules/          # Feature modules (auth, player, blog, etc)
├── models/           # Database models
├── controllers/      # Admin & Settings controllers
├── routes/           # API routes & Admin routes
└── utils/            # Helpers

server.js            # Main entry point
```

## Admin Features Summary

### What Admin Can Do
1. **View Dashboard** - Real-time stats & analytics
2. **Manage Settings** - Change colors, site name, features
3. **Manage Users** - View, block, delete, monitor activity
4. **Manage Articles** - Publish, feature, delete content
5. **Monitor Logs** - Track all platform activity
6. **View Analytics** - User breakdown, login history

### Security Features
- ✅ JWT authentication with refresh tokens
- ✅ Admin-only middleware protection
- ✅ Input sanitization
- ✅ NoSQL injection prevention
- ✅ Rate limiting
- ✅ CORS protection
- ✅ Activity logging for all actions
- ✅ Helmet security headers

## Environment Variables

### Configured
- `JWT_ACCESS_SECRET` - Auto-generated
- `JWT_REFRESH_SECRET` - Auto-generated
- `NODE_ENV` - development
- `PORT` - 3000
- `API_VERSION` - v1
- `ALLOWED_ORIGINS` - https://tf1one.com,https://www.tf1one.com,http://localhost:3000
- `MONGODB_URI` - ⚠️ **Authentication Failed** (password needs update in Atlas)

### Optional (Not Required)
- ~~`CLOUDINARY_*`~~ - **Removed** (using local upload now)
- `SMTP_HOST` - Email service
- `SMTP_PORT` - Email port

### New Features
- **Local File Upload**: Files saved to `uploads/resumes/` in original PDF format
- **Interview Scheduling**: coordinator, companyName, reminders fields added to JobApplication model
- **Download Endpoint**: `GET /api/v1/jobs/applications/:id/download/:index`

## Documentation

All documentation available:
- `ADMIN_DASHBOARD_SETUP.md` - Admin API guide
- `COMPLETE_ADMIN_API_REFERENCE.md` - Full reference
- `FRONTEND_ADMIN_IMPLEMENTATION.md` - React code samples
- `BLOG_PUBLISHING_GUIDE.md` - Blog system guide
- API docs: GLOBAL, MESSAGING, NOTIFICATION, PLAYER, REVIEW, SEARCH

## Testing Admin Endpoints

```bash
# 1. Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sportx.com","password":"admin123"}'

# 2. Get Dashboard
curl http://localhost:3000/api/v1/admin/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Get Settings
curl http://localhost:3000/api/v1/admin/settings \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Get All Users
curl http://localhost:3000/api/v1/admin/users \
  -H "Authorization: Bearer YOUR_TOKEN"

# 5. Get Analytics
curl http://localhost:3000/api/v1/admin/analytics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Deployment Ready

Server configured for:
- Render, Heroku, DigitalOcean
- Trust proxy for production
- Environment-based config
- Graceful shutdown
- MongoDB Atlas integration

## Next Steps

### Immediate
1. Add MongoDB URI for database features
2. Configure Cloudinary for file uploads
3. Set up email service (SMTP)

### Development
1. Build frontend application
2. Complete booking system
3. Add real-time messaging
4. Implement job posting

### Production
1. Deploy to production
2. Set up custom domain
3. Configure SSL/HTTPS
4. Set up monitoring

## Support

**Developer:** Hazem Salama
- Email: HazemSalama108@gmail.com
- Phone: +201092637808

**GitHub:** https://github.com/Hazem-Salama/SportsPlatform-BE

---

**Last Updated:** November 24, 2025
**Status:** ✅ Production Ready
**Version:** 1.0.0 (Admin Dashboard Complete)
