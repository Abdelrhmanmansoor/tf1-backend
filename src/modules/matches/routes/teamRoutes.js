const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { authenticate } = require('../middleware/auth');
const { matchesLimiter } = require('../middleware/rateLimiter');

// All routes require authentication and rate limiting
router.use(authenticate);
router.use(matchesLimiter);

// Team routes
router.post('/', (req, res) => teamController.createTeam(req, res));
router.get('/my-teams', (req, res) => teamController.getMyTeams(req, res));
router.get('/:id', (req, res) => teamController.getTeam(req, res));
router.post('/:id/members', (req, res) => teamController.addMember(req, res));
router.delete('/:id/members/:user_id', (req, res) => teamController.removeMember(req, res));

module.exports = router;
