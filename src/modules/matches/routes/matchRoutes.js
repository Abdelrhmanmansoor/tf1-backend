const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const chatController = require('../controllers/chatController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { matchesLimiter, joinLeaveLimiter, chatLimiter } = require('../middleware/rateLimiter');
const { validateObjectId, checkMatchOwnership, sanitizeInput, preventNoSQLInjection, userActionLimiter } = require('../middleware/security');

// Apply security middleware to all routes
router.use(sanitizeInput);
router.use(preventNoSQLInjection);

// Protected match endpoints - MUST be before :id routes
router.get('/my-matches', authenticate, matchesLimiter, matchController.getMyMatches);

// Public list endpoints (no auth required)
router.get('/', optionalAuth, matchesLimiter, matchController.listMatches);

// Protected create match
router.post('/', authenticate, matchesLimiter, matchController.createMatch);

// Get match details (public)
router.get('/:id', optionalAuth, matchesLimiter, matchController.getMatch);

// Protected match actions with :id parameter
router.post('/:id/join', authenticate, validateObjectId(), joinLeaveLimiter, userActionLimiter(5, 60000), matchController.joinMatch);
router.post('/:id/leave', authenticate, validateObjectId(), joinLeaveLimiter, userActionLimiter(5, 60000), matchController.leaveMatch);
router.post('/:id/publish', authenticate, validateObjectId(), checkMatchOwnership, matchesLimiter, matchController.publishMatch);
router.post('/:id/invite', authenticate, validateObjectId(), matchesLimiter, matchController.inviteToMatch);
router.post('/:id/invitations/:inv_id/respond', authenticate, validateObjectId('inv_id'), matchesLimiter, matchController.respondToInvitation);
router.post('/:id/start', authenticate, validateObjectId(), checkMatchOwnership, matchesLimiter, matchController.startMatch);
router.post('/:id/finish', authenticate, validateObjectId(), checkMatchOwnership, matchesLimiter, matchController.finishMatch);
router.post('/:id/cancel', authenticate, validateObjectId(), checkMatchOwnership, matchesLimiter, matchController.cancelMatch);
router.post('/:id/rate', authenticate, validateObjectId(), matchesLimiter, matchController.ratePlayer);

// Chat endpoints with specific rate limiting
router.get('/:id/chat', authenticate, chatLimiter, chatController.getMessages);
router.post('/:id/chat', authenticate, chatLimiter, chatController.sendMessage);

module.exports = router;
