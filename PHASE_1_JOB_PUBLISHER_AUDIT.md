# Phase 1: Full Audit & Mapping - Job Publisher System

**Date:** January 11, 2026  
**Auditor:** Replit Agent  
**Scope:** Job Publisher (Employer/Club) Role + Job Seeker (Applicant) Interoperability

---

## 1. CODEBASE MAP

### 1.1 Database Models

| Model | Location | Description |
|-------|----------|-------------|
| Job | `src/modules/club/models/Job.js` | Job posting with full details, requirements, status tracking |
| JobApplication | `src/modules/club/models/JobApplication.js` | Application with pipeline stages, attachments, interview details |
| JobPublisherProfile | `src/modules/job-publisher/models/JobPublisherProfile.js` | Publisher company profile with verification |
| User | `src/modules/shared/models/User.js` | Base user model with role field |

### 1.2 API Routes

| Route Path | Module | Description |
|------------|--------|-------------|
| `/api/v1/jobs` | `src/routes/jobs.js` | Public job listing, applying, application management |
| `/api/v1/job-publisher/*` | `src/modules/job-publisher/routes/jobPublisherRoutes.js` | Publisher dashboard, jobs CRUD, applications |
| `/api/v1/job-publisher/profile/*` | `src/modules/job-publisher/routes/profileRoutes.js` | Publisher profile management |
| `/api/v1/applicant/*` | `src/modules/applicant/routes/applicantRoutes.js` | Applicant dashboard, applications, available jobs |
| `/api/v1/clubs/jobs` | `src/modules/club/routes/jobRoutes.js` | Club-specific job management |

### 1.3 Controllers

| Controller | Location | Functions |
|------------|----------|-----------|
| **Job Publisher Controllers** | | |
| jobPublisherController | `src/modules/job-publisher/controllers/` | getDashboard, getMyJobs, createJob, updateJob, deleteJob, getJobApplications, updateApplicationStatus |
| applicationController | `src/modules/job-publisher/controllers/` | updateApplicationStatus, getApplications, getJobApplications, getDashboardStats, getApplicationDetails |
| jobPublisherProfileController | `src/modules/job-publisher/controllers/` | createProfile, getProfile, updateProfile, uploadLogo, uploadDocument, verifyNationalAddress |
| **Applicant Controllers** | | |
| applicantController | `src/modules/applicant/controllers/applicantController.js` | getDashboard, getMyApplications, getApplicationDetails, withdrawApplication, getAvailableJobs |
| **Public Controllers** | | |
| jobsController | `src/controllers/jobsController.js` | getJobs, getJobById, applyToJob, getMyApplications, withdrawApplication |

### 1.4 Frontend Pages

| Page | Location | Role Access | Status |
|------|----------|-------------|--------|
| Jobs.jsx | `frontend/app/src/pages/Jobs.jsx` | Public - Browse & apply to jobs | ✅ Exists |
| ClubDashboard.jsx | `frontend/app/src/pages/ClubDashboard.jsx` | Club role - Manage jobs & applications | ✅ Exists |
| JobPublisherDashboard | - | Job Publisher role | ❌ MISSING |
| ApplicantDashboard | - | Applicant role | ❌ MISSING |

### 1.5 Middleware & Security (VERIFIED)

| Middleware | Location | Function |
|------------|----------|----------|
| authenticate | `src/middleware/auth.js` | JWT authentication |
| rbac | `src/middleware/rbac.js` | Role-based access control with permission checks |
| sanitizeRequest | `src/middleware/sanitize.js` | NoSQL injection prevention, MongoDB operator blocking |
| blockMongoOperators | `src/middleware/sanitize.js` | Blocks `$where`, `$regex`, `$ne`, etc. |
| rateLimiter | `src/middleware/rateLimiter.js` | Rate limiting (verify coverage) |
| csrf | `src/middleware/csrf.js` | CSRF token validation |

### 1.6 Roles & Permissions

| Role | Key Permissions |
|------|-----------------|
| `admin` | All permissions |
| `club` | PUBLISH_JOBS, MANAGE_OWN_JOBS, VIEW_JOB_APPLICATIONS, MANAGE_RECRUITMENT |
| `job-publisher` | PUBLISH_JOBS, MANAGE_OWN_JOBS, VIEW_JOB_APPLICATIONS, VIEW_JOBS |
| `applicant` | VIEW_JOBS, APPLY_TO_JOBS, MANAGE_JOB_APPLICATIONS |

### 1.7 Auth Flow

- JWT-based authentication via `src/middleware/auth.js`
- Access tokens stored in sessionStorage
- Refresh tokens in httpOnly cookies
- CSRF protection for mutating requests
- Role-based middleware in `src/middleware/rbac.js`

---

## 2. ISSUE TRACKER TABLE

### 2.1 Critical Issues - Frontend (Severity: HIGH)

| # | Issue | Severity | Location | How to Reproduce | Fix Plan |
|---|-------|----------|----------|------------------|----------|
| 1 | **No Job Publisher Frontend Dashboard** | HIGH | `frontend/app/src/pages/` | Login as job-publisher role - no dashboard exists | Create `JobPublisherDashboard.jsx` connecting to existing `/api/v1/job-publisher/` backend |
| 2 | **No Applicant Frontend Dashboard** | HIGH | `frontend/app/src/pages/` | Login as applicant - no way to track applications (backend exists at `/api/v1/applicant/`) | Create `ApplicantDashboard.jsx` connecting to existing backend |
| 3 | **No route for job-publisher in App.jsx** | HIGH | `frontend/app/src/App.jsx` | job-publisher role has no dashboard route | Add `/dashboard/publisher` route |
| 4 | **No route for applicant in App.jsx** | HIGH | `frontend/app/src/App.jsx` | applicant role has no dashboard route | Add `/dashboard/applicant` route |
| 5 | **Duplicate updateApplicationStatus implementations** | HIGH | `jobPublisherController.js` (lines 307-466) + `applicationController.js` (lines 16-143) | Two different implementations with slightly different behaviors | Consolidate into single controller, remove duplicate |

### 2.2 API Reliability Issues (VERIFIED)

| # | Issue | Severity | Location | How to Reproduce | Fix Plan |
|---|-------|----------|----------|------------------|----------|
| 6 | **Inconsistent response format** | MEDIUM | Various controllers | `applicationController.getApplications` returns `{ applications }`, others return `{ data: { applications } }` | Standardize all to `{ success, data, message }` |
| 7 | **Duplicate endpoints for same functionality** | MEDIUM | `/api/v1/jobs/applications/:id/status` vs `/api/v1/job-publisher/applications/:id/status` | Both can update application status with different implementations | Consolidate, deprecate one |
| 8 | **Missing pagination on getDashboard applications** | LOW | `jobPublisherController.getDashboard` line 50-58 | `.limit(10)` without pagination params | Add pagination support |
| 9 | **No applicant service in frontend api.js** | MEDIUM | `frontend/app/src/config/api.js` | No endpoints for `/api/v1/applicant/*` | Add applicantService |
| 10 | **No jobPublisher service in frontend api.js** | MEDIUM | `frontend/app/src/config/api.js` | No endpoints for `/api/v1/job-publisher/*` | Add jobPublisherService |

### 2.3 Security Analysis (VERIFIED WITH CODE INSPECTION)

| # | Issue | Severity | Location | Evidence | Status |
|---|-------|----------|----------|----------|--------|
| 11 | **Sanitization middleware EXISTS** | - | `src/middleware/sanitize.js` | `sanitizeRequest()` and `blockMongoOperators()` functions exist | ✅ Implemented |
| 12 | **Ownership checks in place** | - | `applicationController.getApplicationDetails` lines 341-348 | Checks `job.publishedBy.toString() !== publisherId.toString()` | ✅ Implemented |
| 13 | **Applicant controller has ownership check** | - | `applicantController.getApplicationDetails` lines 109-112 | Checks `applicantId` matches `req.user._id` | ✅ Implemented |
| 14 | **Rate limiting middleware EXISTS** | - | `src/middleware/rateLimiter.js` | Exists (verify it's applied to job-publisher routes) | ⚠️ Verify coverage |
| 15 | **CSRF protection EXISTS** | - | `src/middleware/csrf.js` | CSRF middleware exists | ✅ Implemented |
| 16 | **No input validation on job creation** | MEDIUM | `jobPublisherController.createJob` | `const jobData = req.body;` used directly without schema validation | Add Joi/Zod validation |

### 2.4 Functional Issues (Severity: MEDIUM)

| # | Issue | Severity | Location | How to Reproduce | Fix Plan |
|---|-------|----------|----------|------------------|----------|
| 17 | **No job templates feature** | MEDIUM | Backend + Frontend | No way to save/reuse job templates | Implement job templates in Job model |
| 18 | **No job duplication feature** | MEDIUM | Backend + Frontend | Cannot duplicate existing job | Add duplicate job endpoint |
| 19 | **No job preview before publish** | MEDIUM | Frontend | No preview mode for draft jobs | Add preview component |
| 20 | **Applicant notes/tags not exposed** | MEDIUM | JobApplication model | `review.notes` exists but not exposed via UI | Expose via API endpoints |
| 21 | **Applicant scoring not exposed** | MEDIUM | JobApplication model | `review.rating` exists but not exposed via UI | Expose via API endpoints |
| 22 | **No CSV export for applications** | MEDIUM | Backend | Cannot export applicant data | Add export endpoint |
| 23 | **No analytics dashboard** | MEDIUM | Backend + Frontend | Job views tracked but not displayed | Add analytics endpoint & UI |

### 2.5 UI/UX Issues (Severity: LOW/MEDIUM)

| # | Issue | Severity | Location | How to Reproduce | Fix Plan |
|---|-------|----------|----------|------------------|----------|
| 24 | **No loading states in Jobs.jsx** | LOW | `Jobs.jsx` | Quick flicker on load | Add skeleton loading |
| 25 | **No error handling UI** | LOW | Various | API error shows basic alert | Add toast notifications |
| 26 | **No real-time updates for applicants** | MEDIUM | Frontend | Status changes not reflected live | Implement Socket.io listener (backend already emits events) |

---

## 3. CURRENT STATE SUMMARY

### Backend - What Works ✅:
- **Job model** with comprehensive fields (status, requirements, benefits, etc.)
- **JobApplication model** with full pipeline (new → under_review → interviewed → offered → hired)
- **Job Publisher backend** at `/api/v1/job-publisher/*` with complete CRUD, dashboard, applications
- **Applicant backend** at `/api/v1/applicant/*` with dashboard, applications list, details, withdraw
- **Ownership validation** in controllers
- **Sanitization middleware** preventing NoSQL injection
- **CSRF protection** implemented
- **Notification system** for status changes
- **Conversation/messaging integration**

### Frontend - What's Missing ❌:
1. **JobPublisherDashboard.jsx** - No frontend for job-publisher role
2. **ApplicantDashboard.jsx** - No frontend for applicant role
3. **Routes in App.jsx** for both roles
4. **API services** in api.js for applicant and job-publisher endpoints

### What Needs Fixing ⚠️:
1. **Duplicate controller implementations** - Two updateApplicationStatus functions
2. **Duplicate API endpoints** - `/jobs/applications/:id/status` vs `/job-publisher/applications/:id/status`
3. **Response format inconsistency** - Some return `{ applications }`, others `{ data: { applications } }`
4. **Input validation** - Job creation lacks schema validation
5. **Rate limiting coverage** - Verify job-publisher routes are covered

---

## 4. RECOMMENDED IMPLEMENTATION ORDER

### Phase 2: Role Modeling & Permissions
- Audit rate limiting coverage on job-publisher routes
- Consolidate duplicate updateApplicationStatus
- Standardize response format

### Phase 3: Publisher Dashboard Frontend
- Create `JobPublisherDashboard.jsx`
- Add `jobPublisherService` to api.js
- Add `/dashboard/publisher` route to App.jsx
- Connect to existing backend endpoints

### Phase 4: Applicant Dashboard Frontend
- Create `ApplicantDashboard.jsx`
- Add `applicantService` to api.js
- Add `/dashboard/applicant` route to App.jsx
- Add real-time Socket.io updates

### Phase 5: API Reliability
- Add Joi/Zod validation schemas for job creation
- Standardize all response formats
- Remove/deprecate duplicate endpoints

### Phase 6: Security Hardening
- Verify rate limiting coverage
- Add input validation schemas

### Phase 7: Testing
- Unit tests for controllers
- Integration tests for API flows
- E2E tests for critical paths

### Phase 8: Documentation
- API documentation
- Migration guide
- Rollback plan

---

## 5. FILES TO BE CREATED/MODIFIED

### New Files:
- `frontend/app/src/pages/JobPublisherDashboard.jsx`
- `frontend/app/src/pages/ApplicantDashboard.jsx`
- `src/validators/jobValidator.js`

### Modified Files:
- `frontend/app/src/App.jsx` - Add new routes for publisher and applicant
- `frontend/app/src/config/api.js` - Add jobPublisherService and applicantService
- `src/modules/job-publisher/routes/jobPublisherRoutes.js` - Remove duplicate endpoints
- `src/modules/job-publisher/controllers/applicationController.js` - Keep as primary
- `src/modules/job-publisher/controllers/jobPublisherController.js` - Remove duplicate updateApplicationStatus

---

## 6. VERIFIED EXISTING FUNCTIONALITY

### Applicant Backend API (Already Implemented):
```
GET  /api/v1/applicant/dashboard           - Dashboard with stats, recent apps, recommendations
GET  /api/v1/applicant/applications        - List all applications (with pagination)
GET  /api/v1/applicant/applications/:id    - Get application details (with ownership check)
PUT  /api/v1/applicant/applications/:id/withdraw - Withdraw application
GET  /api/v1/applicant/jobs                - Get available jobs (not yet applied)
```

### Job Publisher Backend API (Already Implemented):
```
GET  /api/v1/job-publisher/dashboard        - Dashboard with stats, recent jobs/applications
GET  /api/v1/job-publisher/dashboard/stats  - Detailed statistics
GET  /api/v1/job-publisher/jobs             - List publisher's jobs (paginated)
POST /api/v1/job-publisher/jobs             - Create job
PUT  /api/v1/job-publisher/jobs/:id         - Update job
DELETE /api/v1/job-publisher/jobs/:id       - Delete job (soft)
GET  /api/v1/job-publisher/jobs/:id/applications - Get job applications
GET  /api/v1/job-publisher/applications     - Get all applications
GET  /api/v1/job-publisher/applications/:id - Get application details
PUT  /api/v1/job-publisher/applications/:id/status - Update status
```

---

**Phase 1 Complete** ✅

---

## PHASE 2 COMPLETION NOTES (January 11, 2026)

### Changes Made:

1. **Removed duplicate functions from jobPublisherController.js**
   - Deleted orphan `getJobApplications` function (not used by routes)
   - Deleted orphan `updateApplicationStatus` function (not used by routes)
   - Routes already use `applicationController` for these functions

2. **Added rate limiting to job-publisher routes**
   - Added `generalRateLimiter` middleware to `/api/v1/job-publisher/*`

3. **Added rate limiting to applicant routes**
   - Added `generalRateLimiter` middleware to `/api/v1/applicant/*`

4. **Fixed response format inconsistency**
   - Updated `applicationController.getApplications` to wrap response in `data: { ... }`
   - Now consistent with other endpoints: `{ success: true, data: { applications, statistics, pagination } }`

5. **Fixed trust proxy for Replit**
   - Updated server.js to enable trust proxy when `REPL_ID` or `REPLIT_DEV_DOMAIN` is present
   - Resolves rate limiter warning about X-Forwarded-For header

6. **Created user-based rate limiter for authenticated routes**
   - Added `authenticatedRateLimiter` that keys on user ID (not IP)
   - 300 requests per 15 minutes for authenticated users
   - Skips admin users
   - Applied to job-publisher and applicant routes

**Phase 2 Complete** ✅

---

Ready to proceed with Phase 3: Publisher Dashboard Frontend
