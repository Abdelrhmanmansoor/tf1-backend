const User = require('../models/User');

// Database migration utility to clean up old fields
class DBMigration {
  // Remove deprecated 'verified' field from all users
  static async removeDeprecatedVerifiedField() {
    try {
      logger.info(
        '🔄 Starting migration: Remove deprecated "verified" field...'
      );

      const result = await User.updateMany(
        { verified: { $exists: true } },
        { $unset: { verified: '' } }
      );

      logger.info(
        `✅ Migration completed: Removed "verified" field from ${result.modifiedCount} users`
      );
      return { success: true, modifiedCount: result.modifiedCount };
    } catch (error) {
      logger.error('❌ Migration failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Fix users who have isVerified = true but still have verification tokens
  static async cleanupVerificationTokens() {
    try {
      logger.info(
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

      logger.info(
        `✅ Migration completed: Cleaned up verification tokens for ${result.modifiedCount} verified users`
      );
      return { success: true, modifiedCount: result.modifiedCount };
    } catch (error) {
      logger.error('❌ Migration failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Generate new verification tokens for unverified users with expired tokens
  static async regenerateExpiredTokens() {
    try {
      logger.info(
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
        logger.info(`🔄 Generated new token for user: ${user.email}`);
      }

      logger.info(
        `✅ Migration completed: Generated new tokens for ${count} users`
      );
      return { success: true, modifiedCount: count };
    } catch (error) {
      logger.error('❌ Migration failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Run all migrations
  static async runAllMigrations() {
    logger.info('🚀 Starting database migrations...');

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

    logger.info('✅ All migrations completed');
    return results;
  }
}

module.exports = DBMigration;
