/**
 * Test and Fix All Issues
 * This script tests all features and fixes common problems
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const MatchUser = require('./src/modules/matches/models/MatchUser');
const Match = require('./src/modules/matches/models/Match');
const Location = require('./src/models/Location');

async function testAndFix() {
  try {
    console.log('🚀 Testing and Fixing Matches System...\n');

    // 1. Test MongoDB Connection
    console.log('1️⃣ Testing MongoDB connection...');
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sportsplatform';
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000
      });
      console.log('✅ MongoDB connected successfully\n');
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      console.log('\n🔧 Fix: Update MONGODB_URI in .env file');
      console.log('   For local: mongodb://localhost:27017/sportsplatform');
      console.log('   For Atlas: mongodb+srv://...\n');
      process.exit(1);
    }

    // 2. Check and seed locations
    console.log('2️⃣ Checking locations...');
    const locationCount = await Location.countDocuments();
    console.log(`   Found ${locationCount} locations`);

    if (locationCount === 0) {
      console.log('   📍 No locations found, seeding...');
      
      // Create basic Saudi locations
      const riyadh = await Location.create({
        level: 'city',
        name_ar: 'الرياض',
        name_en: 'Riyadh',
        slug: 'riyadh',
        parent_id: null
      });

      await Location.create({
        level: 'district',
        name_ar: 'العليا',
        name_en: 'Al Olaya',
        slug: 'riyadh-al-olaya',
        parent_id: riyadh._id
      });

      await Location.create({
        level: 'district',
        name_ar: 'الملقا',
        name_en: 'Al Malqa',
        slug: 'riyadh-al-malqa',
        parent_id: riyadh._id
      });

      await Location.create({
        level: 'city',
        name_ar: 'جدة',
        name_en: 'Jeddah',
        slug: 'jeddah',
        parent_id: null
      });

      await Location.create({
        level: 'city',
        name_ar: 'الدمام',
        name_en: 'Dammam',
        slug: 'dammam',
        parent_id: null
      });

      console.log('✅ Created 5 essential locations\n');
    } else {
      console.log('✅ Locations already exist\n');
    }

    // 3. Test user creation
    console.log('3️⃣ Testing user creation...');
    try {
      const testUser = await MatchUser.findOne({ email: 'test@example.com' });
      
      if (!testUser) {
        const newUser = await MatchUser.create({
          name: 'Test User',
          email: 'test@example.com',
          password_hash: 'Test1234',
          verified: true,
          role: 'MatchUser'
        });
        console.log('✅ Created test user: test@example.com / Test1234\n');
      } else {
        console.log('✅ Test user already exists\n');
      }
    } catch (error) {
      console.error('❌ User creation failed:', error.message);
    }

    // 4. Test match creation
    console.log('4️⃣ Testing match creation...');
    try {
      const user = await MatchUser.findOne({ email: 'test@example.com' });
      
      if (!user) {
        console.log('⚠️ No user found, skipping match creation\n');
      } else {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);

        const testMatch = await Match.create({
          owner_id: user._id,
          created_by: user._id,
          title: 'Test Match',
          sport: 'Football',
          city: 'الرياض',
          area: 'العليا',
          location: 'النادي الرياضي',
          date: futureDate,
          time: '18:00',
          level: 'intermediate',
          max_players: 14,
          current_players: 0,
          cost_per_player: 0,
          currency: 'SAR',
          status: 'open'
        });

        console.log('✅ Test match created successfully');
        console.log(`   ID: ${testMatch._id}`);
        console.log(`   Title: ${testMatch.title}\n`);
      }
    } catch (error) {
      console.error('❌ Match creation failed:', error.message);
      console.log('   Details:', error);
    }

    // 5. Print summary
    const [totalUsers, totalMatches, totalLocations] = await Promise.all([
      MatchUser.countDocuments(),
      Match.countDocuments(),
      Location.countDocuments()
    ]);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ System Check Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n📊 Database Status:`);
    console.log(`   Users: ${totalUsers}`);
    console.log(`   Matches: ${totalMatches}`);
    console.log(`   Locations: ${totalLocations}`);

    if (totalUsers > 0 && totalMatches > 0 && totalLocations > 0) {
      console.log('\n✅ ALL SYSTEMS GO! 🚀');
      console.log('\n🎯 Test Credentials:');
      console.log('   Email: test@example.com');
      console.log('   Password: Test1234');
      console.log('\n🌐 API Endpoints:');
      console.log('   Base: http://localhost:4000');
      console.log('   Matches: http://localhost:4000/matches/api/matches');
      console.log('   Swipe: http://localhost:4000/matches/api/swipe/discover');
    } else {
      console.log('\n⚠️ Some data is missing. Run: npm run seed:sample');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run
testAndFix();

