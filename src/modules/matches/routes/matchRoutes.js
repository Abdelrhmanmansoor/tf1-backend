const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const chatController = require('../controllers/chatController');
const historyController = require('../controllers/historyController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { matchesLimiter, joinLeaveLimiter, chatLimiter } = require('../middleware/rateLimiter');

// Public list endpoint (no auth required)
router.get('/matches', optionalAuth, matchesLimiter, matchController.listMatches);
router.get('/matches/:id', optionalAuth, matchesLimiter, matchController.getMatch);

// Protected match endpoints
router.post('/matches', authenticate, matchesLimiter, matchController.createMatch);
router.post('/matches/:id/join', authenticate, joinLeaveLimiter, matchController.joinMatch);
router.post('/matches/:id/leave', authenticate, joinLeaveLimiter, matchController.leaveMatch);
router.get('/my-matches', authenticate, matchesLimiter, matchController.getMyMatches);

// Legacy routes for backward compatibility
router.post('/:id/publish', authenticate, matchesLimiter, matchController.publishMatch);
router.post('/:id/invite', authenticate, matchesLimiter, matchController.inviteToMatch);
router.post('/:id/invitations/:inv_id/respond', authenticate, matchesLimiter, matchController.respondToInvitation);
router.post('/:id/start', authenticate, matchesLimiter, matchController.startMatch);
router.post('/:id/finish', authenticate, matchesLimiter, matchController.finishMatch);
router.post('/:id/cancel', authenticate, matchesLimiter, matchController.cancelMatch);
router.post('/:id/rate', authenticate, matchesLimiter, matchController.ratePlayer);

// Chat with specific rate limiting
router.get('/:id/chat', authenticate, chatLimiter, chatController.getMessages);
router.post('/:id/chat', authenticate, chatLimiter, chatController.sendMessage);

module.exports = router;
