#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../src/modules/shared/models/User');

const createLeader = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sportsplatform';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const email = 'leader@tf1one.com';
    const password = 'Leader@SecurePass2025';

    // Check if leader exists
    let leader = await User.findOne({ email: email.toLowerCase() });
    
    if (leader) {
      console.log('⚠️  Leader account exists, updating password...');
      const hashedPassword = await bcrypt.hash(password, 12);
      leader.password = hashedPassword;
      leader.isVerified = true;
      leader.isActive = true;
      await leader.save();
      console.log('✅ Password updated');
    } else {
      console.log('📝 Creating new leader account...');
      const hashedPassword = await bcrypt.hash(password, 12);
      leader = await User.create({
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName: 'Leader',
        lastName: 'Admin',
        role: 'leader',
        isVerified: true,
        isActive: true
      });
      console.log('✅ Leader account created');
    }

    console.log('\n🎉 Success!');
    console.log('📧 Email:', leader.email);
    console.log('🔐 Password: Leader@SecurePass2025');
    console.log('👤 Role:', leader.role);
    console.log('✓ Verified:', leader.isVerified);
    console.log('✓ Active:', leader.isActive);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createLeader();
