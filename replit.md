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
- **Match Hub System** - Public matches with filters
- **Profile Management** - Dropdown-only forms
- **Real-time Notifications** via Socket.io
- CORS Configured for Production (tf1one.com)

### Frontend (Port 5000)
- Match Hub - Browse/Join/Create matches
- Player Profile - Dropdown-only form
- Coach Profile - Dropdown-only form
- Jobs Board - View job listings
- Notification Bell - Real-time updates
- Login/Register - Authentication UI
- Saudi Arabia Regional Data - Full coverage

## Quick Start

### Backend Server
```bash
npm run dev  # Runs on port 3000
```

### Frontend App
```bash
cd frontend/app && npm run dev  # Runs on port 5000
```

## New Features (December 2025)

### Match Hub
- Browse public matches with filters
- Filter by: region, city, neighborhood, sport, level, date
- Join/Leave matches with notifications
- Create new matches (authenticated users)
- Real-time player count updates

### Cascading Dropdown System
- Saudi Arabia regions (8 regions)
- Cities per region
- Neighborhoods per city
- All sports leagues (روشن، يلو، etc.)
- Player positions, levels, foot preference

### Profile Forms (Dropdown-Only)
- **Player Profile**: position, league, region, city, neighborhood, level, experience
- **Coach Profile**: certificates, coaching type, age group, experience
- Only phone number allows manual text input

### API Endpoints

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

#### Profile Options
```
GET /api/v1/profile/options    - Get all dropdown data
  - regions, cities, neighborhoods
  - leagues, positions, levels
  - certificates, coachingTypes, ageGroups
```

## Project Structure

```
/
├── server.js                    # Main backend entry
├── src/
│   ├── config/                  # Database, Socket.io
│   ├── models/                  # Mongoose models
│   │   ├── PublicMatch.js       # Match Hub model
│   │   └── Notification.js      # Notifications model
│   ├── controllers/             # API controllers
│   │   └── matchHubController.js
│   ├── routes/                  # API routes
│   │   ├── matchHub.js          # Match routes
│   │   └── profile.js           # Profile routes
│   └── data/
│       └── saudiRegions.json    # Saudi regional data
│
└── frontend/
    └── app/
        ├── src/
        │   ├── App.jsx          # Main app
        │   ├── config/api.js    # API client
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

### Frontend
- React 18
- Vite
- React Router v6
- Axios
- Socket.io Client

## Saudi Arabia Regional Data

8 regions with full city/neighborhood coverage:
1. الرياض (Riyadh) - 4 cities
2. مكة المكرمة (Makkah) - 4 cities
3. المدينة المنورة (Madinah) - 4 cities
4. الإحساء (Al-Ahsa) - 4 cities
5. الدمام (Dammam) - 4 cities
6. عسير (Asir) - 4 cities
7. تبوك (Tabuk) - 4 cities
8. الحدود الشمالية (Northern Borders) - 4 cities

All leagues supported:
- دوري روشن (Roshn League)
- دوري يلو (Yelo League)
- دوري الدرجة الثانية
- دوري الدرجة الثالثة
- دوري المناطق
- الأندية الخاصة والأكاديميات

## Environment Variables

### Required
- `MONGODB_URI` - MongoDB connection string
- `JWT_ACCESS_SECRET` - JWT secret key
- `JWT_REFRESH_SECRET` - Refresh token secret

### Optional
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `ALLOWED_ORIGINS` - CORS origins

## Testing

### Test Match Hub
```bash
# Get regions data
curl http://localhost:3000/api/v1/matches/regions

# Get profile options
curl http://localhost:3000/api/v1/profile/options

# Get matches with filters
curl "http://localhost:3000/api/v1/matches?region=الرياض&sport=كرة القدم"
```

### Admin Login
```
Email: admin@sportx.com
Password: admin123
```

## Next Steps

1. Add more notification types for match events
2. Implement match chat feature
3. Add player rating system
4. Build club dashboard
5. Add job application tracking

---

**Last Updated:** December 02, 2025
**Version:** 2.0.0 (Match Hub + Dropdown Forms)
