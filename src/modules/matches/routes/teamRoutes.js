const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Team routes
router.post('/', teamController.createTeam);
router.get('/my-teams', teamController.getMyTeams);
router.get('/:id', teamController.getTeam);
router.post('/:id/members', teamController.addMember);
router.delete('/:id/members/:user_id', teamController.removeMember);

module.exports = router;
