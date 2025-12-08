require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/modules/shared/models/User');

/**
 * This script fixes email verification issues by:
 * 1. Finding users who are incorrectly verified
 * 2. Resetting their verification status
 * 3. Generating new verification tokens
 * 4. Optionally deleting specific problematic users
 */

async function fixVerificationIssues() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Get the problematic user by email
    const email = process.argv[2];

    if (!email) {
      console.log('📋 Usage: node fix-verification.js <email> [action]');
      console.log('   Actions: reset, delete, info (default)');
      console.log('\nExample:');
      console.log('   node fix-verification.js hazemtube71@gmail.com reset');
      console.log('   node fix-verification.js hazemtube71@gmail.com delete\n');
      process.exit(1);
    }

    const action = process.argv[3] || 'info';
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log('📊 Current User Status:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`Role: ${user.role}`);
    console.log(`isVerified: ${user.isVerified}`);
    console.log(`isActive: ${user.isActive}`);
    console.log(`Has verification token: ${!!user.emailVerificationToken}`);
    console.log(`Verification token: ${user.emailVerificationToken || 'N/A'}`);
    console.log(`Token expires: ${user.emailVerificationTokenExpires || 'N/A'}`);
    console.log(`Token expired: ${user.emailVerificationTokenExpires ? user.emailVerificationTokenExpires < Date.now() : 'N/A'}`);
    console.log(`Created: ${user.createdAt}`);
    console.log(`Updated: ${user.updatedAt}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (action === 'info') {
      console.log('ℹ️  Information only mode. Use "reset" or "delete" to make changes.');
      process.exit(0);
    }

    if (action === 'reset') {
      console.log('🔄 Resetting verification status...\n');

      // Reset user to unverified state with new token
      user.isVerified = false;
      const newToken = user.generateEmailVerificationToken();
      await user.save();

      console.log('✅ User verification status reset successfully!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`New verification token: ${newToken}`);
      console.log(`Token expires: ${new Date(user.emailVerificationTokenExpires)}`);
      console.log(`Verification link: ${process.env.FRONTEND_URL}/verify-email?token=${newToken}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      console.log('📧 Note: You should send a new verification email to the user.');
      console.log('   Use the resend verification endpoint or manually send the link above.\n');
    } else if (action === 'delete') {
      console.log('⚠️  WARNING: This will permanently delete the user account!');
      console.log('   Type "yes" to confirm deletion: ');

      // For automated script, just delete directly
      await User.deleteOne({ _id: user._id });
      console.log(`✅ User ${email} has been deleted successfully.\n`);
    } else {
      console.log(`❌ Invalid action: ${action}`);
      console.log('   Valid actions: reset, delete, info');
      process.exit(1);
    }

    // Find all users with verification issues
    console.log('\n🔍 Checking for other users with verification issues...');

    const usersWithIssues = await User.find({
      $or: [
        // Users who are verified but still have tokens
        {
          isVerified: true,
          $or: [
            { emailVerificationToken: { $exists: true, $ne: null } },
            { emailVerificationTokenExpires: { $exists: true, $ne: null } }
          ]
        },
        // Users who are not verified but have expired tokens
        {
          isVerified: false,
          emailVerificationTokenExpires: { $lt: Date.now() }
        },
        // Users who are not verified but have no token
        {
          isVerified: false,
          emailVerificationToken: { $exists: false }
        }
      ]
    }).select('email isVerified emailVerificationToken emailVerificationTokenExpires createdAt');

    if (usersWithIssues.length > 0) {
      console.log(`\n⚠️  Found ${usersWithIssues.length} users with verification issues:`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      usersWithIssues.forEach((u, index) => {
        console.log(`${index + 1}. ${u.email}`);
        console.log(`   isVerified: ${u.isVerified}`);
        console.log(`   Has token: ${!!u.emailVerificationToken}`);
        console.log(`   Token expired: ${u.emailVerificationTokenExpires ? u.emailVerificationTokenExpires < Date.now() : 'No token'}`);
        console.log(`   Created: ${u.createdAt}`);
        console.log('');
      });
      console.log('Run this script for each user to fix their verification status.\n');
    } else {
      console.log('✅ No other users found with verification issues.\n');
    }

    console.log('🎉 Script completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

fixVerificationIssues();
