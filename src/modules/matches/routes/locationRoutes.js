const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { matchesLimiter } = require('../middleware/rateLimiter');

// Public location endpoints (no auth required)
router.get('/regions', matchesLimiter, locationController.getRegions);
router.get('/cities', matchesLimiter, locationController.getCities);
router.get('/cities/:cityId/districts', matchesLimiter, locationController.getDistricts);
router.get('/search', matchesLimiter, locationController.searchLocations);
router.get('/:id', matchesLimiter, locationController.getLocationDetails);
router.get('/:id/hierarchy', matchesLimiter, locationController.getLocationHierarchy);

module.exports = router;

