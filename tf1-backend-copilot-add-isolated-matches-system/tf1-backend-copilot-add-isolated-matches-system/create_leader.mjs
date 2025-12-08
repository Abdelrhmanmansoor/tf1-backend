import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

async function createLeader() {
  try {
    const mongoUrl = process.env.MONGODB_URI;
    console.log('📦 Connecting to MongoDB...');
    
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB');
    
    // Define User schema inline
    const userSchema = new mongoose.Schema({
      email: String,
      password: String,
      firstName: String,
      lastName: String,
      role: String,
      isActive: Boolean,
      isVerified: Boolean,
      createdAt: { type: Date, default: Date.now }
    });
    
    const User = mongoose.model('User', userSchema);
    
    // Delete existing
    const result = await User.deleteMany({ email: 'leader@sportx.com' });
    console.log(`🗑️  Deleted ${result.deletedCount} existing accounts`);
    
    // Hash password
    const hashedPassword = await bcrypt.hash('Leader123456', 12);
    
    // Create new leader
    const leader = new User({
      email: 'leader@sportx.com',
      password: hashedPassword,
      firstName: 'محمد',
      lastName: 'القائد',
      role: 'leader',
      isActive: true,
      isVerified: true
    });
    
    await leader.save();
    console.log('✅ Leader account created!');
    console.log('');
    console.log('🎯 LOGIN CREDENTIALS:');
    console.log('═══════════════════════════════════');
    console.log('📧 Email:    leader@sportx.com');
    console.log('🔐 Password: Leader123456');
    console.log('👤 Role:     leader');
    console.log('═══════════════════════════════════');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createLeader();
