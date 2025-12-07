const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const chatController = require('../controllers/chatController');
const historyController = require('../controllers/historyController');
const { authenticate } = require('../middleware/auth');
const { matchesLimiter, joinLeaveLimiter, chatLimiter } = require('../middleware/rateLimiter');

// All routes require authentication and have general rate limiting
router.use(authenticate);
router.use(matchesLimiter);

// Match CRUD and actions
router.post('/', matchController.createMatch);
router.post('/:id/publish', matchController.publishMatch);
router.get('/', matchController.listMatches);
router.get('/:id', matchController.getMatch);
router.post('/:id/join', joinLeaveLimiter, matchController.joinMatch);
router.post('/:id/leave', joinLeaveLimiter, matchController.leaveMatch);
router.post('/:id/invite', matchController.inviteToMatch);
router.post('/:id/invitations/:inv_id/respond', matchController.respondToInvitation);
router.post('/:id/start', matchController.startMatch);
router.post('/:id/finish', matchController.finishMatch);
router.post('/:id/cancel', matchController.cancelMatch);
router.post('/:id/rate', matchController.ratePlayer);

// Chat with specific rate limiting
router.get('/:id/chat', chatController.getMessages);
router.post('/:id/chat', chatLimiter, chatController.sendMessage);

module.exports = router;
