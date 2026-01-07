const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const multer = require('multer');
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Public routes with rate limiting
router.post('/register', authLimiter, (req, res) => authController.register(req, res));
router.post('/signup', authLimiter, (req, res) => authController.signup(req, res)); // Backward compatibility
router.post('/verify', (req, res) => authController.verify(req, res));
router.get('/verify', (req, res) => authController.verify(req, res)); // Support both POST and GET for verification
router.get('/verify-email', (req, res) => authController.verifyEmail(req, res)); // New endpoint for /matches/verify-email
router.post('/login', authLimiter, (req, res) => authController.login(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.post('/resend-verification', authLimiter, (req, res) => authController.resendVerification(req, res)); // Resend verification email

// Protected routes
router.get('/me', authenticate, (req, res) => authController.me(req, res));
router.post('/profile/avatar', authenticate, upload.single('avatar'), (req, res) => authController.uploadProfilePicture(req, res));
router.put('/profile', authenticate, (req, res) => authController.updateProfile(req, res));

module.exports = router;
