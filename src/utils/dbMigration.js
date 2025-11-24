const User = require('../models/User');

// Database migration utility to clean up old fields
class DBMigration {
  // Remove deprecated 'verified' field from all users
  static async removeDeprecatedVerifiedField() {
    try {
      console.log(
        '🔄 Starting migration: Remove deprecated "verified" field...'
      );

      const result = await User.updateMany(
        { verified: { $exists: true } },
        { $unset: { verified: '' } }
      );

      console.log(
        `✅ Migration completed: Removed "verified" field from ${result.modifiedCount} users`
      );
      return { success: true, modifiedCount: result.modifiedCount };
    } catch (error) {
      console.error('❌ Migration failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Fix users who have isVerified = true but still have verification tokens
  static async cleanupVerificationTokens() {
    try {
      console.log(
        '🔄 Starting migration: Cleanup verification tokens for verified users...'
      );

      const result = await User.updateMany(
        {
          isVerified: true,
          $or: [
            { emailVerificationToken: { $exists: true } },
            { emailVerificationTokenExpires: { $exists: true } },
          ],
        },
        {
          $unset: {
            emailVerificationToken: '',
            emailVerificationTokenExpires: '',
          },
        }
      );

      console.log(
        `✅ Migration completed: Cleaned up verification tokens for ${result.modifiedCount} verified users`
      );
      return { success: true, modifiedCount: result.modifiedCount };
    } catch (error) {
      console.error('❌ Migration failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Generate new verification tokens for unverified users with expired tokens
  static async regenerateExpiredTokens() {
    try {
      console.log(
        '🔄 Starting migration: Regenerate expired verification tokens...'
      );

      const users = await User.find({
        isVerified: false,
        emailVerificationTokenExpires: { $lt: Date.now() },
      });

      let count = 0;
      for (const user of users) {
        const newToken = user.generateEmailVerificationToken();
        await user.save();
        count++;
        console.log(`🔄 Generated new token for user: ${user.email}`);
      }

      console.log(
        `✅ Migration completed: Generated new tokens for ${count} users`
      );
      return { success: true, modifiedCount: count };
    } catch (error) {
      console.error('❌ Migration failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Run all migrations
  static async runAllMigrations() {
    console.log('🚀 Starting database migrations...');

    const migrations = [
      this.removeDeprecatedVerifiedField,
      this.cleanupVerificationTokens,
      this.regenerateExpiredTokens,
    ];

    const results = [];
    for (const migration of migrations) {
      const result = await migration();
      results.push(result);
    }

    console.log('✅ All migrations completed');
    return results;
  }
}

module.exports = DBMigration;
