const Location = require('../../../models/Location');

/**
 * Location Service for Matches System
 * Handles validation and retrieval of cities and districts
 */

class LocationService {
  /**
   * Get all regions
   */
  async getRegions() {
    return await Location.find({ level: 'region' })
      .sort({ name_ar: 1 })
      .lean();
  }

  /**
   * Get all cities/governorates
   */
  async getCities(regionId = null) {
    const query = { 
      level: { $in: ['city', 'governorate'] }
    };
    
    if (regionId) {
      query.parent_id = regionId;
    }

    return await Location.find(query)
      .sort({ name_ar: 1 })
      .lean();
  }

  /**
   * Get districts for a city
   */
  async getDistricts(cityId) {
    return await Location.find({ 
      level: 'district',
      parent_id: cityId 
    })
      .sort({ name_ar: 1 })
      .lean();
  }

  /**
   * Validate if city exists
   */
  async validateCity(cityName) {
    const city = await Location.findOne({
      level: { $in: ['city', 'governorate'] },
      $or: [
        { name_ar: new RegExp(cityName, 'i') },
        { name_en: new RegExp(cityName, 'i') }
      ]
    });

    return city;
  }

  /**
   * Validate if area/district exists for a city
   */
  async validateArea(cityName, areaName) {
    // First find the city
    const city = await this.validateCity(cityName);
    if (!city) {
      return null;
    }

    // Then find the area within that city
    const area = await Location.findOne({
      level: 'district',
      parent_id: city._id,
      $or: [
        { name_ar: new RegExp(areaName, 'i') },
        { name_en: new RegExp(areaName, 'i') }
      ]
    });

    return area;
  }

  /**
   * Get or create location
   */
  async getOrCreateLocation(cityName, areaName = null) {
    // Try to find existing city
    let city = await this.validateCity(cityName);
    
    if (!city) {
      // Create city if not exists (for backward compatibility)
      city = await Location.create({
        level: 'city',
        name_ar: cityName,
        name_en: cityName,
        slug: this.generateSlug(cityName),
        parent_id: null
      });
    }

    if (areaName) {
      // Try to find existing area
      let area = await this.validateArea(cityName, areaName);
      
      if (!area) {
        // Create area if not exists
        area = await Location.create({
          level: 'district',
          name_ar: areaName,
          name_en: areaName,
          slug: this.generateSlug(`${cityName}-${areaName}`),
          parent_id: city._id
        });
      }
      
      return { city, area };
    }

    return { city };
  }

  /**
   * Generate slug from name
   */
  generateSlug(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Search locations
   */
  async searchLocations(query, level = null) {
    const filter = {
      $or: [
        { name_ar: new RegExp(query, 'i') },
        { name_en: new RegExp(query, 'i') }
      ]
    };

    if (level) {
      filter.level = level;
    }

    return await Location.find(filter)
      .limit(20)
      .lean();
  }

  /**
   * Get location hierarchy (city -> region -> country)
   */
  async getLocationHierarchy(locationId) {
    const location = await Location.findById(locationId);
    if (!location) return null;

    const hierarchy = [location];
    
    let current = location;
    while (current.parent_id) {
      current = await Location.findById(current.parent_id);
      if (current) {
        hierarchy.unshift(current);
      } else {
        break;
      }
    }

    return hierarchy;
  }

  /**
   * Get location details with full info
   */
  async getLocationDetails(locationId) {
    const location = await Location.findById(locationId).lean();
    if (!location) return null;

    // Get hierarchy
    const hierarchy = await this.getLocationHierarchy(locationId);

    // Get children if any
    const children = await Location.find({ parent_id: locationId }).lean();

    return {
      ...location,
      hierarchy,
      children
    };
  }
}

module.exports = new LocationService();

