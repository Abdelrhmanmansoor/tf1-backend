/**
 * Notification Models Unification Migration Script
 *
 * This script unifies two notification models:
 * 1. src/models/Notification.js (Global/Legacy)
 * 2. src/modules/notifications/models/Notification.js (Job Publisher specific)
 *
 * Strategy: Use the job publisher notification model as primary since it's more
 * feature-rich and designed for the current architecture.
 *
 * Steps:
 * 1. Backup both notification collections
 * 2. Migrate data from legacy model to new unified schema
 * 3. Update all imports across the codebase
 * 4. Archive legacy model
 *
 * IMPORTANT: Run this during a maintenance window with database backup!
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const fs = require('fs').promises;
const path = require('path');

// Import both models
const LegacyNotification = require('../../models/Notification');
const ModernNotification = require('../../modules/notifications/models/Notification');

/**
 * Configuration
 */
const CONFIG = {
  backupDir: path.join(__dirname, '../../../backups'),
  dryRun: process.env.DRY_RUN === 'true', // Set to true for testing
  batchSize: 100
};

/**
 * Backup existing notifications to JSON files
 */
async function backupNotifications() {
  try {
    logger.info('📦 Starting notification backup...');

    // Create backup directory
    await fs.mkdir(CONFIG.backupDir, { recursive: true });

    // Backup legacy notifications
    const legacyNotifications = await LegacyNotification.find({}).lean();
    const legacyBackupPath = path.join(
      CONFIG.backupDir,
      `legacy-notifications-${Date.now()}.json`
    );
    await fs.writeFile(
      legacyBackupPath,
      JSON.stringify(legacyNotifications, null, 2)
    );
    logger.info(`✅ Backed up ${legacyNotifications.length} legacy notifications to ${legacyBackupPath}`);

    // Backup modern notifications
    const modernNotifications = await ModernNotification.find({}).lean();
    const modernBackupPath = path.join(
      CONFIG.backupDir,
      `modern-notifications-${Date.now()}.json`
    );
    await fs.writeFile(
      modernBackupPath,
      JSON.stringify(modernNotifications, null, 2)
    );
    logger.info(`✅ Backed up ${modernNotifications.length} modern notifications to ${modernBackupPath}`);

    return {
      legacyCount: legacyNotifications.length,
      modernCount: modernNotifications.length
    };
  } catch (error) {
    logger.error('❌ Backup failed:', error);
    throw error;
  }
}

/**
 * Map legacy notification fields to modern schema
 */
function mapLegacyToModern(legacy) {
  return {
    recipientId: legacy.userId,
    senderId: null, // Legacy model doesn't have sender
    type: mapLegacyType(legacy.type),
    title: legacy.title || 'Notification',
    titleAr: legacy.titleAr || 'إشعار',
    message: legacy.message || '',
    messageAr: legacy.messageAr || '',
    priority: legacy.priority || 'normal',
    relatedTo: legacy.relatedTo || { entityType: 'unknown', entityId: null },
    actionUrl: legacy.actionUrl || null,
    metadata: legacy.metadata || {},
    channels: determineChannels(legacy),
    read: legacy.read || false,
    readAt: legacy.readAt || null,
    delivered: legacy.delivered !== undefined ? legacy.delivered : true,
    deliveredAt: legacy.deliveredAt || legacy.createdAt,
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt
  };
}

/**
 * Map legacy notification types to modern equivalents
 */
function mapLegacyType(legacyType) {
  const typeMapping = {
    // Player/Training related
    'training_offer': 'system_notification',
    'training_accepted': 'system_notification',
    'training_rejected': 'system_notification',
    'session_reminder': 'system_notification',
    'session_cancelled': 'system_notification',
    'session_completed': 'system_notification',

    // Job related (map to modern job types)
    'job_match': 'job_posted',
    'job_application': 'job_application',
    'application_status_change': 'application_status_change',
    'interview_scheduled': 'interview_scheduled',

    // Club related
    'club_accepted': 'system_notification',
    'club_rejected': 'system_notification',

    // Default
    'default': 'system_notification'
  };

  return typeMapping[legacyType] || 'system_notification';
}

/**
 * Determine notification channels based on legacy data
 */
function determineChannels(legacy) {
  const channels = ['in_app']; // Always include in-app

  // If email was sent (based on metadata or flags)
  if (legacy.emailSent || legacy.metadata?.emailSent) {
    channels.push('email');
  }

  // If SMS was sent
  if (legacy.smsSent || legacy.metadata?.smsSent) {
    channels.push('sms');
  }

  // If push notification was sent
  if (legacy.pushSent || legacy.metadata?.pushSent) {
    channels.push('push');
  }

  return channels;
}

/**
 * Migrate notifications in batches
 */
async function migrateNotifications() {
  try {
    logger.info('🔄 Starting notification migration...');

    const legacyNotifications = await LegacyNotification.find({});
    const totalCount = legacyNotifications.length;
    let migratedCount = 0;
    let errorCount = 0;

    logger.info(`📊 Found ${totalCount} legacy notifications to migrate`);

    // Process in batches
    for (let i = 0; i < legacyNotifications.length; i += CONFIG.batchSize) {
      const batch = legacyNotifications.slice(i, i + CONFIG.batchSize);

      logger.info(`Processing batch ${Math.floor(i / CONFIG.batchSize) + 1}...`);

      for (const legacy of batch) {
        try {
          // Check if already migrated (by checking recipientId + createdAt)
          const exists = await ModernNotification.findOne({
            recipientId: legacy.userId,
            createdAt: legacy.createdAt
          });

          if (exists) {
            logger.info(`⏭️  Skipping duplicate: ${legacy._id}`);
            continue;
          }

          // Map to modern schema
          const modernData = mapLegacyToModern(legacy);

          if (CONFIG.dryRun) {
            logger.info(`[DRY RUN] Would migrate: ${legacy._id}`);
            logger.info(JSON.stringify(modernData, null, 2));
          } else {
            // Create in modern collection
            await ModernNotification.create(modernData);
            migratedCount++;
          }
        } catch (error) {
          logger.error(`❌ Error migrating notification ${legacy._id}:`, error.message);
          errorCount++;
        }
      }
    }

    logger.info(`✅ Migration complete!`);
    logger.info(`   - Migrated: ${migratedCount}`);
    logger.info(`   - Errors: ${errorCount}`);
    logger.info(`   - Total: ${totalCount}`);

    return { migratedCount, errorCount, totalCount };
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Verify migration integrity
 */
async function verifyMigration() {
  try {
    logger.info('🔍 Verifying migration...');

    const legacyCount = await LegacyNotification.countDocuments();
    const modernCount = await ModernNotification.countDocuments();

    logger.info(`📊 Legacy notifications: ${legacyCount}`);
    logger.info(`📊 Modern notifications: ${modernCount}`);

    // Check for data integrity issues
    const issues = [];

    // Sample check: Verify a few random notifications
    const sampleSize = Math.min(10, legacyCount);
    const samples = await LegacyNotification.aggregate([
      { $sample: { size: sampleSize } }
    ]);

    for (const sample of samples) {
      const migrated = await ModernNotification.findOne({
        recipientId: sample.userId,
        createdAt: sample.createdAt
      });

      if (!migrated) {
        issues.push(`Missing migrated notification for legacy ID: ${sample._id}`);
      }
    }

    if (issues.length > 0) {
      logger.warn('⚠️  Verification found issues:');
      issues.forEach(issue => logger.warn(`   - ${issue}`));
    } else {
      logger.info('✅ Verification passed!');
    }

    return { success: issues.length === 0, issues };
  } catch (error) {
    logger.error('❌ Verification failed:', error);
    throw error;
  }
}

/**
 * Generate import update report
 */
function generateImportUpdateReport() {
  const filesToUpdate = [
    'src/modules/job-publisher/controllers/applicationController.js',
    'src/modules/job-publisher/controllers/jobPublisherController.js',
    'src/middleware/notificationHandler.js',
    // Add more files as discovered
  ];

  const report = `
# Notification Model Import Update Report

## Files that need import updates:

${filesToUpdate.map((file, i) => `${i + 1}. ${file}`).join('\n')}

## Find and Replace:

**Old import:**
\`\`\`javascript
const Notification = require('../../models/Notification');
// or
const Notification = require('../models/Notification');
\`\`\`

**New import:**
\`\`\`javascript
const Notification = require('../../modules/notifications/models/Notification');
// or adjust path as needed
\`\`\`

## Search Command:
\`\`\`bash
grep -r "require.*models/Notification" src/
\`\`\`

## After updating all imports:
1. Run all tests
2. Test notification creation
3. Test notification querying
4. Monitor error logs

## Archive Legacy Model:
Once all imports are updated and tested:
\`\`\`bash
mkdir -p src/models/archived
mv src/models/Notification.js src/models/archived/Notification.legacy.js
\`\`\`
`;

  return report;
}

/**
 * Main execution
 */
async function main() {
  try {
    logger.info('🚀 Starting Notification Model Unification');
    logger.info(`Mode: ${CONFIG.dryRun ? 'DRY RUN' : 'LIVE'}`);

    // Step 1: Backup
    await backupNotifications();

    // Step 2: Migrate
    const migrationResult = await migrateNotifications();

    // Step 3: Verify
    const verificationResult = await verifyMigration();

    // Step 4: Generate import update report
    const importReport = generateImportUpdateReport();
    const reportPath = path.join(CONFIG.backupDir, `import-update-report-${Date.now()}.md`);
    await fs.writeFile(reportPath, importReport);
    logger.info(`📄 Import update report saved to: ${reportPath}`);

    logger.info('✅ Migration process complete!');
    logger.info('⚠️  NEXT STEPS:');
    logger.info('   1. Review the import update report');
    logger.info('   2. Update all imports to use the unified model');
    logger.info('   3. Run full test suite');
    logger.info('   4. Deploy to staging and test');
    logger.info('   5. Archive legacy model');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  backupNotifications,
  migrateNotifications,
  verifyMigration,
  generateImportUpdateReport
};
