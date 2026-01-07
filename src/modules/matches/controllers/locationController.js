const locationService = require('../services/locationService');
const { asyncHandler } = require('../utils/errorHandler');

class LocationController {
  /**
   * Get all regions
   */
  getRegions = asyncHandler(async (req, res) => {
    const regions = await locationService.getRegions();

    res.status(200).json({
      success: true,
      data: regions
    });
  });

  /**
   * Get cities (optionally filtered by region)
   */
  getCities = asyncHandler(async (req, res) => {
    const { regionId } = req.query;
    const cities = await locationService.getCities(regionId);

    res.status(200).json({
      success: true,
      data: cities
    });
  });

  /**
   * Get districts for a city
   */
  getDistricts = asyncHandler(async (req, res) => {
    const { cityId } = req.params;
    const districts = await locationService.getDistricts(cityId);

    res.status(200).json({
      success: true,
      data: districts
    });
  });

  /**
   * Search locations
   */
  searchLocations = asyncHandler(async (req, res) => {
    const { q, level } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const locations = await locationService.searchLocations(q, level);

    res.status(200).json({
      success: true,
      data: locations
    });
  });

  /**
   * Get location details
   */
  getLocationDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const details = await locationService.getLocationDetails(id);

    if (!details) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    res.status(200).json({
      success: true,
      data: details
    });
  });

  /**
   * Get location hierarchy
   */
  getLocationHierarchy = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hierarchy = await locationService.getLocationHierarchy(id);

    if (!hierarchy) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    res.status(200).json({
      success: true,
      data: hierarchy
    });
  });
}

module.exports = new LocationController();

