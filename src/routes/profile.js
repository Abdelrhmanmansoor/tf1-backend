const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const profileController = require('../controllers/profileController');

router.get('/options', profileController.getProfileOptions);

router.get('/player', authenticate, profileController.getPlayerProfile);

router.patch('/player', authenticate, profileController.updatePlayerProfile);

router.get('/coach', authenticate, profileController.getCoachProfile);

router.patch('/coach', authenticate, profileController.updateCoachProfile);

module.exports = router;
