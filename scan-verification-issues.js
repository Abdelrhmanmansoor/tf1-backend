require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/modules/shared/models/User');

/**
 * This script scans the database for all users with verification issues
 */

async function scanVerificationIssues() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    console.log('🔍 Scanning for verification issues...\n');

    // Get all users
    const allUsers = await User.find({}).select('email isVerified emailVerificationToken emailVerificationTokenExpires createdAt updatedAt');

    console.log(`📊 Total users in database: ${allUsers.length}\n`);

    // Category 1: Verified users who still have tokens (ISSUE)
    const verifiedWithTokens = allUsers.filter(u =>
      u.isVerified && (u.emailVerificationToken || u.emailVerificationTokenExpires)
    );

    // Category 2: Unverified users with expired tokens (ISSUE)
    const unverifiedExpired = allUsers.filter(u =>
      !u.isVerified && u.emailVerificationTokenExpires && u.emailVerificationTokenExpires < Date.now()
    );

    // Category 3: Unverified users with no token (ISSUE)
    const unverifiedNoToken = allUsers.filter(u =>
      !u.isVerified && !u.emailVerificationToken
    );

    // Category 4: Unverified users with valid tokens (OK)
    const unverifiedValid = allUsers.filter(u =>
      !u.isVerified && u.emailVerificationToken && u.emailVerificationTokenExpires && u.emailVerificationTokenExpires >= Date.now()
    );

    // Category 5: Verified users without tokens (OK)
    const verifiedClean = allUsers.filter(u =>
      u.isVerified && !u.emailVerificationToken && !u.emailVerificationTokenExpires
    );

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 VERIFICATION STATUS SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ HEALTHY USERS:');
    console.log(`   • Verified users (clean): ${verifiedClean.length}`);
    console.log(`   • Unverified with valid tokens: ${unverifiedValid.length}`);
    console.log(`   Total healthy: ${verifiedClean.length + unverifiedValid.length}\n`);

    console.log('⚠️  USERS WITH ISSUES:');
    console.log(`   • Verified but still have tokens: ${verifiedWithTokens.length}`);
    console.log(`   • Unverified with expired tokens: ${unverifiedExpired.length}`);
    console.log(`   • Unverified with no token: ${unverifiedNoToken.length}`);
    console.log(`   Total with issues: ${verifiedWithTokens.length + unverifiedExpired.length + unverifiedNoToken.length}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Show details for problematic users
    if (verifiedWithTokens.length > 0) {
      console.log('🔴 ISSUE #1: Verified users who still have verification tokens');
      console.log('   This indicates the tokens were not cleaned up after verification.\n');
      verifiedWithTokens.forEach((u, i) => {
        console.log(`   ${i + 1}. ${u.email}`);
        console.log(`      Token: ${u.emailVerificationToken || 'none'}`);
        console.log(`      Expires: ${u.emailVerificationTokenExpires || 'none'}`);
        console.log(`      Created: ${u.createdAt}`);
        console.log(`      Updated: ${u.updatedAt}\n`);
      });
    }

    if (unverifiedExpired.length > 0) {
      console.log('🟡 ISSUE #2: Unverified users with expired tokens');
      console.log('   These users need new verification tokens.\n');
      unverifiedExpired.forEach((u, i) => {
        const daysExpired = Math.floor((Date.now() - u.emailVerificationTokenExpires) / (1000 * 60 * 60 * 24));
        console.log(`   ${i + 1}. ${u.email}`);
        console.log(`      Token expired: ${daysExpired} days ago`);
        console.log(`      Created: ${u.createdAt}\n`);
      });
    }

    if (unverifiedNoToken.length > 0) {
      console.log('🟡 ISSUE #3: Unverified users with no verification token');
      console.log('   These users cannot verify their email.\n');
      unverifiedNoToken.forEach((u, i) => {
        console.log(`   ${i + 1}. ${u.email}`);
        console.log(`      Created: ${u.createdAt}\n`);
      });
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Recommendations
    if (verifiedWithTokens.length + unverifiedExpired.length + unverifiedNoToken.length > 0) {
      console.log('💡 RECOMMENDATIONS:\n');

      if (verifiedWithTokens.length > 0) {
        console.log('   For verified users with tokens:');
        console.log('   → These tokens should be cleaned up. They are no longer needed.\n');
      }

      if (unverifiedExpired.length > 0) {
        console.log('   For unverified users with expired tokens:');
        console.log('   → Generate new verification tokens and resend verification emails.\n');
      }

      if (unverifiedNoToken.length > 0) {
        console.log('   For unverified users with no tokens:');
        console.log('   → Generate verification tokens and send verification emails.\n');
      }

      console.log('   Run: node fix-verification.js <email> reset');
      console.log('   To reset any specific user\'s verification status.\n');
    } else {
      console.log('✅ All users have healthy verification status!\n');
    }

    console.log('🎉 Scan completed successfully!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Scan failed:', error);
    process.exit(1);
  }
}

scanVerificationIssues();
