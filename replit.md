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
- 10 user roles: player, coach, club, specialist, admin, administrator, age-group-supervisor, sports-director, executive-director, secretary
- Role-specific registration validation
- JWT with access & refresh tokens
- Password: min 8 chars with uppercase, lowercase, number

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
│   │   ├── PublicMatch.js       # Match Hub model
│   │   └── Notification.js      # Notifications model
│   ├── controllers/
│   │   ├── matchHubController.js
│   │   ├── jobsController.js
│   │   ├── profileController.js
│   │   └── notificationController.js
│   ├── routes/
│   │   ├── matchHub.js          # Match routes
│   │   ├── jobs.js              # Jobs routes
│   │   ├── profile.js           # Profile routes
│   │   └── notifications.js     # Notification routes
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication
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
Password: admin123
```

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

---

**Last Updated:** December 02, 2025
**Version:** 3.0.0 (Enhanced Backend + Security)
