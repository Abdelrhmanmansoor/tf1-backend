# 🏗️ SportX Platform - Job Publisher Module: Architecture Map

## Executive Summary
**Status**: Production-Ready with Critical Fixes Required
**Technology Stack**: Node.js 24.x + Express 5.x + MongoDB 8.x + Redis 5.x
**Architecture**: Modular Microservices-Ready Backend
**Auth**: JWT + Passport.js
**Real-time**: Socket.io

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SPORTX PLATFORM API                       │
│                      (Port: 4000)                            │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
   │  Auth   │          │ Job Pub │          │  Admin  │
   │ Service │          │ Module  │          │ Service │
   └─────────┘          └────┬────┘          └─────────┘
                             │
     ┌───────────────────────┼───────────────────────┐
     │                       │                       │
┌────▼────┐            ┌────▼────┐            ┌────▼────┐
│Subscrip │            │Automat  │            │Messaging│
│ Engine  │            │ Engine  │            │ Service │
└─────────┘            └─────────┘            └─────────┘
```

---

## 2. Job Publisher Module: Complete API Catalog

### 2.1 Dashboard & Analytics

| Method | Endpoint | Auth | Subscription | Description |
|--------|----------|------|--------------|-------------|
| GET | `/api/v1/job-publisher/dashboard` | ✅ | Any | Main dashboard with stats |
| GET | `/api/v1/job-publisher/dashboard/stats` | ✅ | Any | Detailed statistics |
| GET | `/api/v1/job-publisher/analytics/overview` | ✅ | Pro+ | Advanced analytics |
| GET | `/api/v1/job-publisher/analytics/trends` | ✅ | Pro+ | Hiring trends |
| GET | `/api/v1/job-publisher/analytics/export` | ✅ | Pro+ | Export analytics data |

### 2.2 Jobs Management

| Method | Endpoint | Auth | Subscription | Description |
|--------|----------|------|--------------|-------------|
| GET | `/api/v1/job-publisher/jobs` | ✅ | Any | List all jobs (pagination) |
| POST | `/api/v1/job-publisher/jobs` | ✅ | Check Limit | Create new job |
| GET | `/api/v1/job-publisher/jobs/:jobId` | ✅ | Any | Get job details |
| PUT | `/api/v1/job-publisher/jobs/:jobId` | ✅ | Any | Update job |
| DELETE | `/api/v1/job-publisher/jobs/:jobId` | ✅ | Any | Soft delete job |
| POST | `/api/v1/job-publisher/jobs/:jobId/duplicate` | ✅ | Check Limit | Duplicate job |
| POST | `/api/v1/job-publisher/jobs/:jobId/publish` | ✅ | Any | Publish draft job |
| POST | `/api/v1/job-publisher/jobs/:jobId/close` | ✅ | Any | Close job |

### 2.3 Applications Management

| Method | Endpoint | Auth | Subscription | Description |
|--------|----------|------|--------------|-------------|
| GET | `/api/v1/job-publisher/applications` | ✅ | Any | List all applications |
| GET | `/api/v1/job-publisher/jobs/:jobId/applications` | ✅ | Any | Applications for specific job |
| GET | `/api/v1/job-publisher/applications/:applicationId` | ✅ | Any | Application details |
| PUT | `/api/v1/job-publisher/applications/:applicationId/status` | ✅ | Any | Update application status |
| POST | `/api/v1/job-publisher/applications/:applicationId/notes` | ✅ | Any | Add private notes |
| POST | `/api/v1/job-publisher/applications/:applicationId/rating` | ✅ | Basic+ | Rate candidate |
| POST | `/api/v1/job-publisher/applications/:applicationId/share` | ✅ | Pro+ | Share with team |
| POST | `/api/v1/job-publisher/applications/bulk-action` | ✅ | Basic+ | Bulk status update |

### 2.4 Profile Management

| Method | Endpoint | Auth | Subscription | Description |
|--------|----------|------|--------------|-------------|
| POST | `/api/v1/job-publisher/profile/create` | ✅ | Any | Create profile |
| GET | `/api/v1/job-publisher/profile` | ✅ | Any | Get my profile |
| PUT | `/api/v1/job-publisher/profile` | ✅ | Any | Update profile |
| POST | `/api/v1/job-publisher/profile/upload-logo` | ✅ | Any | Upload company logo |
| POST | `/api/v1/job-publisher/profile/upload-work-photo` | ✅ | Basic+ | Upload work photos |
| POST | `/api/v1/job-publisher/profile/upload-document` | ✅ | Any | Upload verification docs |
| POST | `/api/v1/job-publisher/profile/verify-national-address` | ✅ | Any | Verify Saudi address |
| POST | `/api/v1/job-publisher/profile/add-award` | ✅ | Basic+ | Add awards |
| POST | `/api/v1/job-publisher/profile/add-testimonial` | ✅ | Pro+ | Add testimonials |
| GET | `/api/v1/job-publisher/profile/statistics` | ✅ | Any | Profile stats |
| PUT | `/api/v1/job-publisher/profile/mark-complete` | ✅ | Any | Mark profile complete |
| GET | `/api/v1/job-publisher/profile/public/:publisherId` | - | - | Public profile view |

### 2.5 Subscription Management (Publisher APIs)

| Method | Endpoint | Auth | Subscription | Description |
|--------|----------|------|--------------|-------------|
| GET | `/api/v1/publisher/subscription` | ✅ | Any | Get current subscription |
| GET | `/api/v1/publisher/subscription/tiers` | - | - | Available tiers |
| GET | `/api/v1/publisher/subscription/usage` | ✅ | Any | Current usage stats |
| POST | `/api/v1/publisher/subscription/upgrade` | ✅ | Any | Upgrade tier |
| POST | `/api/v1/publisher/subscription/downgrade` | ✅ | Any | Downgrade tier |
| POST | `/api/v1/publisher/subscription/cancel` | ✅ | Any | Cancel subscription |
| GET | `/api/v1/publisher/subscription/invoices` | ✅ | Any | Billing history |
| POST | `/api/v1/publisher/subscription/payment-method` | ✅ | Any | Update payment |

### 2.6 Automation Management (NEW - To Be Created)

| Method | Endpoint | Auth | Subscription | Description |
|--------|----------|------|--------------|-------------|
| GET | `/api/v1/publisher/automations` | ✅ | Basic+ | List automation rules |
| POST | `/api/v1/publisher/automations` | ✅ | Basic+ | Create rule |
| GET | `/api/v1/publisher/automations/:id` | ✅ | Basic+ | Get rule details |
| PUT | `/api/v1/publisher/automations/:id` | ✅ | Basic+ | Update rule |
| DELETE | `/api/v1/publisher/automations/:id` | ✅ | Basic+ | Delete rule |
| POST | `/api/v1/publisher/automations/:id/toggle` | ✅ | Basic+ | Enable/disable rule |
| POST | `/api/v1/publisher/automations/:id/test` | ✅ | Basic+ | Test rule |
| GET | `/api/v1/publisher/automations/templates` | ✅ | Basic+ | Get rule templates |
| GET | `/api/v1/publisher/automations/:id/logs` | ✅ | Pro+ | Execution logs |
| GET | `/api/v1/publisher/automations/statistics` | ✅ | Pro+ | Automation analytics |

### 2.7 Interviews Management (Integration with Interviews Module)

| Method | Endpoint | Auth | Subscription | Description |
|--------|----------|------|--------------|-------------|
| GET | `/api/v1/publisher/interviews` | ✅ | Any | List all interviews |
| POST | `/api/v1/publisher/interviews` | ✅ | Check Limit | Schedule interview |
| GET | `/api/v1/publisher/interviews/:id` | ✅ | Any | Interview details |
| PUT | `/api/v1/publisher/interviews/:id` | ✅ | Any | Update interview |
| POST | `/api/v1/publisher/interviews/:id/reschedule` | ✅ | Any | Reschedule |
| DELETE | `/api/v1/publisher/interviews/:id/cancel` | ✅ | Any | Cancel interview |
| POST | `/api/v1/publisher/interviews/:id/feedback` | ✅ | Any | Submit feedback |
| POST | `/api/v1/publisher/interviews/:id/reminders/send` | ✅ | Basic+ | Send reminder |
| GET | `/api/v1/publisher/interviews/statistics` | ✅ | Pro+ | Interview analytics |

### 2.8 Messaging (Integration with Messaging Module)

| Method | Endpoint | Auth | Subscription | Description |
|--------|----------|------|--------------|-------------|
| GET | `/api/v1/publisher/messages/threads` | ✅ | Any | List message threads |
| POST | `/api/v1/publisher/messages/threads` | ✅ | Any | Create thread |
| GET | `/api/v1/publisher/messages/threads/:id` | ✅ | Any | Get thread |
| POST | `/api/v1/publisher/messages/threads/:id/messages` | ✅ | Any | Send message |
| PATCH | `/api/v1/publisher/messages/messages/:id/read` | ✅ | Any | Mark as read |
| GET | `/api/v1/publisher/messages/unread-count` | ✅ | Any | Unread count |
| GET | `/api/v1/publisher/messages/templates` | ✅ | Basic+ | Message templates |

### 2.9 Notifications

| Method | Endpoint | Auth | Subscription | Description |
|--------|----------|------|--------------|-------------|
| GET | `/api/v1/publisher/notifications` | ✅ | Any | List notifications |
| PATCH | `/api/v1/publisher/notifications/:id/read` | ✅ | Any | Mark as read |
| PATCH | `/api/v1/publisher/notifications/mark-all-read` | ✅ | Any | Mark all read |
| GET | `/api/v1/publisher/notification-preferences` | ✅ | Any | Get preferences |
| PATCH | `/api/v1/publisher/notification-preferences` | ✅ | Any | Update preferences |

---

## 3. Admin Platform APIs (NEW - To Be Created)

### 3.1 Subscription Administration

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/v1/admin/subscriptions` | ✅ | Admin | List all subscriptions |
| GET | `/api/v1/admin/subscriptions/:publisherId` | ✅ | Admin | Get subscription |
| POST | `/api/v1/admin/subscriptions/:publisherId` | ✅ | Admin | Create subscription |
| PUT | `/api/v1/admin/subscriptions/:publisherId/tier` | ✅ | Admin | Change tier |
| POST | `/api/v1/admin/subscriptions/:publisherId/extend-trial` | ✅ | Admin | Extend trial |
| POST | `/api/v1/admin/subscriptions/:publisherId/suspend` | ✅ | Admin | Suspend account |
| POST | `/api/v1/admin/subscriptions/:publisherId/reactivate` | ✅ | Admin | Reactivate account |
| PUT | `/api/v1/admin/subscriptions/:publisherId/limits` | ✅ | Admin | Update limits |
| GET | `/api/v1/admin/subscriptions/expiring` | ✅ | Admin | Expiring soon |
| GET | `/api/v1/admin/subscriptions/stats` | ✅ | Admin | Revenue analytics |

### 3.2 Plan Management

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/v1/admin/plans` | ✅ | Admin | List all plans |
| POST | `/api/v1/admin/plans` | ✅ | SuperAdmin | Create plan |
| PUT | `/api/v1/admin/plans/:planId` | ✅ | SuperAdmin | Update plan |
| DELETE | `/api/v1/admin/plans/:planId` | ✅ | SuperAdmin | Archive plan |
| POST | `/api/v1/admin/plans/:planId/features` | ✅ | SuperAdmin | Update features |
| GET | `/api/v1/admin/plans/:planId/subscribers` | ✅ | Admin | Plan subscribers |

### 3.3 Publisher Management

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/v1/admin/publishers` | ✅ | Admin | List publishers |
| GET | `/api/v1/admin/publishers/:id` | ✅ | Admin | Publisher details |
| PUT | `/api/v1/admin/publishers/:id/status` | ✅ | Admin | Update status |
| GET | `/api/v1/admin/publishers/:id/activity` | ✅ | Admin | Activity log |
| POST | `/api/v1/admin/publishers/:id/notes` | ✅ | Admin | Add admin note |
| GET | `/api/v1/admin/publishers/:id/jobs` | ✅ | Admin | Publisher jobs |
| GET | `/api/v1/admin/publishers/:id/applications` | ✅ | Admin | Publisher apps |
| GET | `/api/v1/admin/publishers/statistics` | ✅ | Admin | Platform stats |

### 3.4 Automation Administration

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/v1/admin/automations` | ✅ | Admin | All automation rules |
| GET | `/api/v1/admin/automations/:id/logs` | ✅ | Admin | Execution logs |
| POST | `/api/v1/admin/automations/:id/force-disable` | ✅ | Admin | Force disable rule |
| GET | `/api/v1/admin/automations/statistics` | ✅ | Admin | Automation stats |
| GET | `/api/v1/admin/automations/failures` | ✅ | Admin | Failed executions |

---

## 4. Data Flow Architecture

### 4.1 Job Creation Flow

```
Publisher → POST /jobs → subscriptionCheck.js → checkUsageLimit('activeJobs')
                                ↓
                         jobPublisherController.createJob()
                                ↓
                         Job.create() → MongoDB
                                ↓
                    Notification to potential applicants
                                ↓
                    Increment usage counter
                                ↓
                    Return success response
```

### 4.2 Application Status Update Flow

```
Publisher → PUT /applications/:id/status → applicationController
                                ↓
                    Validate status transition
                                ↓
                    Update application in DB
                                ↓
                    afterApplicationUpdate() → automationEngine
                                ↓
            ┌───────────────────┼───────────────────┐
            │                   │                   │
    Create Thread      Send Notification     Schedule Interview
            │                   │                   │
            ▼                   ▼                   ▼
    MessageThread         Notification          Interview
```

### 4.3 Subscription Enforcement Flow

```
API Request → auth.js → subscriptionCheck.js
                              ↓
                    Check subscription status
                              ↓
                    Check feature access
                              ↓
                    Check usage limits
                              ↓
                    ├─ PASS → Continue to controller
                    │
                    └─ FAIL → Return 403 Forbidden
```

---

## 5. Integration Points

### 5.1 External Integrations
- **Stripe/Payment Gateway**: Subscription billing (placeholder ready)
- **National Address API**: Saudi address verification (implemented)
- **Cloudinary**: File uploads (implemented)
- **OpenAI**: AI-powered features (implemented)
- **Email Service**: Nodemailer (implemented)
- **SMS Provider**: SMS notifications (placeholder)

### 5.2 Internal Module Dependencies

```
job-publisher
├── auth (authentication)
├── subscriptions (billing & limits)
├── automation (workflows)
├── interviews (scheduling)
├── messaging (communication)
├── notifications (alerts)
├── admin-features (feature toggles)
└── shared (User model)
```

---

## 6. Security Architecture

### 6.1 Authentication Layers
1. **JWT Token** (Authorization header)
2. **Role-based Access Control** (RBAC)
3. **Subscription-based Access Control** (SBAC)
4. **Rate Limiting** (Express Rate Limit)
5. **CSRF Protection** (Custom middleware)
6. **Input Validation** (Express Validator + Joi)

### 6.2 File Upload Security
- **Current Issues**:
  - ❌ No magic bytes validation
  - ❌ 10MB limit too large
  - ❌ No virus scanning
  - ❌ Local storage in production

- **Required Fixes**:
  - ✅ Magic bytes validation
  - ✅ 2MB limit for images
  - ✅ Virus scanning integration
  - ✅ Cloud storage abstraction

---

## 7. Database Schema Overview

### 7.1 Core Collections

```
job-publisher-profiles
subscriptions
jobs
job-applications
automation-rules
interviews
message-threads
messages
notifications
notification-templates
feature-toggles
users
```

### 7.2 Relationships

```
JobPublisherProfile → User (1:1)
Subscription → User (1:1)
Job → JobPublisherProfile (N:1)
JobApplication → Job (N:1)
JobApplication → User (N:1)
Interview → JobApplication (1:1)
MessageThread → JobApplication (1:1)
AutomationRule → JobPublisherProfile (N:1)
```

---

## 8. Performance Considerations

### 8.1 Caching Strategy
- **Redis Cache**: Session storage, rate limiting
- **In-Memory Cache**: Subscription tier limits
- **Query Caching**: Dashboard statistics (5 min TTL)

### 8.2 Database Indexing
```javascript
// Critical Indexes
subscriptions: { publisherId: 1, status: 1 }
jobs: { publishedBy: 1, status: 1, isDeleted: 1 }
job-applications: { jobId: 1, status: 1, isDeleted: 1 }
automation-rules: { publisherId: 1, isActive: 1, event: 1 }
```

---

## 9. Monitoring & Observability

### 9.1 Logging
- **Winston**: Structured logging
- **Log Levels**: error, warn, info, debug
- **Log Destinations**: Console, File, External (Sentry)

### 9.2 Metrics (To Be Implemented)
- API response times
- Subscription conversion rates
- Automation execution success rate
- Error rates by endpoint
- Active users per tier

---

## 10. Deployment Architecture

```
┌────────────────────────────────────────────┐
│           Load Balancer (Nginx)            │
└────────────────┬───────────────────────────┘
                 │
    ┌────────────┼────────────┐
    │                         │
┌───▼────┐               ┌───▼────┐
│ API    │               │ API    │
│ Server │◄─────────────►│ Server │
│ Node 1 │   (Socket.io) │ Node 2 │
└───┬────┘               └───┬────┘
    │                         │
    └────────────┬────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
┌───▼────┐  ┌───▼────┐  ┌───▼────┐
│MongoDB │  │ Redis  │  │  S3/   │
│Replica │  │ Cluster│  │Cloudin │
└────────┘  └────────┘  └────────┘
```

---

## 11. Technology Stack Details

```yaml
Runtime:
  - Node.js: 24.12.0
  - Express: 5.1.0

Database:
  - MongoDB: 8.18.1
  - Redis: 5.8.2

Authentication:
  - JWT: jsonwebtoken@9.0.2
  - Passport: passport@0.7.0

File Handling:
  - Multer: 2.0.2
  - Cloudinary: 1.41.3
  - Sharp: 0.34.3

Communication:
  - Socket.io: 4.8.1
  - Nodemailer: 7.0.6

Validation:
  - Joi: 18.0.1
  - Express Validator: 7.2.1
  - Zod: 4.3.5

Monitoring:
  - Winston: 3.19.0
  - Sentry: 10.11.0

Payment (Ready):
  - Stripe: Placeholder ready

AI/ML:
  - OpenAI: 6.15.0
```

---

## 12. Current Status Assessment

### ✅ Implemented & Working
- Authentication & Authorization
- Job CRUD operations
- Application management
- Profile management
- Subscription model (data structure)
- Automation engine (core logic)
- Messaging integration
- Notifications system
- National address verification

### ⚠️ Implemented but Needs Fixes
- Subscription enforcement (not applied to all routes)
- File upload security (weak validation)
- Model naming conflicts (Conversation/Message)
- Duplicate imports in controllers
- Missing usage tracking

### ❌ Missing & Required
- Admin platform APIs (0% implemented)
- Automation management APIs (0% implemented)
- Analytics & reporting APIs (0% implemented)
- Swagger documentation (0% implemented)
- Unit/Integration tests (minimal)
- Subscription usage auto-increment
- Proper error tracking (Sentry config)

---

## 13. Critical Issues Summary

### 🔴 CRITICAL (Must Fix Before Production)
1. MongoDB connection issue (ENV configuration)
2. No subscription check on job creation
3. Weak file upload security
4. Model naming conflicts (runtime errors)
5. Missing admin APIs (platform unusable)

### 🟡 HIGH PRIORITY
6. No usage tracking implementation
7. Missing automation management APIs
8. No proper error tracking
9. Missing rate limiting on uploads
10. No API documentation

### 🟢 MEDIUM PRIORITY
11. Missing analytics APIs
12. No bulk operations
13. Limited admin controls
14. No audit logging
15. Missing webhooks support

---

## 14. API Standards

### Request Format
```json
{
  "data": {},
  "metadata": {
    "requestId": "uuid",
    "timestamp": "ISO-8601"
  }
}
```

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {},
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "SUBSCRIPTION_REQUIRED",
    "message": "Active subscription required",
    "details": {},
    "timestamp": "ISO-8601"
  }
}
```

---

**Document Version**: 1.0.0
**Last Updated**: 2026-01-17
**Maintained By**: Senior Backend Team
