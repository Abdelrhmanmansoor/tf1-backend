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
