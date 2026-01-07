# 🛠️ READY-TO-IMPLEMENT CODE SNIPPETS

**Purpose:** Quick reference for implementing remaining security fixes  
**Date:** January 7, 2026

---

## 🔧 CODE FIX #1: CSRF Integration into Routes

### File: `src/modules/auth/routes/auth.routes.js`

**Replace Lines 1-60 with:**
```javascript
const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { authenticate, optionalAuth } = require('../../../middleware/auth');
const { csrf, verifyCsrf } = require('../../../middleware/csrf');
const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateEmailVerification,
  validateResendVerification,
  validateResendVerificationByToken
} = require('../../../middleware/validation');

// Auth-specific rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// Login-specific rate limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

const router = express.Router();

// ==================== CSRF TOKEN ENDPOINT ====================
// Clients can call this to refresh their CSRF token
const { getCSRFToken } = require('../../../middleware/csrf');
router.get('/csrf-token', csrf, getCSRFToken);

// ==================== PUBLIC AUTH ENDPOINTS ====================
// Generate CSRF token for login page
router.get('/login-form', csrf, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Please include the CSRF token from the XSRF-TOKEN cookie in your requests',
    csrfToken: req.csrfToken
  });
});

// Registration with CSRF protection
router.post(
  '/register',
  authLimiter,
  csrf,
  verifyCsrf,
  validateRegister,
  authController.register
);

// Login with CSRF protection
router.post(
  '/login',
  loginLimiter,
  csrf,
  verifyCsrf,
  validateLogin,
  authController.login
);

// Token refresh (no CSRF needed for this specific endpoint)
router.post('/refresh-token', authLimiter, authController.refreshToken);

// Password reset flows
router.post(
  '/forgot-password',
  authLimiter,
  csrf,
  verifyCsrf,
  validateForgotPassword,
  authController.forgotPassword
);

router.post(
  '/reset-password',
  authLimiter,
  csrf,
  verifyCsrf,
  validateResetPassword,
  authController.resetPassword
);

// Email verification (GET for backward compatibility)
router.get('/verify-email', csrf, validateEmailVerification, authController.verifyEmail);
router.post('/verify-email', (req, res, next) => {
  if (req.body && req.body.token && !req.query.token) {
    req.query.token = req.body.token;
  }
  next();
}, csrf, validateEmailVerification, authController.verifyEmail);

// ==================== AUTHENTICATED ENDPOINTS ====================
// These require both authentication AND CSRF protection
router.post(
  '/resend-verification',
  authenticate,
  csrf,
  verifyCsrf,
  validateResendVerification,
  authController.resendVerification
);

router.post(
  '/resend-verification-by-token',
  csrf,
  verifyCsrf,
  validateResendVerificationByToken,
  authController.resendVerificationByToken
);

router.post('/logout', authenticate, csrf, verifyCsrf, authController.logout);

// Profile endpoints
router.get('/profile', authenticate, csrf, authController.getProfile);
router.get('/role-info', optionalAuth, csrf, authController.getRoleInfo);

// Test endpoint (remove in production)
router.get('/test-account', authController.testAccount);

module.exports = router;
```

---

## 🔧 CODE FIX #2: Secure Token Storage Migration

### File: `frontend/app/src/config/api.js`

**Complete replacement of this file:**

```javascript
import axios from 'axios';

const API_URL = '/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies in requests
});

// ==================== TOKEN REFRESH QUEUE ====================
let refreshPromise = null;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ==================== REQUEST INTERCEPTOR ====================
api.interceptors.request.use(
  (config) => {
    // Token is now automatically sent via httpOnly cookie
    // No need to manually add Authorization header
    // (unless using custom Bearer tokens for specific cases)
    
    // For backward compatibility with custom tokens:
    const token = sessionStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// ==================== RESPONSE INTERCEPTOR ====================
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized with token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // If refresh is already in progress, wait for it
      if (!refreshPromise) {
        refreshPromise = new Promise(async (resolve, reject) => {
          try {
            const response = await axios.post(`${API_URL}/auth/refresh-token`, {}, {
              withCredentials: true
            });

            const { accessToken, refreshToken: newRefreshToken } = response.data.data || response.data;
            
            // Store tokens securely
            if (accessToken) {
              sessionStorage.setItem('accessToken', accessToken);
              api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
            }
            if (newRefreshToken) {
              // Refresh token comes in httpOnly cookie automatically
              sessionStorage.setItem('refreshToken', newRefreshToken);
            }

            resolve(accessToken);
          } catch (err) {
            // Refresh failed - clear auth and redirect to login
            sessionStorage.removeItem('accessToken');
            sessionStorage.removeItem('refreshToken');
            sessionStorage.removeItem('user');
            window.location.href = '/login';
            reject(err);
          } finally {
            refreshPromise = null;
          }
        });
      }

      // Wait for refresh to complete
      try {
        const token = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (err) {
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

// ==================== AUTH SERVICE ====================
export const authService = {
  login: (email, password) => 
    api.post('/auth/login', { email, password }),

  register: (data) => 
    api.post('/auth/register', data),

  logout: () => {
    // Clear local session storage
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
    
    // Call logout endpoint to clear cookies server-side
    return api.post('/auth/logout');
  },

  refreshToken: (refreshToken) => 
    api.post('/auth/refresh-token', { refreshToken }),

  // Get CSRF token from server
  getCSRFToken: () => 
    api.get('/auth/csrf-token'),
};

export const matchService = {
  getMatches: (filters = {}) => api.get('/matches', { params: filters }),
  getMatch: (id) => api.get(`/matches/${id}`),
  createMatch: (data) => api.post('/matches', data),
};

export default api;
```

### File: `frontend/app/src/context/AuthContext.jsx`

**Update login method to use secure storage:**

```javascript
const login = async (email, password) => {
  try {
    // Get CSRF token before login
    let csrfToken = null;
    try {
      const csrfResponse = await authService.getCSRFToken();
      csrfToken = csrfResponse.data.token;
      // Store CSRF token header will be sent via cookie automatically
    } catch (e) {
      console.warn('Could not fetch CSRF token');
    }

    const response = await authService.login(email, password);
    
    const { user, accessToken, refreshToken, requiresVerification } = response.data.data || response.data;
    
    if (accessToken) {
      // Store token in sessionStorage (cleared when tab closes)
      // NOT localStorage (persistent and XSS vulnerable)
      sessionStorage.setItem('accessToken', accessToken);
      
      // Refresh token is stored in httpOnly cookie by server
      // Don't store it in sessionStorage
      
      // Store user info
      sessionStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      setIsLoggedOut(false);
    }
    
    return { 
      success: true, 
      user,
      requiresVerification 
    };
  } catch (error) {
    const errorData = error.response?.data;
    let errorMessage = 'فشل تسجيل الدخول';
    
    if (errorData?.errors && Array.isArray(errorData.errors)) {
      errorMessage = errorData.errors.map(e => e.message).join('، ');
    } else if (errorData?.message) {
      errorMessage = errorData.message;
    }
    
    return { success: false, error: errorMessage };
  }
};
```

---

## 🔧 CODE FIX #3: Fix Race Condition in Token Refresh

**Replace this section in `frontend/app/src/config/api.js`:**

```javascript
// BEFORE (Vulnerable):
let isRefreshing = false;
let failedQueue = [];

if (error.response?.status === 401) {
  if (isRefreshing) {
    // Queued...
  }
  isRefreshing = true; // ⚠️ Not atomic!
  // refresh token...
  isRefreshing = false;
}

// AFTER (Secure):
let refreshPromise = null; // Stores the actual Promise
let failedQueue = [];

if (error.response?.status === 401) {
  if (!refreshPromise) {
    // Start refresh only once
    refreshPromise = (async () => {
      try {
        const response = await axios.post(`${API_URL}/auth/refresh-token`, {}, {
          withCredentials: true
        });
        
        const token = response.data.data?.accessToken || response.data.accessToken;
        return token;
      } finally {
        refreshPromise = null; // Release lock
      }
    })();
  }

  // Wait for refresh to complete
  try {
    const token = await refreshPromise;
    originalRequest.headers.Authorization = `Bearer ${token}`;
    return api(originalRequest);
  } catch (err) {
    return Promise.reject(err);
  }
}
```

---

## 🔧 CODE FIX #4: Remove Remaining Debug Statements

### File: `src/utils/email.js`

**Find and replace all these:**

```javascript
// ❌ REMOVE THESE:
console.log('✅ Email service initialized (SendGrid)');
console.log('Email config:', emailConfig);
console.log(`✅ Verification email sent to ${user.email}`);

// ✅ REPLACE WITH:
logger.info('Email service initialized', { service: 'sendgrid' });
// Don't log config (contains secrets)
logger.info('Verification email sent', { userId: user._id });
```

### File: `src/modules/shared/models/User.js`

**Find and replace:**

```javascript
// ❌ REMOVE:
console.log(`🔍 [VERIFICATION TRACKING] isVerified changed for ${this.email}`);
console.log(`Has verification token: ${!!this.emailVerificationToken}`);

// ✅ REPLACE:
logger.debug('User verification status changed', { userId: this._id });
```

---

## 🔧 CODE FIX #5: Integrate Admin CSRF

### File: `src/routes/admin.js`

**Add CSRF to all admin endpoints:**

```javascript
const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
const { csrf, verifyCsrf } = require('../middleware/csrf');

const router = express.Router();

// All admin endpoints require auth and CSRF
router.use(authenticate);
router.use(authorize('admin', 'administrator'));

// ==================== GET ENDPOINTS (CSRF generation only) ====================
router.get('/dashboard', csrf, adminController.getDashboard);
router.get('/users', csrf, adminController.getUsers);
router.get('/settings', csrf, adminController.getSettings);
router.get('/logs', csrf, adminController.getLogs);

// ==================== POST/PUT/DELETE (CSRF validation) ====================
router.post('/users', csrf, verifyCsrf, adminController.createUser);
router.put('/users/:id', csrf, verifyCsrf, adminController.updateUser);
router.delete('/users/:id', csrf, verifyCsrf, adminController.deleteUser);

router.post('/settings', csrf, verifyCsrf, adminController.updateSettings);
router.post('/users/:id/block', csrf, verifyCsrf, adminController.blockUser);
router.post('/users/:id/unblock', csrf, verifyCsrf, adminController.unblockUser);

module.exports = router;
```

---

## 🔧 CODE FIX #6: Create Error Handler Middleware

### File: `src/middleware/errorHandler.js` (NEW FILE)

```javascript
/**
 * Centralized Error Handling Middleware
 * Standardizes error responses across all endpoints
 */

const logger = require('../utils/logger');

// Custom error class
class APIError extends Error {
  constructor(status, message, code, details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const errorHandler = (err, req, res, next) => {
  // Default error values
  let status = err.status || 500;
  let message = err.message || 'Internal server error';
  let code = err.code || 'INTERNAL_ERROR';
  let details = null;

  // Log the error
  if (status >= 500) {
    logger.error('Server Error', {
      status,
      message,
      code,
      path: req.path,
      method: req.method,
      userId: req.user?._id,
      ip: req.ip,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  } else {
    logger.warn('Client Error', {
      status,
      message,
      code,
      path: req.path,
      userId: req.user?._id,
      ip: req.ip
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    status = 400;
    code = 'VALIDATION_ERROR';
    details = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    status = 400;
    code = 'DUPLICATE_ENTRY';
    const field = Object.keys(err.keyPattern)[0];
    message = `${field} already exists`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    status = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  }

  if (err.name === 'TokenExpiredError') {
    status = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  }

  // Construct response
  const response = {
    success: false,
    message,
    code,
    timestamp: new Date().toISOString()
  };

  // Only include details in development
  if (process.env.NODE_ENV === 'development') {
    response.details = details;
    response.stack = err.stack;
  }

  // Only include details if explicitly provided
  if (details) {
    response.details = details;
  }

  res.status(status).json(response);
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  asyncHandler,
  APIError
};
```

**Usage in controllers:**

```javascript
// Instead of try-catch blocks everywhere
const { asyncHandler, APIError } = require('../middleware/errorHandler');

router.post('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    throw new APIError(404, 'User not found', 'USER_NOT_FOUND');
  }
  
  // Update logic...
  res.json({ success: true, user });
}));
```

---

## ✅ INTEGRATION CHECKLIST

After implementing these code fixes:

- [ ] CSRF integrated into auth routes
- [ ] CSRF integrated into admin routes
- [ ] CSRF integrated into all POST/PUT/DELETE
- [ ] Token storage migrated to sessionStorage
- [ ] Refresh token logic updated
- [ ] Race condition fixed in token refresh
- [ ] Error handler middleware created
- [ ] Error handler integrated into server
- [ ] All console.log statements removed
- [ ] Tested: CSRF tokens work
- [ ] Tested: Tokens refresh correctly
- [ ] Tested: Logout clears everything
- [ ] Tested: Back button prevented
- [ ] Tested: No XSS via localStorage

---

**Need help?** Check the documentation files:
- [SECURITY_IMPLEMENTATION_GUIDE.md](SECURITY_IMPLEMENTATION_GUIDE.md)
- [SECURITY_FIXES_SUMMARY.md](SECURITY_FIXES_SUMMARY.md)
- [SECURITY_CODE_ORGANIZATION_AUDIT.md](SECURITY_CODE_ORGANIZATION_AUDIT.md)

