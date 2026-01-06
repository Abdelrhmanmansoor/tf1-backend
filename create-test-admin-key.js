#!/usr/bin/env node

/**
 * Create Test Admin Key (Offline Mode)
 * This creates a test admin key for testing without MongoDB
 */

const crypto = require('crypto');

// Simulate AdminKey.generateKey() without MongoDB
function generateAdminKey() {
  const rawKey = 'sk_admin_' + crypto.randomBytes(32).toString('hex');
  const keyPrefix = rawKey.substring(0, 8);
  const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');
  
  return { rawKey, hashedKey, keyPrefix };
}

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║                 🔐 TEST ADMIN KEY GENERATOR              ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

const { rawKey, hashedKey, keyPrefix } = generateAdminKey();

console.log('✅ TEST ADMIN KEY GENERATED:\n');
console.log('┌─ RAW KEY (Use this for testing):');
console.log(`│  ${rawKey}\n`);

console.log('┌─ KEY PREFIX:');
console.log(`│  ${keyPrefix}\n`);

console.log('┌─ HASHED KEY (Store this in DB):');
console.log(`│  ${hashedKey}\n`);

console.log('─────────────────────────────────────────────────────────');
console.log('\n📝 USAGE INSTRUCTIONS:\n');

console.log('1️⃣  Header Mode:');
console.log(`   curl -H "x-admin-key: ${rawKey}" http://localhost:4000/sys-admin-secure-panel/api/overview\n`);

console.log('2️⃣  Query Mode:');
console.log(`   curl http://localhost:4000/sys-admin-secure-panel/api/overview?adminKey=${rawKey}\n`);

console.log('3️⃣  JavaScript/Fetch:');
console.log(`   fetch('http://localhost:4000/sys-admin-secure-panel/api/overview', {
     headers: { 'x-admin-key': '${rawKey}' }
   })\n`);

console.log('─────────────────────────────────────────────────────────\n');

// Also output JSON format
console.log('📋 JSON FORMAT (for manual MongoDB insert):\n');
console.log(JSON.stringify({
  keyName: 'Test Admin Key',
  hashedKey: hashedKey,
  keyPrefix: keyPrefix,
  description: 'Test admin key for development',
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
    'export_data'
  ],
  isActive: true,
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
}, null, 2));

console.log('\n✨ Ready for testing! Use the RAW KEY above for API calls.\n');
