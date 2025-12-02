# SportX Platform - Full Stack Sports Platform

## Overview
SportX Platform is a comprehensive "LinkedIn for Sports" platform in the Middle East. It connects players, coaches, clubs, and specialists (physiotherapists, nutritionists, fitness trainers, sports psychologists). Built with Node.js/Express/MongoDB backend and React/Vite frontend.

## Project Type
**Full Stack Application**
- Backend: Node.js, Express.js, MongoDB
- Frontend: React, Vite, React Router

## Current Status

### Backend (Port 3000)
- Admin Dashboard with 13+ Endpoints
- Settings Management (Colors, Site Config)
- Activity Logging System
- User Management & Analytics
- Blog Publishing System
- **Match Hub System** - Public matches with filters & notifications
- **Jobs System** - Job posting with application notifications
- **Profile Management** - Dropdown-only forms
- **Real-time Notifications** via Socket.io
- **Enhanced Security** - Helmet, Rate Limiters, Sanitization
- **Leader/Team Dashboard System** - Enterprise-grade dual-dashboard
- **RBAC Permission System** - Granular permission control
- **Audit Logging** - Complete action tracking
- CORS Configured for Development & Production

### Frontend (Port 5000)
- Match Hub - Browse/Join/Create matches
- Player Profile - Dropdown-only form
- Coach Profile - Dropdown-only form
- Jobs Board - View job listings & apply
- Notification Bell - Real-time updates
- Login/Register - Authentication UI
- Saudi Arabia Regional Data - 13 regions coverage

## Quick Start

### Backend Server
```bash
npm run dev  # Runs on port 3000
```

### Frontend App
```bash
cd frontend/app && npm run dev  # Runs on port 5000
```

## Features (December 2025)

### Authentication System
- 11 user roles: player, coach, club, specialist, admin, administrator, administrative-officer, age-group-supervisor, sports-director, executive-director, secretary
- Role-specific registration validation
- JWT with access & refresh tokens
- Password: min 8 chars with uppercase, lowercase, number

### Leader/Team Dashboard System (NEW)
Enterprise-grade dual-dashboard architecture:

**Leader Dashboard** (Full Administrative Control):
- Manage team members with granular permissions
- View and export audit logs
- Configure team settings
- Full access to all modules

**Team Dashboard** (Role-Based Limited Permissions):
- Access only permitted modules
- Dynamic navigation based on permissions
- Activity tracking per member
- Safe redirect system (no 404s or unexpected logout)

### RBAC Permission System
Permission-by-permission control with categories:
- Dashboard: view, analytics
- Users: view, create, edit, delete, block
- Jobs: view, create, edit, delete, applications
- Matches: view, create, edit, delete
- Content: view, create, edit, delete, publish
- Settings: view, edit
- Reports: view, export
- System: notifications, logs

### Audit Logging System
Complete action tracking:
- All user actions logged
- IP, User-Agent, browser info
- Success/failure status
- Previous/new values for changes
- Severity levels (info, warning, error, critical)

### Match Hub
- Browse public matches with filters
- Filter by: region, city, neighborhood, sport, level, date
- Join/Leave matches with notifications
- Create new matches (authenticated users)
- Real-time player count updates
- Notifications for organizer when players join/leave

### Jobs System
- Browse active job listings
- Apply to jobs with resume upload
- Application notifications to both club & applicant
- Track application status

### Saudi Arabia Data (13 Regions)
- الرياض، مكة المكرمة، المدينة المنورة، القصيم
- المنطقة الشرقية، عسير، تبوك، حائل
- الحدود الشمالية، جازان، نجران، الباحة، الجوف
- Cities & neighborhoods per region
- All leagues: روشن، يلو، الدرجة الثانية/الثالثة، المناطق

### Profile Forms (Dropdown-Only)
- **Player Profile**: position, league, region, city, neighborhood, level, experience, preferred foot
- **Coach Profile**: certificates (C/B/A/PRO), coaching type, age group, experience
- Only phone number allows manual text input

### API Endpoints

#### Authentication
```
POST /api/v1/auth/register    - Register new user
POST /api/v1/auth/login       - Login user
POST /api/v1/auth/refresh     - Refresh access token
POST /api/v1/auth/logout      - Logout user
```

#### Leader Dashboard (Admin Only)
```
GET  /api/v1/leader/dashboard           - Get leader dashboard
GET  /api/v1/leader/team                - Get team members
POST /api/v1/leader/team                - Add team member
PATCH /api/v1/leader/team/:memberId/permissions - Update permissions
DELETE /api/v1/leader/team/:memberId    - Remove team member
GET  /api/v1/leader/permissions         - Get available permissions
GET  /api/v1/leader/audit-logs          - Get audit logs
PATCH /api/v1/leader/settings           - Update team settings
```

#### Team Dashboard
```
GET  /api/v1/team/dashboard             - Get team member dashboard
GET  /api/v1/team/permissions           - Get my permissions
GET  /api/v1/team/check-access/:module  - Check module access
GET  /api/v1/team/my-activity           - Get my activity log
```

#### Administrative Officer (Sports Field)
```
GET  /api/v1/administrative-officer/dashboard  - Get dashboard
GET  /api/v1/administrative-officer/reports    - Get field reports
GET  /api/v1/administrative-officer/schedule   - Get schedule
GET  /api/v1/administrative-officer/facilities - Get facilities
```

#### Match Hub
```
GET  /api/v1/matches           - List matches with filters
GET  /api/v1/matches/:id       - Get match details
POST /api/v1/matches           - Create match (auth required)
POST /api/v1/matches/:id/join  - Join match (auth required)
POST /api/v1/matches/:id/leave - Leave match (auth required)
GET  /api/v1/matches/my-matches - Get user's matches
GET  /api/v1/matches/regions   - Get all dropdown options
```

#### Jobs
```
GET  /api/v1/jobs              - List active jobs
GET  /api/v1/jobs/:id          - Get job details
POST /api/v1/jobs/:id/apply    - Apply to job (auth required)
GET  /api/v1/jobs/applications/me - Get my applications
```

#### Profile Options
```
GET /api/v1/profile/options    - Get all dropdown data
  - regions, cities, neighborhoods
  - leagues, positions, levels
  - certificates, coachingTypes, ageGroups
  - sports, specializations, jobTypes
```

#### Notifications
```
GET  /api/v1/notifications       - Get notifications
GET  /api/v1/notifications/unread/count - Get unread count
PUT  /api/v1/notifications/:id/read - Mark as read
PUT  /api/v1/notifications/read-all - Mark all as read
```

## Project Structure

```
/
├── server.js                    # Main backend entry
├── src/
│   ├── config/
│   │   ├── database.js          # MongoDB connection
│   │   └── socket.js            # Socket.io config
│   ├── models/
│   │   ├── admin/
│   │   │   ├── LeaderTeam.js    # Leader/Team management
│   │   │   ├── AuditLog.js      # Audit logging
│   │   │   ├── Permission.js    # Permission definitions
│   │   │   └── index.js         # Admin models export
│   │   ├── PublicMatch.js       # Match Hub model
│   │   └── Notification.js      # Notifications model
│   ├── controllers/
│   │   ├── leaderDashboardController.js  # Leader dashboard
│   │   ├── teamDashboardController.js    # Team dashboard
│   │   ├── matchHubController.js
│   │   ├── jobsController.js
│   │   ├── profileController.js
│   │   └── notificationController.js
│   ├── routes/
│   │   ├── leaderDashboard.js   # Leader routes
│   │   ├── teamDashboard.js     # Team routes
│   │   ├── administrativeOfficer.js  # Admin officer routes
│   │   ├── matchHub.js          # Match routes
│   │   ├── jobs.js              # Jobs routes
│   │   ├── profile.js           # Profile routes
│   │   └── notifications.js     # Notification routes
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication
│   │   ├── rbac.js              # RBAC & permission checks
│   │   ├── sanitize.js          # NoSQL injection prevention
│   │   └── validation.js        # Input validation
│   └── data/
│       └── saudiRegions.json    # Saudi regional data (13 regions)
│
└── frontend/
    └── app/
        ├── src/
        │   ├── App.jsx          # Main app
        │   ├── config/api.js    # API client (uses /api/v1 proxy)
        │   ├── context/         # Auth context
        │   ├── components/
        │   │   ├── Navbar.jsx
        │   │   ├── NotificationBell.jsx
        │   │   └── CascadingSelect.jsx
        │   └── pages/
        │       ├── MatchHub.jsx
        │       ├── PlayerProfile.jsx
        │       ├── CoachProfile.jsx
        │       ├── Jobs.jsx
        │       ├── Login.jsx
        │       └── Register.jsx
        └── vite.config.js

```

## Tech Stack

### Backend
- Node.js v18+
- Express.js v5
- MongoDB + Mongoose
- Socket.io (real-time)
- JWT authentication
- Helmet, CORS, bcrypt
- express-rate-limit

### Frontend
- React 18
- Vite
- React Router v6
- Axios
- Socket.io Client

## Security Enhancements

### Rate Limiting
- General API: 100 requests per 15 minutes
- Auth endpoints (login/register): 10 requests per 15 minutes
- Notifications: 30 requests per minute

### Protection
- Helmet (HTTP headers)
- NoSQL injection prevention (sanitizeRequest middleware)
- Request sanitization
- Trust proxy for production
- RBAC with audit logging

## Environment Variables

### Required
- `MONGODB_URI` - MongoDB connection string
- `JWT_ACCESS_SECRET` - JWT access secret
- `JWT_REFRESH_SECRET` - Refresh token secret

### Optional
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `ALLOWED_ORIGINS` - CORS origins

## Testing

### Test Endpoints
```bash
# Get regions data
curl http://localhost:3000/api/v1/matches/regions

# Get profile options
curl http://localhost:3000/api/v1/profile/options

# Register new user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123456","role":"player","firstName":"أحمد","lastName":"محمد"}'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123456"}'
```

### Admin Login
```
Email: admin@sportx.com
Password: Admin123456
```

**ملاحظة:** كلمة المرور القديمة `admin123` لم تعد تعمل بسبب متطلبات كلمة المرور الجديدة.

## User Roles

### Primary Roles (المستخدمين الأساسيين)
- **player** - لاعب
- **coach** - مدرب
- **club** - نادي
- **specialist** - أخصائي

### Administrative Roles (الأدوار الإدارية)
- **admin** - مدير النظام (Full Access)
- **administrator** - إداري
- **administrative-officer** - موظف إداري (الميدان الرياضي)
- **age-group-supervisor** - مشرف فئة عمرية
- **sports-director** - المدير الرياضي
- **executive-director** - المدير التنفيذي
- **secretary** - أمين السر

## Token Management

### Access Token
- **مدة الصلاحية:** ساعة واحدة (1h)
- يُستخدم في كل الطلبات المحمية
- يُخزن في localStorage

### Refresh Token  
- **مدة الصلاحية:** 7 أيام (7d)
- يُستخدم لتجديد Access Token تلقائياً
- لا يتطلب تأكيد البريد الإلكتروني

### آلية التجديد التلقائي
- عند انتهاء صلاحية Access Token، يتم تجديده تلقائياً باستخدام Refresh Token
- إذا فشل التجديد، يتم توجيه المستخدم لتسجيل الدخول

## ENUMs Reference

### Leagues (الدوري)
- دوري روشن
- دوري يلو
- دوري الدرجة الثانية
- دوري الدرجة الثالثة
- دوري المناطق
- الأندية الخاصة والأكاديميات

### Coach Certificates (شهادات المدربين)
- شهادة C
- شهادة B
- شهادة A
- شهادة PRO
- شهادات أخرى

### Player Positions (المراكز)
- حارس مرمى
- مدافع أيمن/أيسر
- قلب دفاع
- ظهير أيمن/أيسر
- وسط دفاعي/ملعب/مهاجم
- جناح أيمن/أيسر
- مهاجم
- رأس حربة

### Levels (المستويات)
- مبتدئ
- متوسط
- متقدم
- احترافي

### Permission Categories (فئات الصلاحيات)
- dashboard - لوحة التحكم
- users - المستخدمين
- jobs - الوظائف
- matches - المباريات
- content - المحتوى
- settings - الإعدادات
- reports - التقارير
- system - النظام

---

**Last Updated:** December 02, 2025
**Version:** 4.0.0 (Leader/Team Dashboard + RBAC + Audit Logging)
