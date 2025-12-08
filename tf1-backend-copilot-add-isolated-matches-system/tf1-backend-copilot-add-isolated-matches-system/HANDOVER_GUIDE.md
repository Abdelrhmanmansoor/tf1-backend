# 👋 SportX Platform Backend - Developer Handover Guide

**Welcome!** This guide will help you understand, set up, and continue developing the SportX Platform Backend.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [What's Been Built](#whats-been-built)
3. [Getting Started](#getting-started)
4. [Project Structure](#project-structure)
5. [Key Features Explained](#key-features-explained)
6. [Security Implementation](#security-implementation)
7. [What's Next](#whats-next)
8. [Common Tasks](#common-tasks)
9. [Troubleshooting](#troubleshooting)
10. [Need Help?](#need-help)

---

## 🎯 Project Overview

**SportX Platform** is building the first comprehensive sports networking platform in Egypt and the Middle East - think "LinkedIn for Sports." It connects:

- 🏃 **Players** - Finding coaches, clubs, and opportunities
- 👨‍🏫 **Coaches** - Offering training and building their practice
- 🏢 **Clubs** - Recruiting talent and managing members
- 🩺 **Specialists** - Providing physiotherapy, nutrition, fitness, and psychology services

**Vision:** Create a professional ecosystem where sports professionals can connect, grow, and succeed.

**Current Status:** Foundation phase complete, ready for expansion!

For detailed project information, see [PROJECT-BRIEF.md](PROJECT-BRIEF.md)

---

## ✅ What's Been Built

### Completed Features

#### 1. **Authentication System** ✅
- Multi-role registration (Player, Coach, Club, Specialist)
- Email verification with time-limited tokens
- Password reset functionality
- JWT access + refresh token system
- Role-based access control (RBAC)
- Account lockout after 5 failed login attempts

**Files:**
- [src/modules/auth/controllers/authController.js](src/modules/auth/controllers/authController.js)
- [src/middleware/auth.js](src/middleware/auth.js)
- [src/utils/jwt.js](src/utils/jwt.js)

#### 2. **User Management** ✅
- Base User model with role separation
- Profile-specific models (Player, Coach, Club, Specialist)
- Password hashing with bcrypt (12 rounds)
- Safe object methods (no password leaks)

**Files:**
- [src/modules/shared/models/User.js](src/modules/shared/models/User.js)
- [src/modules/player/models/PlayerProfile.js](src/modules/player/models/PlayerProfile.js)
- [src/modules/coach/models/CoachProfile.js](src/modules/coach/models/CoachProfile.js)
- [src/modules/club/models/ClubProfile.js](src/modules/club/models/ClubProfile.js)
- [src/modules/specialist/models/SpecialistProfile.js](src/modules/specialist/models/SpecialistProfile.js)

#### 3. **Security Hardening** ✅ (Just Completed!)
- **NoSQL injection prevention** - All user inputs sanitized
- **Request sanitization middleware** - Blocks MongoDB operators
- **Path traversal protection** - File uploads validated
- **JWT fixes** - Socket.io authentication corrected
- **Password strength** - Strong requirements enforced
- **Dependencies updated** - 0 vulnerabilities

**Files:**
- [src/utils/sanitize.js](src/utils/sanitize.js) - Input sanitization utilities
- [src/middleware/sanitize.js](src/middleware/sanitize.js) - Request sanitization
- [SECURITY.md](SECURITY.md) - Complete security documentation
- [SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md) - Detailed audit findings

#### 4. **Core Infrastructure** ✅
- Express.js server with proper error handling
- MongoDB with Mongoose ODM
- Socket.io for real-time features
- Helmet for security headers
- CORS with origin whitelist
- Rate limiting (100 req/15min)
- Compression enabled
- File upload with Cloudinary
- Email service with NodeMailer
- Graceful shutdown handling

**Files:**
- [server.js](server.js) - Main application entry point
- [src/config/database.js](src/config/database.js)
- [src/config/socket.js](src/config/socket.js)
- [src/config/cloudinary.js](src/config/cloudinary.js)

#### 5. **Partial Features** 🔨 (In Progress)
- Player profiles with sports, positions, achievements
- Coach profiles with certifications, pricing, availability
- Training request/session system (models exist)
- Club member management
- Job posting system
- Specialist consultation system
- Search functionality (basic implementation)
- Messaging system (models exist)
- Notification system (models exist)

---

## 🚀 Getting Started

### Prerequisites

Make sure you have installed:
- **Node.js** v18 or higher ([Download](https://nodejs.org/))
- **MongoDB** ([MongoDB Atlas](https://www.mongodb.com/cloud/atlas) recommended)
- **Git** (for version control)
- **Postman** (for API testing) - Optional but helpful

### Step 1: Clone and Install

```bash
# Navigate to the project
cd /Users/hazem/Desktop/Projects/Websites/SportsPlatform-BE

# Install dependencies
npm install

# Verify installation
npm audit
# Should show: found 0 vulnerabilities ✅
```

### Step 2: Environment Configuration

**⚠️ CRITICAL: DO NOT USE THE EXISTING .env FILE IN PRODUCTION!**

The current `.env` file contains exposed secrets that must be rotated.

```bash
# Copy the example file
cp .env.example .env

# Open .env in your editor
nano .env  # or use VS Code: code .env
```

**Generate new secrets:**
```bash
# Generate JWT secrets
node -e "console.log('JWT_ACCESS_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

**Required configuration:**
```env
# Server
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000

# Database (Get connection string from MongoDB Atlas)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sportx

# JWT (Use generated secrets above)
JWT_ACCESS_SECRET=your_new_secret_here
JWT_REFRESH_SECRET=your_other_new_secret_here

# Email (Use Gmail App Password)
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_char_app_password

# Cloudinary (Get from cloudinary.com dashboard)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Step 3: Set Up Database

**Option 1: MongoDB Atlas (Recommended)**
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create database user
4. Whitelist your IP (or use 0.0.0.0/0 for development)
5. Get connection string
6. Paste into `.env` as `MONGODB_URI`

**Option 2: Local MongoDB**
```bash
# Install MongoDB locally
brew install mongodb-community  # macOS
# or download from mongodb.com

# Start MongoDB
brew services start mongodb-community

# Use local connection
MONGODB_URI=mongodb://localhost:27017/sportx
```

### Step 4: Run the Application

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

**You should see:**
```
🏆 SPORTX PLATFORM API 🏆
✅ Database connected successfully
✅ Search indexes initialized
✅ SERVER RUNNING
📍 Port: 4000
🌐 API Base: http://localhost:4000/api/v1
```

### Step 5: Test the API

**Health Check:**
```bash
curl http://localhost:4000/health
```

**Register a User:**
```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234",
    "role": "player",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }'
```

### Step 6: Explore the API

I recommend using **Postman** for easier API testing:

1. Download Postman: [postman.com](https://www.postman.com/downloads/)
2. Import the collection (create one with endpoints from [src/routes/](src/routes/))
3. Set up environment variables (BASE_URL, ACCESS_TOKEN, etc.)

---

## 📁 Project Structure

```
SportsPlatform-BE/
├── server.js                    # 🚀 Main entry point
├── .env                         # ⚠️ Secrets (DO NOT COMMIT!)
├── .env.example                 # ✅ Template for .env
├── package.json                 # 📦 Dependencies
│
├── src/
│   ├── config/                  # ⚙️ Configuration
│   │   ├── database.js          # MongoDB connection
│   │   ├── socket.js            # Socket.io setup
│   │   ├── cloudinary.js        # Cloudinary config
│   │   └── searchIndexes.js     # Database indexes
│   │
│   ├── middleware/              # 🛡️ Middleware
│   │   ├── auth.js              # JWT authentication
│   │   ├── rbac.js              # Role-based access control
│   │   ├── validation.js        # Input validation rules
│   │   ├── sanitize.js          # 🆕 Request sanitization
│   │   ├── upload.js            # File upload handling
│   │   └── cloudinaryUpload.js  # Cloudinary integration
│   │
│   ├── utils/                   # 🔧 Utility functions
│   │   ├── jwt.js               # JWT token management
│   │   ├── email.js             # Email sending
│   │   ├── sanitize.js          # 🆕 Input sanitization
│   │   ├── logger.js            # Winston logger
│   │   ├── appError.js          # Custom error class
│   │   ├── catchAsync.js        # Async error handler
│   │   └── apiFeatures.js       # Query helpers
│   │
│   ├── modules/                 # 🎯 Feature modules
│   │   ├── auth/                # Authentication
│   │   │   ├── controllers/
│   │   │   └── routes/
│   │   │
│   │   ├── shared/              # Shared models
│   │   │   └── models/
│   │   │       └── User.js      # Base user model
│   │   │
│   │   ├── player/              # Player role
│   │   │   ├── models/
│   │   │   ├── controllers/
│   │   │   └── routes/
│   │   │
│   │   ├── coach/               # Coach role
│   │   │   ├── models/
│   │   │   ├── controllers/
│   │   │   └── routes/
│   │   │
│   │   ├── club/                # Club role
│   │   │   ├── models/
│   │   │   ├── controllers/
│   │   │   └── routes/
│   │   │
│   │   └── specialist/          # Specialist role
│   │       ├── models/
│   │       ├── controllers/
│   │       └── routes/
│   │
│   ├── models/                  # 📊 Global models
│   │   ├── Message.js           # Messaging system
│   │   ├── Conversation.js
│   │   ├── Notification.js
│   │   ├── Review.js
│   │   ├── Media.js
│   │   ├── BlockedUser.js
│   │   ├── Report.js
│   │   ├── SearchHistory.js
│   │   └── SavedSearch.js
│   │
│   ├── controllers/             # 🎮 Global controllers
│   │   ├── messageController.js
│   │   ├── searchController.js
│   │   ├── notificationController.js
│   │   ├── reviewController.js
│   │   └── globalController.js
│   │
│   └── routes/                  # 🛣️ Route definitions
│       ├── index.js             # Main router
│       ├── messages.js
│       ├── search.js
│       ├── notifications.js
│       ├── reviews.js
│       └── global.js
│
├── uploads/                     # 📁 Local file uploads
│   └── avatars/                 # User avatars
│
├── docs/                        # 📚 Documentation
│   ├── PROJECT-BRIEF.md         # 📋 Complete project plan
│   ├── SECURITY.md              # 🔒 Security best practices
│   ├── SECURITY_AUDIT_REPORT.md # 🔍 Security audit findings
│   └── IMMEDIATE_ACTION_REQUIRED.md # ⚠️ Critical actions
│
└── node_modules/                # 📦 Dependencies (ignored by git)
```

---

## 🔑 Key Features Explained

### 1. Authentication Flow

**Registration:**
```
User submits registration → Validate input → Hash password →
Create user → Generate email token → Send verification email →
Return success (user not verified yet)
```

**Email Verification:**
```
User clicks link → Extract token → Find user with token →
Check expiration → Mark as verified → Clear token →
Generate JWT → Return access token
```

**Login:**
```
User submits credentials → Find user → Check password →
Check if verified → Update last login → Generate tokens →
Return access + refresh tokens
```

**Protected Routes:**
```
Client sends request with Bearer token → Extract JWT →
Verify signature → Check expiration → Load user →
Check permissions → Allow/deny access
```

### 2. Role-Based Access Control (RBAC)

Each role has different permissions defined in [src/middleware/rbac.js](src/middleware/rbac.js):

```javascript
// Example: Only coaches can create training sessions
router.post('/sessions',
  authenticate,              // Ensure user is logged in
  authorize('coach'),        // Ensure user is a coach
  createTrainingSession      // Execute controller
);
```

**Role Hierarchy:**
- **Player** - Can search, book, apply, message
- **Coach** - Can train, accept students, manage sessions
- **Club** - Can recruit, manage members, post jobs
- **Specialist** - Can consult, create programs, manage clients

### 3. Multi-Role Profile System

```
User (Base Model)
  ├─ email, password, role, isVerified
  ├─ Generic fields: firstName, lastName, avatar
  └─ Links to role-specific profile (1:1 relationship)

Player Profile → userId reference
  └─ sports, position, experience, achievements

Coach Profile → userId reference
  └─ specializations, certifications, pricing, availability

Club Profile → userId reference
  └─ organizationName, facilities, programs, members

Specialist Profile → userId reference
  └─ specializationType, certifications, services, clients
```

### 4. Training/Consultation Workflow

```
Player/Client                      Coach/Specialist
     |                                    |
     |--- Send Request ----------------→ |
     |    (goals, schedule, budget)      |
     |                                    |
     |                                    |--- Review Request
     |                                    |--- Check Profile
     |                                    |
     | ←--- Accept/Negotiate/Reject ------|
     |                                    |
     |--- Confirm ----------------------→ |
     |                                    |
     |                                    |--- Create Session
     |                                    |
     | ←--- Session Created Notification--|
     |                                    |
     [Session Happens]                    [Session Happens]
     |                                    |
     | ←--- Mark Complete ----------------|
     |                                    |
     |--- Rate & Review ----------------→ |
     |                                    |
     | ←--- Optional Reply ----------------|
```

### 5. Security Architecture

**Layers of Protection:**

1. **Input Sanitization** (NEW!)
   - [src/middleware/sanitize.js](src/middleware/sanitize.js) - Cleans all incoming requests
   - [src/utils/sanitize.js](src/utils/sanitize.js) - Sanitization functions
   - Removes MongoDB operators (`$where`, `$regex`, etc.)
   - Escapes regex special characters
   - Validates ObjectIds

2. **Authentication**
   - JWT tokens with expiration
   - Separate access (1 day) and refresh (7 days) tokens
   - Email verification required
   - Account lockout after 5 failed attempts

3. **Authorization**
   - RBAC middleware checks permissions
   - Users can only access their own data
   - Route-level protection

4. **Data Validation**
   - express-validator for input validation
   - Mongoose schema validation
   - Password strength requirements
   - File type and size validation

5. **Security Headers**
   - Helmet for security headers
   - CORS with whitelist
   - Rate limiting
   - Request size limits

---

## 🔒 Security Implementation

### Recent Security Fixes (October 2025)

✅ **NoSQL Injection Prevention**
- All search queries now sanitized
- User inputs cleaned before database queries
- MongoDB operators removed from inputs

✅ **JWT Authentication Fixed**
- Socket.io now uses correct JWT secret
- Payload fields corrected (userId, isVerified)

✅ **Password Security Enhanced**
- Reset requires 8+ characters with complexity
- Token expiration extended to 60 minutes

✅ **File Upload Protection**
- Path traversal attacks prevented
- Filename validation added
- Directory boundary checks

✅ **Dependencies Updated**
- nodemailer updated to 7.0.7
- 0 vulnerabilities in npm audit

### Security Best Practices

**For Development:**
```javascript
// ✅ GOOD - Use sanitization
const { sanitizeSearchQuery } = require('../utils/sanitize');
const sanitized = sanitizeSearchQuery(req.query.search);
User.find({ name: { $regex: sanitized, $options: 'i' } });

// ❌ BAD - Direct user input in regex
User.find({ name: { $regex: req.query.search, $options: 'i' } });
```

```javascript
// ✅ GOOD - Check authorization
if (session.coachId.toString() !== req.user.id) {
  return res.status(403).json({ message: 'Access denied' });
}

// ❌ BAD - No authorization check
const session = await TrainingSession.findById(req.params.id);
```

**Before Production:**
- [ ] Read [IMMEDIATE_ACTION_REQUIRED.md](IMMEDIATE_ACTION_REQUIRED.md)
- [ ] Rotate ALL secrets in .env
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS
- [ ] Update CORS origins
- [ ] Set up monitoring

See [SECURITY.md](SECURITY.md) for complete security documentation.

---

## 🛠️ What's Next

### High Priority (Next 2 Weeks)

1. **Complete Training System**
   - Finish training request acceptance workflow
   - Implement session scheduling
   - Add session status updates
   - Build earnings calculation

   **Files to work on:**
   - [src/modules/coach/controllers/coachController.js](src/modules/coach/controllers/coachController.js)
   - [src/modules/coach/models/TrainingSession.js](src/modules/coach/models/TrainingSession.js)

2. **Complete Specialist System**
   - Consultation request workflow
   - Session management
   - Program creation (treatment plans, meal plans, etc.)

   **Files to work on:**
   - [src/modules/specialist/controllers/specialistController.js](src/modules/specialist/controllers/specialistController.js)
   - [src/modules/specialist/models/ConsultationSession.js](src/modules/specialist/models/ConsultationSession.js)

3. **Finish Club Features**
   - Member acceptance/rejection
   - Job application workflow
   - Interview scheduling
   - Facility booking system

   **Files to work on:**
   - [src/modules/club/controllers/clubController.js](src/modules/club/controllers/clubController.js)
   - [src/modules/club/models/JobApplication.js](src/modules/club/models/JobApplication.js)

### Medium Priority (Next Month)

4. **Real-time Messaging**
   - Complete Socket.io integration
   - Implement conversation management
   - Add typing indicators
   - Build message reactions

   **Files to work on:**
   - [src/controllers/messageController.js](src/controllers/messageController.js)
   - [src/config/socket.js](src/config/socket.js)

5. **Notification System**
   - In-app notifications
   - Email notifications
   - Push notifications (later)
   - Notification preferences

   **Files to work on:**
   - [src/controllers/notificationController.js](src/controllers/notificationController.js)
   - [src/models/Notification.js](src/models/Notification.js)

6. **Advanced Search**
   - Complete search controller
   - Add proximity search
   - Implement filters (location, price, rating)
   - Add autocomplete

   **Files to work on:**
   - [src/controllers/searchController.js](src/controllers/searchController.js)

### Low Priority (Later)

7. **Rating & Review System**
   - Complete review controller
   - Add review responses
   - Implement helpful votes
   - Build reputation system

8. **File Upload System**
   - Image galleries
   - Video uploads
   - Document storage
   - Media management

9. **Analytics**
   - Profile view tracking
   - Earnings analytics
   - User insights
   - Platform metrics

10. **Localization**
    - Arabic translations
    - RTL support
    - Language switching
    - Bilingual content

See [PROJECT-BRIEF.md](PROJECT-BRIEF.md) for the complete roadmap.

---

## 📝 Common Tasks

### Adding a New API Endpoint

**Example: Add a new endpoint to get coach statistics**

1. **Create the controller method:**

```javascript
// src/modules/coach/controllers/coachController.js

exports.getStatistics = async (req, res) => {
  try {
    const coachId = req.user.id;

    // Get statistics
    const totalSessions = await TrainingSession.countDocuments({
      coachId,
      status: 'completed'
    });

    const totalStudents = await CoachStudent.countDocuments({
      coachId,
      status: 'active'
    });

    const totalEarnings = await CoachEarnings.aggregate([
      { $match: { coachId: mongoose.Types.ObjectId(coachId) } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      success: true,
      statistics: {
        totalSessions,
        totalStudents,
        totalEarnings: totalEarnings[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
};
```

2. **Add the route:**

```javascript
// src/modules/coach/routes/coach.routes.js

const { authenticate, authorize } = require('../../middleware/auth');
const { getStatistics } = require('../controllers/coachController');

router.get('/statistics',
  authenticate,           // Check authentication
  authorize('coach'),     // Check role
  getStatistics          // Execute controller
);
```

3. **Test it:**

```bash
curl -X GET http://localhost:4000/api/v1/coach/statistics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Adding Input Validation

**Example: Validate a training request**

```javascript
// src/middleware/validation.js

const { body } = require('express-validator');

exports.validateTrainingRequest = [
  body('coachId')
    .notEmpty()
    .withMessage('Coach ID is required')
    .isMongoId()
    .withMessage('Invalid coach ID'),

  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 500 })
    .withMessage('Message cannot exceed 500 characters'),

  body('proposedPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  handleValidationErrors  // Check for errors
];

// Use it in routes:
router.post('/requests',
  authenticate,
  validateTrainingRequest,  // Add validation
  createTrainingRequest
);
```

### Working with File Uploads

**Example: Upload a profile photo**

```javascript
// Controller
const { uploadAvatar, processAvatar } = require('../middleware/upload');

exports.uploadPhoto = [
  uploadAvatar,           // Handle multipart/form-data
  processAvatar,          // Process and optimize image
  async (req, res) => {
    try {
      // File info is in req.processedFile
      const user = await User.findById(req.user.id);

      // Delete old avatar if exists
      if (user.avatar) {
        await cleanupOldAvatar(user.avatar);
      }

      // Update avatar URL
      user.avatar = req.processedFile.url;
      await user.save();

      res.json({
        success: true,
        avatar: user.avatar
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Upload failed'
      });
    }
  }
];

// Route
router.post('/upload-photo',
  authenticate,
  exports.uploadPhoto
);
```

### Sending Emails

```javascript
const emailService = require('../utils/email');

// Send custom email
await emailService.sendEmail({
  to: user.email,
  subject: 'Welcome to SportX!',
  html: '<h1>Welcome!</h1><p>We're excited to have you.</p>'
});

// Use template (add template in email.js first)
await emailService.sendSessionReminder(user, session);
```

### Using the Logger

```javascript
const logger = require('../utils/logger');

// Different log levels
logger.info('User logged in', { userId: user.id, email: user.email });
logger.warn('Suspicious activity detected', { ip: req.ip });
logger.error('Database connection failed', { error: err.message });

// In production, logs go to files
// In development, logs go to console
```

---

## 🐛 Troubleshooting

### MongoDB Connection Issues

**Problem:** "MongooseServerSelectionError: connect ECONNREFUSED"

**Solutions:**
```bash
# 1. Check if MongoDB is running
brew services list  # macOS
sudo systemctl status mongod  # Linux

# 2. Start MongoDB
brew services start mongodb-community  # macOS
sudo systemctl start mongod  # Linux

# 3. Check connection string in .env
# Make sure it's correct and IP is whitelisted (MongoDB Atlas)

# 4. Test connection
mongosh "YOUR_CONNECTION_STRING"
```

### JWT Token Issues

**Problem:** "Invalid token" or "Token expired"

**Solutions:**
```bash
# 1. Check if JWT secrets are set in .env
echo $JWT_ACCESS_SECRET
echo $JWT_REFRESH_SECRET

# 2. Make sure secrets match between server restarts

# 3. Clear expired tokens and re-login

# 4. Check token format: "Bearer YOUR_TOKEN"
curl -H "Authorization: Bearer eyJhbGc..." http://localhost:4000/api/v1/auth/profile
```

### Email Not Sending

**Problem:** "Failed to send email"

**Solutions:**
```bash
# 1. Check SMTP credentials in .env
# For Gmail, use App Password (not regular password)
# Go to: Google Account → Security → 2-Step Verification → App Passwords

# 2. Enable "Less secure app access" (not recommended)
# Or use App Password (recommended)

# 3. Check if email service is configured
# See src/utils/email.js

# 4. Test email sending
node -e "
const email = require('./src/utils/email');
email.sendEmail({
  to: 'test@example.com',
  subject: 'Test',
  html: '<p>Test email</p>'
}).then(() => console.log('Sent!')).catch(console.error);
"
```

### Port Already in Use

**Problem:** "Error: listen EADDRINUSE: address already in use :::4000"

**Solutions:**
```bash
# Find process using port 4000
lsof -i :4000

# Kill the process
kill -9 <PID>

# Or use a different port in .env
PORT=4001
```

### File Upload Issues

**Problem:** "File too large" or "Invalid file type"

**Solutions:**
```javascript
// Check file size limits in src/middleware/upload.js
limits: {
  fileSize: 5 * 1024 * 1024, // 5MB - increase if needed
}

// Check allowed file types
const allowedMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
  // Add more types if needed
];
```

### Dependencies Issues

**Problem:** npm install errors

**Solutions:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Update npm
npm install -g npm@latest

# Check Node version (should be v18+)
node --version
```

---

## 💡 Tips & Best Practices

### Code Style

```javascript
// ✅ GOOD - Use async/await
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ❌ BAD - Don't use callbacks
exports.getUser = (req, res) => {
  User.findById(req.params.id, (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ user });
  });
};
```

### Error Handling

```javascript
// ✅ GOOD - Specific error messages
if (!coach) {
  return res.status(404).json({
    success: false,
    message: 'Coach not found',
    code: 'COACH_NOT_FOUND'
  });
}

// ❌ BAD - Generic errors
if (!coach) {
  throw new Error('Error');
}
```

### Database Queries

```javascript
// ✅ GOOD - Use select to exclude sensitive fields
const user = await User.findById(id).select('-password -resetToken');

// ✅ GOOD - Use lean() for read-only queries (faster)
const users = await User.find().lean();

// ✅ GOOD - Use pagination
const users = await User.find()
  .skip((page - 1) * limit)
  .limit(limit);

// ❌ BAD - Load all data without pagination
const users = await User.find();  // Could be millions of records!
```

### Security

```javascript
// ✅ GOOD - Always sanitize user input
const { sanitizeSearchQuery } = require('../utils/sanitize');
const query = sanitizeSearchQuery(req.query.q);

// ✅ GOOD - Check ownership before updates
if (session.coachId.toString() !== req.user.id) {
  return res.status(403).json({ message: 'Access denied' });
}

// ✅ GOOD - Use environment variables
const secret = process.env.JWT_ACCESS_SECRET;

// ❌ BAD - Hardcode secrets
const secret = 'my-secret-key';  // NEVER DO THIS!
```

---

## 📚 Additional Resources

### Documentation
- [PROJECT-BRIEF.md](PROJECT-BRIEF.md) - Complete project specification
- [SECURITY.md](SECURITY.md) - Security best practices
- [SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md) - Recent security fixes

### External Links
- [Express.js Docs](https://expressjs.com/)
- [Mongoose Docs](https://mongoosejs.com/docs/)
- [Socket.io Docs](https://socket.io/docs/)
- [JWT Best Practices](https://jwt.io/introduction)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Cloudinary Docs](https://cloudinary.com/documentation)

### Learning Resources
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [RESTful API Design](https://restfulapi.net/)
- [MongoDB University](https://university.mongodb.com/) - Free courses
- [Postman Learning](https://learning.postman.com/)

---

## 🆘 Need Help?

### Contact Information

**Original Developer:**
- **Name:** Hazem Salama
- **Email:** HazemSalama108@gmail.com
- **Phone:** +201092637808

Feel free to reach out if you:
- Have questions about the codebase
- Need clarification on features
- Find bugs or security issues
- Want to discuss architecture decisions

**Response Time:** Usually within 24-48 hours

### Getting Unstuck

1. **Check the docs first:**
   - [PROJECT-BRIEF.md](PROJECT-BRIEF.md) for feature specs
   - [SECURITY.md](SECURITY.md) for security questions
   - This guide for common issues

2. **Search the codebase:**
   ```bash
   # Find similar implementations
   grep -r "functionName" src/

   # Find where a model is used
   grep -r "TrainingSession" src/
   ```

3. **Test in isolation:**
   - Use Postman to test endpoints
   - Write simple test scripts
   - Console.log for debugging (but use logger in production!)

4. **Ask for help:**
   - Email me with specific questions
   - Include error messages and relevant code
   - Share what you've already tried

### Reporting Issues

If you find a bug or security issue:

1. **For security issues:**
   - Email me directly (don't create public issues)
   - Include steps to reproduce
   - Mark as urgent if critical

2. **For feature requests:**
   - Check if it's in [PROJECT-BRIEF.md](PROJECT-BRIEF.md) roadmap
   - Document why it's needed
   - Consider if it fits the platform vision

3. **For bugs:**
   - Describe what should happen
   - Describe what actually happens
   - Include error messages
   - Share steps to reproduce

---

## 🎉 Final Notes

### What Makes This Project Special

This isn't just another CRUD app - it's building something meaningful:
- **First-of-its-kind** in the MENA region
- **Solves real problems** for sports professionals
- **Complex workflows** that connect multiple user types
- **Opportunity to learn** advanced Node.js patterns

### Your Mission

As the next developer, you're not just maintaining code - you're:
- **Building careers** for coaches and specialists
- **Creating opportunities** for athletes
- **Connecting communities** through sports
- **Empowering growth** in the sports industry

### Words of Encouragement

The foundation is solid, the architecture is clean, and security is locked down. You have:
- ✅ Working authentication system
- ✅ Role-based architecture
- ✅ Security best practices
- ✅ Clean code structure
- ✅ Comprehensive documentation

**You've got this!** 🚀

Take it one feature at a time, test thoroughly, and don't hesitate to reach out. The sports community in Egypt is counting on you to make this platform amazing.

---

## 📋 Quick Start Checklist

- [ ] Read this entire guide
- [ ] Review [PROJECT-BRIEF.md](PROJECT-BRIEF.md)
- [ ] Read [SECURITY.md](SECURITY.md)
- [ ] Clone and install dependencies
- [ ] Set up `.env` with new secrets
- [ ] Connect to MongoDB
- [ ] Run the application
- [ ] Test with Postman
- [ ] Explore the codebase
- [ ] Pick your first task from "What's Next"
- [ ] Reach out if you have questions

---

**Document Version:** 1.0
**Created:** October 12, 2025
**Author:** Hazem Salama
**For:** Next Developer

**Good luck, and happy coding! 🏆**
