# TF1 Platform - Backend API

> Sports networking platform for Egypt and the Middle East - LinkedIn for Sports

## What is SportX?

SportX Platform connects the entire sports ecosystem:

- **Players** - find coaches, join clubs, discover opportunities
- **Coaches** - build their practice, train athletes, grow reputation
- **Clubs** - recruit talent, manage members, post jobs
- **Specialists** - (Physio, Nutrition, Fitness, Psychology) serve athletes

## Tech Stack

- **Runtime:** Node.js v18+
- **Framework:** Express.js 5.x
- **Database:** MongoDB (Mongoose), PostgreSQL (Prisma for CV system)
- **Cache:** Redis
- **Real-time:** Socket.io
- **Auth:** JWT + Passport.js
- **File Storage:** Cloudinary
- **Email:** Nodemailer

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Start development server
npm run dev

# Test API
curl http://localhost:4000/health
```

## Project Structure

```
src/
├── config/          # Database, socket, cloudinary config
├── middleware/      # Auth, CSRF, rate limiting, validation
├── models/          # MongoDB schemas
├── modules/         # Feature modules
│   ├── auth/        # Authentication
│   ├── player/      # Player profiles
│   ├── coach/       # Coach management
│   ├── club/        # Club operations
│   ├── specialist/  # Specialist services
│   ├── matches/     # Isolated matches system
│   ├── cv/          # CV builder (PostgreSQL)
│   ├── admin-dashboard/
│   └── job-publisher/
├── controllers/     # Global controllers
├── routes/          # Route definitions
└── utils/           # Logger, email, JWT utilities
```

## API Endpoints

### Authentication
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh-token
GET    /api/v1/auth/verify-email
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
GET    /api/v1/auth/csrf-token
```

### Role-based Endpoints
```
/api/v1/player/*      # Player operations
/api/v1/coach/*       # Coach operations
/api/v1/club/*        # Club operations
/api/v1/specialist/*  # Specialist operations
```

### Matches System (Isolated)
```
/matches/auth/*       # Independent auth
/matches/*            # Match CRUD
/matches/teams/*      # Team management
/matches/:id/chat     # Match chat
```

### Admin
```
/sys-admin-secure-panel/api/*
```

## Scripts

```bash
npm run dev           # Development with nodemon
npm start             # Production
npm test              # Run tests
npm run lint          # Lint code
npm run format        # Format with Prettier
```

## Environment Variables

See `.env.example` for all required variables.

**Critical:**
- `MONGODB_URI` - Database connection
- `JWT_SECRET` - JWT signing key
- `SMTP_*` - Email configuration
- `CLOUDINARY_*` - File storage

## Docker

```bash
# Start MongoDB and Redis
docker-compose up -d

# Build production image
docker build -t tf1-backend .
```

## Security

- JWT authentication with refresh tokens
- CSRF protection
- Rate limiting
- Input sanitization
- NoSQL injection prevention
- Helmet security headers

## License

Proprietary - All rights reserved
