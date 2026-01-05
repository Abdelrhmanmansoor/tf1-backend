#!/usr/bin/env node

/**
 * Initialize Admin Dashboard
 * This script creates the first admin key and sets up the database
 */

require('dotenv').config();
const mongoose = require('mongoose');
const chalk = require('chalk');

const AdminKey = require('./src/modules/admin-dashboard/models/AdminKey');
const SystemSettings = require('./src/modules/admin-dashboard/models/SystemSettings');
const AdminLog = require('./src/modules/admin-dashboard/models/AdminLog');

async function initializeDashboard() {
  try {
    console.log(chalk.blue.bold('\n🚀 Initializing Admin Dashboard...\n'));

    // Connect to database
    console.log(chalk.yellow('📡 Connecting to MongoDB...'));
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sportsplatform');
    console.log(chalk.green('✓ Connected to MongoDB'));

    // Create collections with indexes
    console.log(chalk.yellow('\n📋 Creating collections and indexes...'));

    // AdminLog indexes
    await AdminLog.collection.createIndex({ adminId: 1, createdAt: -1 });
    await AdminLog.collection.createIndex({ actionType: 1, createdAt: -1 });
    await AdminLog.collection.createIndex({ targetType: 1, createdAt: -1 });
    await AdminLog.collection.createIndex({ ipAddress: 1, createdAt: -1 });
    await AdminLog.collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 15552000 }); // TTL
    console.log(chalk.green('✓ AdminLog collection ready'));

    // AdminKey indexes
    await AdminKey.collection.createIndex({ isActive: 1, expiresAt: 1 });
    await AdminKey.collection.createIndex({ keyPrefix: 1 });
    console.log(chalk.green('✓ AdminKey collection ready'));

    // SystemSettings
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = new SystemSettings({
        siteName: process.env.SITE_NAME || 'Admin Dashboard',
        siteUrl: process.env.SITE_URL || 'http://localhost',
        adminEmail: process.env.ADMIN_EMAIL || 'admin@example.com',
      });
      await settings.save();
      console.log(chalk.green('✓ SystemSettings initialized'));
    }

    // Create first admin key
    console.log(chalk.yellow('\n🔑 Creating first admin key...'));

    const existingKeys = await AdminKey.find({ isActive: true });
    if (existingKeys.length === 0) {
      const { rawKey, hashedKey, keyPrefix } = AdminKey.generateKey();

      const adminKey = new AdminKey({
        keyName: 'Primary Admin Key',
        hashedKey,
        keyPrefix,
        description: 'First admin key - created during initialization',
        permissions: [
          'view_dashboard',
          'manage_posts',
          'manage_media',
          'manage_users',
          'view_logs',
          'manage_system_settings',
          'manage_backups',
          'manage_api_integrations',
          'delete_logs',
          'export_data',
        ],
        isActive: true,
      });

      await adminKey.save();

      console.log(chalk.green('✓ Admin key created successfully!\n'));
      console.log(chalk.bold.bgYellow.black(' IMPORTANT: Save your admin key securely '));
      console.log(chalk.white.bold('\n🔐 Your Admin Key:\n'));
      console.log(chalk.green.bold(rawKey));
      console.log(chalk.white.bold('\n📝 Key Prefix:'));
      console.log(chalk.gray(keyPrefix));
      console.log(chalk.white.bold('\n💾 Usage:\n'));
      console.log(chalk.cyan('Header: x-admin-key: ' + rawKey));
      console.log(chalk.cyan('Query:  ?adminKey=' + rawKey));
      console.log(chalk.white.bold('\n⚠️  This key will not be shown again. Store it securely.\n'));
    } else {
      console.log(chalk.yellow('⚠️  Admin key already exists. Skipping creation.\n'));
    }

    // Summary
    console.log(chalk.green.bold('\n✅ Dashboard Initialization Complete!\n'));
    console.log(chalk.white.bold('📍 Dashboard URL:'));
    console.log(chalk.cyan('https://yourdomain.com/sys-admin-secure-panel\n'));
    console.log(chalk.white.bold('📚 API Base URL:'));
    console.log(chalk.cyan('https://yourdomain.com/sys-admin-secure-panel/api\n'));
    console.log(chalk.white.bold('📖 Documentation:'));
    console.log(chalk.cyan('See ADMIN_DASHBOARD_GUIDE.md for detailed API documentation\n'));

    await mongoose.disconnect();
    console.log(chalk.green('✓ Disconnected from MongoDB\n'));
  } catch (error) {
    console.error(chalk.red.bold('\n❌ Error initializing dashboard:'));
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

// Run initialization
initializeDashboard();
