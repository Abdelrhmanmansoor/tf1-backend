const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const chatController = require('../controllers/chatController');
const historyController = require('../controllers/historyController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Match CRUD and actions
router.post('/', matchController.createMatch);
router.post('/:id/publish', matchController.publishMatch);
router.get('/', matchController.listMatches);
router.get('/:id', matchController.getMatch);
router.post('/:id/join', matchController.joinMatch);
router.post('/:id/leave', matchController.leaveMatch);
router.post('/:id/invite', matchController.inviteToMatch);
router.post('/:id/invitations/:inv_id/respond', matchController.respondToInvitation);
router.post('/:id/start', matchController.startMatch);
router.post('/:id/finish', matchController.finishMatch);
router.post('/:id/cancel', matchController.cancelMatch);
router.post('/:id/rate', matchController.ratePlayer);

// Chat
router.get('/:id/chat', chatController.getMessages);
router.post('/:id/chat', chatController.sendMessage);

module.exports = router;
