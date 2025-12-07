const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { authenticate } = require('../middleware/auth');
const { matchesLimiter } = require('../middleware/rateLimiter');

// All routes require authentication and rate limiting
router.use(authenticate);
router.use(matchesLimiter);

// Team routes
router.post('/', teamController.createTeam);
router.get('/my-teams', teamController.getMyTeams);
router.get('/:id', teamController.getTeam);
router.post('/:id/members', teamController.addMember);
router.delete('/:id/members/:user_id', teamController.removeMember);

module.exports = router;
