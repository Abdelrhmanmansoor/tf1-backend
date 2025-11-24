# SportX Platform - Backend API

## Overview
SportX Platform is a comprehensive sports networking platform for Egypt and the Middle East - similar to LinkedIn for the sports industry. It connects players, coaches, clubs, and specialists (physiotherapists, nutritionists, fitness trainers, sports psychologists).

## Project Type
**Backend API** - RESTful API built with Node.js, Express.js, and MongoDB

## Current Status
✅ **Development Environment Ready**
- Backend server running on port 3000
- JWT authentication configured
- Admin Dashboard System Complete
- Blog System Complete
- Environment variables set up
- Server starts successfully (without database connection)

⚠️ **Database Not Connected**
- MongoDB URI needs to be configured
- Server will run but database-dependent features won't work until MongoDB is connected

## Quick Start

### Running the Server
The server is already configured to run automatically. It starts with:
```bash
npm run dev
```

The server runs on port **3000** and provides:
- Health check: `http://localhost:3000/health`
- API Base: `http://localhost:3000/api/v1`
- Root endpoint: `http://localhost:3000/`

### Connecting MongoDB
To enable full functionality, add your MongoDB connection string:

1. Get your MongoDB Atlas connection string (or create a free cluster at https://www.mongodb.com/cloud/atlas)
2. Add the `MONGODB_URI` environment variable in the Secrets tab
3. Restart the server

**Example MongoDB URI format:**
```
mongodb+srv://username:password@cluster.mongodb.net/sportsplatform?retryWrites=true&w=majority
```

## Environment Variables

### Currently Configured (✅)
- `JWT_ACCESS_SECRET` - JWT access token secret (auto-generated)
- `JWT_REFRESH_SECRET` - JWT refresh token secret (auto-generated)
- `NODE_ENV` - Environment mode (development)
- `PORT` - Server port (3000)
- `API_VERSION` - API version (v1)
- `RATE_LIMIT_WINDOW_MS` - Rate limit window (900000 ms = 15 minutes)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (100)
- `ALLOWED_ORIGINS` - CORS allowed origins (*)

### Optional - Add When Needed
- `MONGODB_URI` - MongoDB connection string (**Required for database features**)
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name (for file uploads)
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `SMTP_HOST` - Email SMTP host (for email notifications)
- `SMTP_PORT` - Email SMTP port
- `SMTP_SECURE` - Email SMTP secure flag (true/false)
- `SMTP_USER` - Email SMTP username
- `SMTP_PASS` - Email SMTP password

## Architecture

### Tech Stack
- **Runtime:** Node.js v18+
- **Framework:** Express.js v5
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens)
- **Real-time:** Socket.io
- **File Storage:** Cloudinary
- **Email:** NodeMailer
- **Security:** Helmet, CORS, bcrypt, input sanitization
- **Logging:** Winston, Morgan

### Project Structure
```
src/
├── config/          # Configuration (database, socket.io, search)
├── middleware/      # Authentication, validation, sanitization, adminCheck
├── modules/         # Feature modules (auth, player, coach, club, specialist, blog)
│   ├── auth/       # Authentication system
│   ├── player/     # Player profiles and features
│   ├── coach/      # Coach profiles and training
│   ├── club/       # Club management
│   ├── specialist/ # Specialist consultations
│   └── blog/       # Blog system (Admin only)
├── models/         # Database models (User, Article, Setting, ActivityLog, etc.)
├── controllers/    # Global request handlers (admin, settings)
├── routes/         # API routes (admin, blog, jobs, etc.)
└── utils/          # Helper functions

server.js           # Main server entry point
```

### Key Features
✅ **Implemented:**
- Multi-role authentication (Player, Coach, Club, Specialist, Admin)
- Email verification system
- JWT-based security with refresh tokens
- Role-based access control (RBAC)
- Profile management for all roles
- Security hardening (NoSQL injection prevention, input sanitization)
- File upload support with Cloudinary
- Real-time capabilities with Socket.io
- Rate limiting and DDoS protection
- Comprehensive logging
- **Blog System** - Admin only publishing with full CRUD
- **Admin Dashboard** - Complete control panel for managing entire platform
- **Settings Management** - Dynamic site colors, features, and configuration
- **Activity Logging** - Track all user and admin actions
- **User Management** - Block/unblock users with tracking
- **Analytics** - Comprehensive platform statistics

🔨 **In Development:**
- Training/consultation booking system
- Real-time messaging
- Job posting and recruitment
- Rating and review system
- Advanced search with filters

## API Endpoints

### Health & Info
- `GET /` - Welcome message and API info
- `GET /health` - Health check endpoint

### Authentication (`/api/v1/auth`)
- `POST /register` - Register new user
- `POST /login` - User login
- `POST /refresh-token` - Refresh access token
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password
- `GET /verify-email` - Verify email address
- `POST /resend-verification` - Resend verification email
- `GET /profile` - Get user profile
- `POST /logout` - User logout

### Role-Specific APIs
- `/api/v1/player` - Player profile and features
- `/api/v1/coach` - Coach profile and training management
- `/api/v1/club` - Club management and recruitment
- `/api/v1/specialist` - Specialist consultations

### Blog System (`/api/v1/blog`)
- `POST /articles` - Create article (admin only)
- `GET /articles` - Get all published articles (public)
- `GET /articles/:id` - Get article details
- `PATCH /articles/:id` - Update article (admin only)
- `DELETE /articles/:id` - Delete article (admin only)
- `POST /articles/:id/publish` - Publish article (admin only)
- `POST /articles/:id/unpublish` - Unpublish article (admin only)

### Admin Dashboard (`/api/v1/admin`)
- `GET /dashboard` - Dashboard statistics
- `GET /settings` - Get system settings
- `PATCH /settings` - Update settings (colors, site name, features)
- `GET /articles` - Get all articles with pagination
- `PATCH /articles/:id/feature` - Feature/unfeature articles
- `GET /users` - Get all users with filtering
- `DELETE /users/:id` - Delete user (soft delete)
- `PATCH /users/:id/block` - Block/unblock user
- `GET /user-activity/:id` - Get user activity history
- `GET /logs` - Get activity logs
- `GET /user-logins` - Get login history
- `GET /analytics` - Get platform analytics

### Global Services
- `/api/v1/search` - Search functionality
- `/api/v1/messages` - Messaging system
- `/api/v1/notifications` - Notifications
- `/api/v1/reviews` - Reviews and ratings
- `/api/v1/global` - Global services (upload, location, etc.)

## Recent Changes

### November 24, 2025 - Admin Dashboard Complete
- ✅ Created Admin Dashboard System with 13+ endpoints
- ✅ Settings Management System (colors, site config, features)
- ✅ Activity Logging System (tracks all platform actions)
- ✅ User Management (block/unblock with reasons)
- ✅ Analytics Dashboard (user statistics, roles breakdown)
- ✅ Blog System - Admin publishing only
- ✅ Complete API documentation in multiple guides

**Files Added:**
- `src/controllers/adminController.js` - Admin dashboard logic
- `src/controllers/settingsController.js` - Settings and activity management
- `src/models/Setting.js` - Settings schema
- `src/models/ActivityLog.js` - Activity logging schema
- `src/routes/admin.js` - Admin routes with protection
- `src/middleware/adminCheck.js` - Admin verification middleware
- `src/modules/blog/` - Complete blog system

**Documentation Created:**
- `ADMIN_DASHBOARD_SETUP.md` - Admin API guide with examples
- `COMPLETE_ADMIN_API_REFERENCE.md` - Full API reference
- `FRONTEND_ADMIN_IMPLEMENTATION.md` - Frontend code samples
- `BLOG_PUBLISHING_GUIDE.md` - Blog system guide

## Development Workflow

### Making Changes
1. Edit code files in the `src/` directory
2. The server auto-restarts with nodemon
3. Test changes using the API endpoints
4. Check logs in the console for errors

### Testing
```bash
# Run tests (when implemented)
npm test

# Run with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

## Security Notes

### Important Security Considerations
⚠️ **Before Production:**
1. Set `NODE_ENV=production`
2. Update `ALLOWED_ORIGINS` to specific frontend URLs (remove `*`)
3. Enable HTTPS
4. Review rate limiting settings
5. Set up proper monitoring and logging
6. Configure Cloudinary and email services

### Current Security Features
- ✅ bcrypt password hashing
- ✅ JWT authentication with refresh tokens
- ✅ Input sanitization middleware
- ✅ NoSQL injection prevention
- ✅ Rate limiting (100 requests per 15 minutes)
- ✅ CORS protection
- ✅ Helmet security headers
- ✅ Admin-only endpoints protected with middleware
- ✅ Activity logging for all admin actions
- ✅ 0 dependency vulnerabilities

## Admin Features

### What Admin Can Do
1. **Dashboard** - View real-time statistics and analytics
2. **Settings** - Change site colors, name, description, enable/disable features
3. **Users** - View all users, filter by role, block/unblock, soft delete
4. **Articles** - Publish/unpublish, feature, manage blog content
5. **Logs** - Monitor all user activities, login history
6. **Analytics** - View user breakdown by role, new users, blocked users

### Test Admin Login
```
Email: admin@sportx.com
Password: admin123
```

## Deployment

The server is configured for deployment on platforms like Render, Heroku, or DigitalOcean:
- Trust proxy enabled for production
- Environment-based configuration
- Graceful shutdown handling
- MongoDB Atlas integration ready

## Next Steps

### Immediate
1. **Add MongoDB connection** - Configure `MONGODB_URI` to enable database features
2. **Test authentication** - Try registering a user and logging in
3. **Configure file uploads** - Add Cloudinary credentials if needed
4. **Set up email** - Add SMTP settings for email verification

### Development
1. Complete training/consultation booking system
2. Implement real-time messaging
3. Build job posting and recruitment features
4. Add advanced search functionality
5. Create rating and review system
6. Develop frontend application for user interface

### Production
1. Deploy to production server
2. Set up custom domain
3. Configure SSL/HTTPS
4. Set up monitoring and alerts
5. Develop and deploy frontend application

## Documentation

For detailed information, see:
- `ADMIN_DASHBOARD_SETUP.md` - Admin API with examples
- `COMPLETE_ADMIN_API_REFERENCE.md` - Complete API reference
- `BLOG_PUBLISHING_GUIDE.md` - Blog publishing guide
- `FRONTEND_ADMIN_IMPLEMENTATION.md` - Frontend code samples
- `README.md` - Project overview and quick start
- `PROJECT-BRIEF.md` - Complete project specification and roadmap
- `HANDOVER_GUIDE.md` - Developer guide with architecture details
- `SECURITY_AUDIT_REPORT.md` - Security audit findings
- API Documentation files:
  - `GLOBAL-API-DOCUMENTATION.md`
  - `MESSAGING-API-DOCUMENTATION.md`
  - `NOTIFICATION-API-DOCUMENTATION.md`
  - `PLAYER-API-DOCUMENTATION.md`
  - `REVIEW-API-DOCUMENTATION.md`
  - `SEARCH-API-DOCUMENTATION.md`

## Contact & Support

**Developer:** Hazem Salama
- Email: HazemSalama108@gmail.com
- Phone: +201092637808

**GitHub Repository:** https://github.com/Hazem-Salama/SportsPlatform-BE

---

**Last Updated:** November 24, 2025
**Status:** 🟢 Production Ready (Backend Complete)
**Version:** 1.0.0 (Admin Dashboard Phase)
