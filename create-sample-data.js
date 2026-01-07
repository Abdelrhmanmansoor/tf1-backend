/**
 * Create Sample Data for Testing
 * Run this after MongoDB is connected
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const MatchUser = require('./src/modules/matches/models/MatchUser');
const Match = require('./src/modules/matches/models/Match');
const Location = require('./src/models/Location');

async function createSampleData() {
  try {
    console.log('🚀 Creating sample data for Matches System...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sportsplatform';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Create sample locations first
    console.log('📍 Creating sample locations...');
    const riyadh = await Location.findOneAndUpdate(
      { slug: 'riyadh' },
      {
        level: 'city',
        name_ar: 'الرياض',
        name_en: 'Riyadh',
        slug: 'riyadh',
        parent_id: null
      },
      { upsert: true, new: true }
    );

    const alOlaya = await Location.findOneAndUpdate(
      { slug: 'riyadh-al-olaya' },
      {
        level: 'district',
        name_ar: 'العليا',
        name_en: 'Al Olaya',
        slug: 'riyadh-al-olaya',
        parent_id: riyadh._id
      },
      { upsert: true, new: true }
    );

    const alMalqa = await Location.findOneAndUpdate(
      { slug: 'riyadh-al-malqa' },
      {
        level: 'district',
        name_ar: 'الملقا',
        name_en: 'Al Malqa',
        slug: 'riyadh-al-malqa',
        parent_id: riyadh._id
      },
      { upsert: true, new: true }
    );

    console.log('✅ Created 3 locations\n');

    // Create sample users
    console.log('👥 Creating sample users...');
    
    const users = [];
    for (let i = 1; i <= 5; i++) {
      const user = await MatchUser.findOneAndUpdate(
        { email: `user${i}@test.com` },
        {
          name: `Test User ${i}`,
          email: `user${i}@test.com`,
          password_hash: 'Test1234', // Will be hashed automatically
          verified: true,
          role: 'MatchUser'
        },
        { upsert: true, new: true }
      );
      users.push(user);
    }
    console.log(`✅ Created ${users.length} users\n`);

    // Create sample matches
    console.log('⚽ Creating sample matches...');
    
    const sports = ['Football', 'Basketball', 'Volleyball', 'Tennis'];
    const levels = ['beginner', 'intermediate', 'advanced'];
    const locations = [alOlaya, alMalqa];
    
    const matches = [];
    for (let i = 0; i < 10; i++) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 14) + 1);
      
      const sport = sports[Math.floor(Math.random() * sports.length)];
      const level = levels[Math.floor(Math.random() * levels.length)];
      const location = locations[Math.floor(Math.random() * locations.length)];
      const owner = users[Math.floor(Math.random() * users.length)];
      const maxPlayers = 10 + Math.floor(Math.random() * 15);
      const currentPlayers = Math.floor(Math.random() * maxPlayers * 0.7);
      
      const match = await Match.create({
        owner_id: owner._id,
        created_by: owner._id,
        title: `${sport} Match ${i + 1}`,
        sport,
        city: 'الرياض',
        area: location.name_ar,
        location: `${location.name_ar} Sports Club`,
        location_id: location._id,
        date: futureDate,
        time: `${16 + Math.floor(Math.random() * 5)}:00`,
        level,
        max_players: maxPlayers,
        current_players: currentPlayers,
        cost_per_player: Math.random() > 0.5 ? Math.floor(Math.random() * 100) : 0,
        currency: 'SAR',
        notes: `مباراة ${sport} مستوى ${level}`,
        status: currentPlayers >= maxPlayers ? 'full' : 'open'
      });
      matches.push(match);
    }

    console.log(`✅ Created ${matches.length} matches\n`);

    // Print summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ Sample Data Created Successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n📊 Summary:`);
    console.log(`   Users: ${users.length}`);
    console.log(`   Matches: ${matches.length}`);
    console.log(`   Locations: 3`);
    console.log(`\n🎯 Test Accounts:`);
    users.slice(0, 3).forEach((user, i) => {
      console.log(`   ${i + 1}. Email: ${user.email} | Password: Test1234`);
    });
    console.log(`\n🌐 Access:`);
    console.log(`   API: http://localhost:4000/matches/api/matches`);
    console.log(`   Login: http://localhost:4000/matches/api/auth/login`);
    console.log('\n✅ Ready to use!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    process.exit(1);
  }
}

// Run
createSampleData();

