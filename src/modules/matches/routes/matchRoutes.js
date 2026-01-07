const express = require('express');
const router = express.Router();

let matchController, chatController, authenticate, optionalAuth, matchesLimiter, joinLeaveLimiter, chatLimiter, validateObjectId, checkMatchOwnership, sanitizeInput, preventNoSQLInjection, userActionLimiter;

try {
  matchController = require('../controllers/matchController');
  chatController = require('../controllers/chatController');
  const auth = require('../middleware/auth');
  authenticate = auth.authenticate;
  optionalAuth = auth.optionalAuth;
  const limiters = require('../middleware/rateLimiter');
  matchesLimiter = limiters.matchesLimiter;
  joinLeaveLimiter = limiters.joinLeaveLimiter;
  chatLimiter = limiters.chatLimiter;
  const security = require('../middleware/security');
  validateObjectId = security.validateObjectId;
  checkMatchOwnership = security.checkMatchOwnership;
  sanitizeInput = security.sanitizeInput;
  preventNoSQLInjection = security.preventNoSQLInjection;
  userActionLimiter = security.userActionLimiter;
} catch (error) {
  console.error('Error loading match routes:', error);
  // Provide fallback
  matchController = {};
  chatController = {};
  authenticate = (req, res, next) => next();
  optionalAuth = (req, res, next) => next();
  matchesLimiter = (req, res, next) => next();
  joinLeaveLimiter = (req, res, next) => next();
  chatLimiter = (req, res, next) => next();
  validateObjectId = (req, res, next) => next();
  checkMatchOwnership = (req, res, next) => next();
  sanitizeInput = (req, res, next) => next();
  preventNoSQLInjection = (req, res, next) => next();
  userActionLimiter = (req, res, next) => next();
}

// Apply security middleware to all routes
router.use(sanitizeInput);
router.use(preventNoSQLInjection);

// Protected match endpoints - MUST be before :id routes
router.get('/my-matches', authenticate, matchesLimiter, (req, res) => matchController.getMyMatches(req, res));

// Public list endpoints (no auth required)
router.get('/', optionalAuth, matchesLimiter, (req, res) => matchController.listMatches(req, res));

// Protected create match
router.post('/', authenticate, matchesLimiter, (req, res) => matchController.createMatch(req, res));

// Get match details (public)
router.get('/:id', optionalAuth, matchesLimiter, (req, res) => matchController.getMatch(req, res));

// Protected match actions with :id parameter
router.post('/:id/join', authenticate, validateObjectId(), joinLeaveLimiter, userActionLimiter(5, 60000), (req, res) => matchController.joinMatch(req, res));
router.post('/:id/leave', authenticate, validateObjectId(), joinLeaveLimiter, userActionLimiter(5, 60000), (req, res) => matchController.leaveMatch(req, res));
router.post('/:id/publish', authenticate, validateObjectId(), checkMatchOwnership, matchesLimiter, (req, res) => matchController.publishMatch(req, res));
router.post('/:id/invite', authenticate, validateObjectId(), matchesLimiter, (req, res) => matchController.inviteToMatch(req, res));
router.post('/:id/invitations/:inv_id/respond', authenticate, validateObjectId('inv_id'), matchesLimiter, (req, res) => matchController.respondToInvitation(req, res));
router.post('/:id/start', authenticate, validateObjectId(), checkMatchOwnership, matchesLimiter, (req, res) => matchController.startMatch(req, res));
router.post('/:id/finish', authenticate, validateObjectId(), checkMatchOwnership, matchesLimiter, (req, res) => matchController.finishMatch(req, res));
router.post('/:id/cancel', authenticate, validateObjectId(), checkMatchOwnership, matchesLimiter, (req, res) => matchController.cancelMatch(req, res));
router.post('/:id/rate', authenticate, validateObjectId(), matchesLimiter, (req, res) => matchController.ratePlayer(req, res));

// Chat endpoints with specific rate limiting
router.get('/:id/chat', authenticate, chatLimiter, (req, res) => chatController.getMessages(req, res));
router.post('/:id/chat', authenticate, chatLimiter, (req, res) => chatController.sendMessage(req, res));

module.exports = router;
