/**
 * Auto-Initialization System
 * Automatically seeds locations and sets up the system on first run
 */

const Location = require('../../../models/Location');
const { saudiLocations } = require('../../../seeders/saudi-locations');

class AutoInitializer {
  constructor() {
    this.initialized = false;
  }

  /**
   * Check if locations are already seeded
   */
  async checkLocations() {
    try {
      const count = await Location.countDocuments();
      return count > 0;
    } catch (error) {
      console.error('Error checking locations:', error);
      return false;
    }
  }

  /**
   * Auto-seed locations on first run
   */
  async seedLocationsIfNeeded() {
    try {
      const hasLocations = await this.checkLocations();
      
      if (hasLocations) {
        console.log('✓ Locations already seeded');
        return true;
      }

      console.log('🌍 Auto-seeding locations...');
      
      // Clear any partial data
      await Location.deleteMany({});
      
      let created = 0;

      // Insert locations recursively
      async function insertLocations(locations, parentId = null) {
        for (const loc of locations) {
          const { children, ...locationData } = loc;
          
          const location = await Location.create({
            ...locationData,
            parent_id: parentId
          });
          
          created++;

          if (children && children.length > 0) {
            await insertLocations(children, location._id);
          }
        }
      }

      await insertLocations(saudiLocations);

      console.log(`✅ Auto-seeded ${created} locations successfully!`);
      
      // Print summary
      const counts = await Promise.all([
        Location.countDocuments({ level: 'region' }),
        Location.countDocuments({ level: 'city' }),
        Location.countDocuments({ level: 'district' })
      ]);

      console.log(`📊 Locations Summary:`);
      console.log(`   Regions: ${counts[0]}`);
      console.log(`   Cities: ${counts[1]}`);
      console.log(`   Districts: ${counts[2]}`);

      return true;
    } catch (error) {
      console.error('❌ Error auto-seeding locations:', error.message);
      return false;
    }
  }

  /**
   * Initialize the entire system
   */
  async initialize() {
    if (this.initialized) {
      return true;
    }

    console.log('🚀 Initializing Matches System...');

    try {
      // Seed locations
      await this.seedLocationsIfNeeded();

      // Add more initialization steps here as needed
      // - Create default settings
      // - Setup indexes
      // - Initialize cache
      // etc.

      this.initialized = true;
      console.log('✅ Matches System Initialized Successfully!');
      return true;
    } catch (error) {
      console.error('❌ System Initialization Failed:', error.message);
      return false;
    }
  }

  /**
   * Middleware to ensure system is initialized
   */
  ensureInitialized() {
    return async (req, res, next) => {
      if (!this.initialized) {
        try {
          await this.initialize();
        } catch (error) {
          console.error('Initialization error:', error);
        }
      }
      next();
    };
  }
}

// Export singleton instance
const autoInitializer = new AutoInitializer();

module.exports = autoInitializer;


