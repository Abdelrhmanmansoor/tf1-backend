const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const matchHubController = require('../controllers/matchHubController');

router.get('/regions', matchHubController.getRegionsData);

router.get('/', matchHubController.getMatches);

router.get('/my-matches', authenticate, matchHubController.getMyMatches);

router.get('/:id', matchHubController.getMatch);

router.post('/', authenticate, matchHubController.createMatch);

router.post('/:id/join', authenticate, matchHubController.joinMatch);

router.post('/:id/leave', authenticate, matchHubController.leaveMatch);

router.patch('/:id', authenticate, matchHubController.updateMatch);

router.delete('/:id', authenticate, matchHubController.deleteMatch);

module.exports = router;
