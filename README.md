# 🏆 SportX Platform - Backend API

> The first comprehensive sports networking platform in Egypt and the Middle East - LinkedIn for Sports

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green.svg)](https://www.mongodb.com/)
[![Security](https://img.shields.io/badge/Security-Hardened-brightgreen.svg)](SECURITY.md)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

---

## 🎯 What is SportX?

SportX Platform connects the entire sports ecosystem in one place:

- 🏃 **Players** find coaches, join clubs, and discover opportunities
- 👨‍🏫 **Coaches** build their practice, train athletes, and grow their reputation
- 🏢 **Clubs** recruit talent, manage members, and post job opportunities
- 🩺 **Specialists** (Physio, Nutrition, Fitness, Psychology) serve athletes and clubs

**Think LinkedIn + Upwork, but specifically for the sports industry in MENA.**

---

## ✨ Features

### Currently Available
✅ Multi-role authentication (Player, Coach, Club, Specialist)
✅ Email verification system
✅ JWT-based security (access + refresh tokens)
✅ Role-based access control (RBAC)
✅ Profile management for all roles
✅ Security hardening (NoSQL injection prevention, input sanitization)
✅ File upload with Cloudinary
✅ Real-time capabilities (Socket.io)
✅ Email notifications
✅ Rate limiting & DDoS protection

### Coming Soon
🔨 Training/consultation booking system
🔨 Real-time messaging
🔨 Job posting & recruitment
🔨 Rating & review system
🔨 Advanced search with filters
🔨 Payment tracking
🔨 Analytics dashboard
🔨 Arabic/English localization

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- MongoDB (Atlas or local)
- Cloudinary account
- Email service (Gmail recommended)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Hazem-Salama/SportsPlatform-BE.git
cd SportsPlatform-BE

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your credentials (IMPORTANT: Generate new secrets!)

# 4. Start the server
npm run dev

# 5. Test the API
curl http://localhost:4000/health
```

### Generate Secrets

```bash
# Generate JWT secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[HANDOVER_GUIDE.md](HANDOVER_GUIDE.md)** | 👋 **START HERE** - Complete developer guide with setup, architecture, and common tasks |
| [PROJECT-BRIEF.md](PROJECT-BRIEF.md) | 📋 Full project specification, roadmap, and feature details |
| [SECURITY.md](SECURITY.md) | 🔒 Security best practices and production checklist |
| [SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md) | 🔍 Recent security audit findings (8 vulnerabilities fixed) |
| [IMMEDIATE_ACTION_REQUIRED.md](IMMEDIATE_ACTION_REQUIRED.md) | ⚠️ Critical actions before production deployment |

---

## 🏗️ Tech Stack

**Backend:**
- Node.js & Express.js
- MongoDB with Mongoose
- JWT Authentication
- Socket.io (Real-time)
- Cloudinary (File storage)
- NodeMailer (Emails)
- Winston (Logging)
- Helmet (Security)

**Security:**
- bcrypt password hashing
- Input sanitization
- NoSQL injection prevention
- Rate limiting
- CORS protection
- JWT with refresh tokens

---

## 📁 Project Structure

```
src/
├── config/          # Configuration (database, socket.io, etc.)
├── middleware/      # Authentication, validation, sanitization
├── modules/         # Feature modules (auth, player, coach, club, specialist)
├── models/          # Database models
├── controllers/     # Request handlers
├── routes/          # API routes
└── utils/           # Helper functions
```

---

## 🔐 Security

This project has been **security audited** and **hardened** with:

- ✅ NoSQL injection prevention
- ✅ Input sanitization middleware
- ✅ Path traversal protection
- ✅ JWT authentication (fixed)
- ✅ Strong password requirements
- ✅ Rate limiting (100 req/15min)
- ✅ CORS whitelisting
- ✅ Helmet security headers
- ✅ 0 dependency vulnerabilities

**Security Score:** All critical vulnerabilities fixed ✅

See [SECURITY.md](SECURITY.md) for detailed security documentation.

---

## 🔑 API Endpoints

### Authentication
```
POST   /api/v1/auth/register          # Register new user
POST   /api/v1/auth/login             # Login
POST   /api/v1/auth/refresh-token     # Refresh access token
POST   /api/v1/auth/forgot-password   # Request password reset
POST   /api/v1/auth/reset-password    # Reset password
GET    /api/v1/auth/verify-email      # Verify email
POST   /api/v1/auth/resend-verification # Resend verification email
GET    /api/v1/auth/profile           # Get user profile
POST   /api/v1/auth/logout            # Logout
```

### Roles
```
# Player endpoints
GET    /api/v1/player/profile
PUT    /api/v1/player/profile
...

# Coach endpoints
GET    /api/v1/coach/profile
PUT    /api/v1/coach/profile
GET    /api/v1/coach/students
...

# Club endpoints
GET    /api/v1/club/profile
PUT    /api/v1/club/profile
GET    /api/v1/club/members
...

# Specialist endpoints
GET    /api/v1/specialist/profile
PUT    /api/v1/specialist/profile
GET    /api/v1/specialist/clients
...
```

For complete API documentation, see the code or use Postman.

---

## 🧪 Testing

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

---

## 📊 Current Status

**Development Phase:** Foundation Complete ✅

- [x] Authentication system
- [x] User management
- [x] Role-based profiles
- [x] Security hardening
- [ ] Training/consultation system (60% complete)
- [ ] Club features (50% complete)
- [ ] Messaging (models ready)
- [ ] Notifications (models ready)
- [ ] Search (basic implementation)
- [ ] Reviews (models ready)

See [PROJECT-BRIEF.md](PROJECT-BRIEF.md) for the complete roadmap.

---

## 🤝 Contributing

This is currently a proprietary project. If you're the next developer:

1. Read [HANDOVER_GUIDE.md](HANDOVER_GUIDE.md)
2. Set up your environment
3. Pick a task from "What's Next" section
4. Follow the code style and security practices
5. Test your changes
6. Document new features

---

## 📞 Contact

**Developer:** Hazem Salama
- Email: HazemSalama108@gmail.com
- Phone: +201092637808

For questions, bugs, or feature requests, please reach out directly.

---

## ⚠️ Important Notes

### Before Production Deployment

🚨 **CRITICAL:** The current `.env` file contains exposed secrets. You MUST:
1. Generate new JWT secrets
2. Rotate database credentials
3. Update all API keys
4. Set NODE_ENV=production
5. Enable HTTPS

See [IMMEDIATE_ACTION_REQUIRED.md](IMMEDIATE_ACTION_REQUIRED.md) for the complete checklist.

### Environment Variables

Never commit `.env` file to Git. Use `.env.example` as a template.

Required variables:
- `MONGODB_URI` - Database connection
- `JWT_ACCESS_SECRET` - JWT signing (generate new!)
- `JWT_REFRESH_SECRET` - Refresh token signing (generate new!)
- `SMTP_USER` & `SMTP_PASS` - Email service
- `CLOUDINARY_*` - File storage

---

## 📈 Roadmap

### Phase 1: Foundation (✅ Complete)
- Authentication & user management
- Role-based profiles
- Security hardening

### Phase 2: Core Features (🔨 In Progress)
- Training/consultation system
- Club management
- Job posting & recruitment

### Phase 3: Communication (📝 Planned)
- Real-time messaging
- Notifications
- Rating & reviews

### Phase 4: Advanced (📝 Planned)
- Advanced search & filters
- Analytics
- Localization (Arabic/English)

### Phase 5: Launch (📝 Planned)
- Frontend development
- Mobile apps
- Production deployment
- Beta testing

See [PROJECT-BRIEF.md](PROJECT-BRIEF.md) for detailed timeline.

---

## 📄 License

Proprietary - All rights reserved

---

## 🙏 Acknowledgments

Built with modern best practices and security-first approach to create a platform that empowers the sports community in Egypt and the Middle East.

---

**Last Updated:** October 12, 2025
**Version:** 1.0.0 (Foundation Phase)
**Status:** 🟢 Active Development
