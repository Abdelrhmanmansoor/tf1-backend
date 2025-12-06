require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/modules/shared/models/User');

(async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    
    // Delete the problematic leader account
    await User.deleteOne({ email: 'leader@tf1one.com' });
    console.log('✅ Deleted old leader account');
    
    // Create new one via model (which will properly hash)
    const newLeader = new User({
      email: 'leader@tf1one.com',
      password: 'Leader@SecurePass2025',
      firstName: 'Leader',
      lastName: 'Admin',
      role: 'leader',
      isVerified: true,
      isActive: true
    });
    
    await newLeader.save();
    console.log('✅ Created new leader account');
    console.log('📧 Email: leader@tf1one.com');
    console.log('🔐 Password: Leader@SecurePass2025');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
