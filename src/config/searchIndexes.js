const mongoose = require('mongoose');

async function createSearchIndexes() {
  try {
    console.log('🔍 Creating search indexes...');

    const db = mongoose.connection.db;
    
    // Helper function to safely create index
    async function safeCreateIndex(collection, indexSpec, options = {}) {
      try {
        // Check if index already exists
        const existingIndexes = await collection.listIndexes().toArray();
        const indexExists = existingIndexes.some(idx => 
          JSON.stringify(idx.key) === JSON.stringify(indexSpec) ||
          (options.name && idx.name === options.name)
        );
        
        if (!indexExists) {
          await collection.createIndex(indexSpec, options);
          console.log(`✅ Created index: ${options.name || JSON.stringify(indexSpec)}`);
        } else {
          console.log(`⏭️ Index already exists: ${options.name || JSON.stringify(indexSpec)}`);
        }
      } catch (error) {
        if (error.code === 85) { // IndexOptionsConflict
          console.log(`⚠️ Index conflict (ignored): ${options.name || JSON.stringify(indexSpec)}`);
        } else {
          console.log(`❌ Failed to create index ${options.name}: ${error.message}`);
        }
      }
    }
    
    // User collection indexes for search optimization
    const userCollection = db.collection('users');
    
    // Compound text index for full-text search
    await safeCreateIndex(userCollection, {
      firstName: 'text',
      lastName: 'text',
      organizationName: 'text',
      location: 'text',
      role: 'text'
    }, {
      name: 'search_text_index',
      weights: {
        firstName: 10,
        lastName: 10,
        organizationName: 15,
        location: 5,
        role: 3
      },
      default_language: 'english'
    });

    // Individual field indexes for efficient filtering
    await safeCreateIndex(userCollection, { role: 1, isVerified: 1 }, { name: 'role_verified_index' });
    await safeCreateIndex(userCollection, { location: 1 }, { name: 'location_index' });
    await safeCreateIndex(userCollection, { createdAt: -1 }, { name: 'created_date_index' });
    await safeCreateIndex(userCollection, { isVerified: 1, role: 1, createdAt: -1 }, { name: 'verified_role_created_index' });

    // Profile collection indexes
    const profileCollection = db.collection('profiles');
    
    await safeCreateIndex(profileCollection, { primarySport: 1 }, { name: 'primary_sport_index' });
    await safeCreateIndex(profileCollection, { experienceLevel: 1 }, { name: 'experience_level_index' });
    await safeCreateIndex(profileCollection, { verified: 1 }, { name: 'profile_verified_index' });
    await safeCreateIndex(profileCollection, { rating: -1 }, { name: 'profile_rating_index' });

    // Club Profile collection indexes
    const clubProfileCollection = db.collection('clubprofiles');
    
    await safeCreateIndex(clubProfileCollection, { organizationType: 1 }, { name: 'organization_type_index' });
    await safeCreateIndex(clubProfileCollection, { verified: 1 }, { name: 'club_verified_index' });
    await safeCreateIndex(clubProfileCollection, { rating: -1 }, { name: 'club_rating_index' });

    // Jobs collection indexes for job count aggregation
    const jobsCollection = db.collection('jobs');
    
    await safeCreateIndex(jobsCollection, { clubId: 1, status: 1 }, { name: 'club_status_index' });
    await safeCreateIndex(jobsCollection, { status: 1, createdAt: -1 }, { name: 'status_created_index' });

    console.log('✅ Search indexes initialization completed');

    return {
      success: true,
      message: 'Search indexes initialization completed successfully'
    };

  } catch (error) {
    console.error('❌ Error during search indexes initialization:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function dropSearchIndexes() {
  try {
    console.log('🗑️ Dropping search indexes...');

    const db = mongoose.connection.db;
    
    const collections = ['users', 'profiles', 'clubprofiles', 'jobs'];
    
    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      
      try {
        // Drop specific search-related indexes (keep _id and unique indexes)
        const indexes = await collection.listIndexes().toArray();
        
        for (const index of indexes) {
          if (index.name !== '_id_' && !index.unique) {
            await collection.dropIndex(index.name);
            console.log(`Dropped index: ${index.name} from ${collectionName}`);
          }
        }
      } catch (err) {
        console.log(`No custom indexes to drop in ${collectionName}`);
      }
    }

    console.log('✅ Search indexes dropped successfully');
    return { success: true, message: 'Search indexes dropped successfully' };

  } catch (error) {
    console.error('❌ Error dropping search indexes:', error);
    return { success: false, error: error.message };
  }
}

async function getIndexStats() {
  try {
    const db = mongoose.connection.db;
    const collections = ['users', 'profiles', 'clubprofiles', 'jobs'];
    const stats = {};

    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      const indexes = await collection.listIndexes().toArray();
      const collStats = await collection.stats();
      
      stats[collectionName] = {
        totalIndexes: indexes.length,
        indexNames: indexes.map(i => i.name),
        totalSize: collStats.size,
        totalIndexSize: collStats.totalIndexSize,
        avgObjSize: collStats.avgObjSize
      };
    }

    return { success: true, stats };

  } catch (error) {
    console.error('❌ Error getting index stats:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  createSearchIndexes,
  dropSearchIndexes,
  getIndexStats
};