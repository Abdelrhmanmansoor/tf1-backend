// Safely require all dependencies with proper error handling
let locationService, asyncHandler, ValidationError, NotFoundError, fs, path, cache, logger;

try {
  locationService = require('../services/locationService');
  const errorHandler = require('../utils/errorHandler');
  asyncHandler = errorHandler.asyncHandler;
  ValidationError = errorHandler.ValidationError;
  NotFoundError = errorHandler.NotFoundError;
  fs = require('fs');
  path = require('path');
  cache = require('../utils/cache');
  logger = require('../utils/logger');
} catch (error) {
  console.error('Error loading location controller dependencies:', error);
  // Provide fallback
  asyncHandler = (fn) => fn;
  logger = console;
  cache = {};
  fs = require('fs');
  path = require('path');
}

class LocationController {
  /**
   * Get complete regions data from JSON (includes all cities and neighborhoods)
   * Cached for 24 hours since data rarely changes
   */
  getCompleteRegionsData = asyncHandler(async (req, res) => {
    try {
      // Try to get from cache first
      const cached = await cache.get('regions:complete');
      if (cached) {
        return res.status(200).json({
          success: true,
          ...cached,
          fromCache: true
        });
      }

      const filePath = path.join(__dirname, '../../../data/saudiRegionsComplete.json');
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new ValidationError('ملف البيانات الجغرافية غير موجود');
      }

      const data = fs.readFileSync(filePath, 'utf8');
      const regionsData = JSON.parse(data);

      // Validate data structure
      if (!regionsData.regions || !Array.isArray(regionsData.regions)) {
        throw new ValidationError('بنية البيانات غير صحيحة');
      }

      // Cache for 24 hours (86400 seconds)
      await cache.set('regions:complete', regionsData, 86400);

      logger.info('Complete regions data loaded successfully');

      res.status(200).json({
        success: true,
        ...regionsData
      });
    } catch (error) {
      logger.error('Error reading regions data:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تحميل البيانات الجغرافية',
        messageEn: 'Error loading regions data',
        error: error.message
      });
    }
  });

  /**
   * Get all regions
   * Cached for 24 hours
   */
  getRegions = asyncHandler(async (req, res) => {
    try {
      // Try to get from cache first
      const cached = await cache.get('locations:regions');
      if (cached) {
        return res.status(200).json({
          success: true,
          data: cached,
          fromCache: true
        });
      }

      const regions = await locationService.getRegions();

      // Cache for 24 hours
      await cache.set('locations:regions', regions, 86400);

      logger.info(`Retrieved ${regions.length} regions`);

      res.status(200).json({
        success: true,
        data: regions
      });
    } catch (error) {
      logger.error('Error getting regions:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب المناطق',
        messageEn: 'Error getting regions',
        error: error.message
      });
    }
  });

  /**
   * Get cities (optionally filtered by region)
   * Cached for 24 hours
   */
  getCities = asyncHandler(async (req, res) => {
    try {
      const { regionId } = req.query;

      if (!regionId) {
        throw new ValidationError('يجب تحديد معرف المنطقة');
      }

      // Try to get from cache first
      const cacheKey = `locations:cities:${regionId}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.status(200).json({
          success: true,
          data: cached,
          fromCache: true
        });
      }

      const cities = await locationService.getCities(regionId);

      if (!cities || cities.length === 0) {
        throw new NotFoundError(`لم يتم العثور على مدن للمنطقة ${regionId}`);
      }

      // Cache for 24 hours
      await cache.set(cacheKey, cities, 86400);

      logger.info(`Retrieved ${cities.length} cities for region ${regionId}`);

      res.status(200).json({
        success: true,
        data: cities
      });
    } catch (error) {
      logger.error('Error getting cities:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب المدن',
        messageEn: 'Error getting cities',
        error: error.message
      });
    }
  });

  /**
   * Get districts for a city
   * Cached for 24 hours
   */
  getDistricts = asyncHandler(async (req, res) => {
    try {
      const { cityId } = req.params;

      if (!cityId) {
        throw new ValidationError('يجب تحديد معرف المدينة');
      }

      // Try to get from cache first
      const cacheKey = `locations:districts:${cityId}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.status(200).json({
          success: true,
          data: cached,
          fromCache: true
        });
      }

      const districts = await locationService.getDistricts(cityId);

      if (!districts || districts.length === 0) {
        throw new NotFoundError(`لم يتم العثور على أحياء للمدينة ${cityId}`);
      }

      // Cache for 24 hours
      await cache.set(cacheKey, districts, 86400);

      logger.info(`Retrieved ${districts.length} districts for city ${cityId}`);

      res.status(200).json({
        success: true,
        data: districts
      });
    } catch (error) {
      logger.error('Error getting districts:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الأحياء',
        messageEn: 'Error getting districts',
        error: error.message
      });
    }
  });

  /**
   * Search locations
   */
  searchLocations = asyncHandler(async (req, res) => {
    try {
      const { q, level, limit = 50 } = req.query;

      if (!q || q.length < 2) {
        throw new ValidationError('يجب إدخال كلمة بحث (حد أدنى 2 أحرف)');
      }

      // Sanitize query
      const sanitizedQuery = q.trim().replace(/[<>]/g, '');

      // Try to get from cache first
      const cacheKey = `locations:search:${sanitizedQuery}:${level || 'all'}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.status(200).json({
          success: true,
          data: cached,
          fromCache: true
        });
      }

      const locations = await locationService.searchLocations(sanitizedQuery, level, parseInt(limit) || 50);

      if (!locations || locations.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'لم يتم العثور على نتائج',
          messageEn: 'No results found',
          data: []
        });
      }

      // Cache for 1 hour
      await cache.set(cacheKey, locations, 3600);

      logger.info(`Search completed for "${sanitizedQuery}": ${locations.length} results`);

      res.status(200).json({
        success: true,
        data: locations
      });
    } catch (error) {
      logger.error('Error searching locations:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في البحث',
        messageEn: 'Search error',
        error: error.message
      });
    }
  });

  /**
   * Get location details
   * Cached for 24 hours
   */
  getLocationDetails = asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new ValidationError('يجب تحديد معرف الموقع');
      }

      // Try to get from cache first
      const cacheKey = `locations:details:${id}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.status(200).json({
          success: true,
          data: cached,
          fromCache: true
        });
      }

      const details = await locationService.getLocationDetails(id);

      if (!details) {
        throw new NotFoundError(`الموقع ${id} غير موجود`);
      }

      // Cache for 24 hours
      await cache.set(cacheKey, details, 86400);

      res.status(200).json({
        success: true,
        data: details
      });
    } catch (error) {
      logger.error('Error getting location details:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب تفاصيل الموقع',
        messageEn: 'Error getting location details',
        error: error.message
      });
    }
  });

  /**
   * Get location hierarchy
   * Cached for 24 hours
   */
  getLocationHierarchy = asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new ValidationError('يجب تحديد معرف الموقع');
      }

      // Try to get from cache first
      const cacheKey = `locations:hierarchy:${id}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.status(200).json({
          success: true,
          data: cached,
          fromCache: true
        });
      }

      const hierarchy = await locationService.getLocationHierarchy(id);

      if (!hierarchy) {
        throw new NotFoundError(`الموقع ${id} غير موجود`);
      }

      // Cache for 24 hours
      await cache.set(cacheKey, hierarchy, 86400);

      logger.info(`Retrieved hierarchy for location ${id}`);

      res.status(200).json({
        success: true,
        data: hierarchy
      });
    } catch (error) {
      logger.error('Error getting location hierarchy:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب تسلسل الموقع',
        messageEn: 'Error getting location hierarchy',
        error: error.message
      });
    }
  });

  /**
   * Get statistics about locations
   */
  getLocationStats = asyncHandler(async (req, res) => {
    try {
      // Try to get from cache first
      const cached = await cache.get('locations:stats');
      if (cached) {
        return res.status(200).json({
          success: true,
          data: cached,
          fromCache: true
        });
      }

      const filePath = path.join(__dirname, '../../../data/saudiRegionsComplete.json');
      const data = fs.readFileSync(filePath, 'utf8');
      const regionsData = JSON.parse(data);

      // Calculate statistics
      const stats = {
        totalRegions: regionsData.regions?.length || 0,
        totalCities: regionsData.regions?.reduce((sum, r) => sum + (r.cities?.length || 0), 0) || 0,
        totalNeighborhoods: regionsData.regions?.reduce((sum, r) => 
          sum + (r.cities?.reduce((citySum, c) => citySum + (c.neighborhoods?.length || 0), 0) || 0), 0) || 0,
        totalSports: regionsData.sports?.length || 0,
        totalLevels: regionsData.levels?.length || 0,
        regions: regionsData.regions?.map(r => ({
          id: r.id,
          name: r.nameAr,
          nameEn: r.nameEn,
          cities: r.cities?.length || 0
        })) || []
      };

      // Cache for 24 hours
      await cache.set('locations:stats', stats, 86400);

      logger.info('Location statistics retrieved');

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting location stats:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب إحصائيات المواقع',
        messageEn: 'Error getting location statistics',
        error: error.message
      });
    }
  });
}

module.exports = new LocationController();

