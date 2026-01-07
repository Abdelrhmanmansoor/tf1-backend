const express = require('express');
const router = express.Router();

let locationController, matchesLimiter;

try {
  locationController = require('../controllers/locationController');
  const limiters = require('../middleware/rateLimiter');
  matchesLimiter = limiters.matchesLimiter;
} catch (error) {
  console.error('Error loading location routes:', error);
  // Provide fallback
  locationController = {};
  matchesLimiter = (req, res, next) => next();
}

// Public location endpoints (no auth required)
router.get('/complete', matchesLimiter, (req, res) => locationController.getCompleteRegionsData(req, res));
router.get('/regions', matchesLimiter, (req, res) => locationController.getRegions(req, res));
router.get('/cities', matchesLimiter, (req, res) => locationController.getCities(req, res));
router.get('/cities/:cityId/districts', matchesLimiter, (req, res) => locationController.getDistricts(req, res));
router.get('/search', matchesLimiter, (req, res) => locationController.searchLocations(req, res));
router.get('/:id', matchesLimiter, (req, res) => locationController.getLocationDetails(req, res));
router.get('/:id/hierarchy', matchesLimiter, (req, res) => locationController.getLocationHierarchy(req, res));

module.exports = router;

