require('dotenv').config();
const mongoose = require('mongoose');
const DBMigration = require('./src/utils/dbMigration');

async function runMigrations() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Run migrations
    await DBMigration.runAllMigrations();

    // Check specific user
    const User = require('./src/models/User');
    const user = await User.findOne({ email: 'hazem10ahmed8@gmail.com' });
    
    if (user) {
      console.log('\n📊 User status after migration:');
      console.log('Email:', user.email);
      console.log('isVerified:', user.isVerified);
      console.log('isActive:', user.isActive);
      console.log('Has verification token:', !!user.emailVerificationToken);
      console.log('Token expires:', user.emailVerificationTokenExpires);
      console.log('Token expired:', user.emailVerificationTokenExpires ? user.emailVerificationTokenExpires < Date.now() : 'N/A');
      
      // If user is verified but still has tokens, clean them up
      if (user.isVerified && user.emailVerificationToken) {
        user.clearEmailVerificationToken();
        await user.save();
        console.log('✅ Cleaned up verification tokens for verified user');
      }
      
      // If user is not verified and token is expired, generate new one
      if (!user.isVerified && (!user.emailVerificationToken || user.emailVerificationTokenExpires < Date.now())) {
        const newToken = user.generateEmailVerificationToken();
        await user.save();
        console.log('✅ Generated new verification token');
        console.log('New token expires:', new Date(user.emailVerificationTokenExpires));
      }
    }

    console.log('\n🎉 Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();