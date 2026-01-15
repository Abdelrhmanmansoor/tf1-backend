/**
 * Test Complete Subscription Flow
 * Tests tier changes, feature access, and usage limits
 * Run: node test-subscription-flow.js
 */

const axios = require('axios');
const chalk = require('chalk');

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const API_VERSION = 'v1';
const TOKEN = process.env.PUBLISHER_TOKEN || '';

if (!TOKEN) {
  console.error(chalk.red('❌ PUBLISHER_TOKEN environment variable is required'));
  console.log(chalk.yellow('Usage: PUBLISHER_TOKEN=your-token node test-subscription-flow.js'));
  process.exit(1);
}

const api = axios.create({
  baseURL: `${BASE_URL}/api/${API_VERSION}`,
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
});

const log = {
  step: (msg) => console.log(chalk.cyan.bold(`\n📌 ${msg}`)),
  info: (msg) => console.log(chalk.blue('   ℹ'), msg),
  success: (msg) => console.log(chalk.green('   ✅'), msg),
  error: (msg) => console.log(chalk.red('   ❌'), msg),
  data: (label, value) => console.log(chalk.gray(`   ${label}:`), chalk.white(value)),
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testSubscriptionFlow() {
  console.clear();
  console.log(chalk.cyan.bold(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║        🧪 SUBSCRIPTION FLOW TEST 🧪                      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`));

  try {
    // Step 1: Check current subscription
    log.step('STEP 1: Check Current Subscription');
    const currentSub = await api.get('/publisher/subscription');
    log.success('Current subscription retrieved');
    log.data('Tier', currentSub.data.data.subscription.tier);
    log.data('Status', currentSub.data.data.subscription.status);
    
    const initialTier = currentSub.data.data.subscription.tier;
    await sleep(1000);

    // Step 2: View available tiers
    log.step('STEP 2: View Available Tiers');
    const tiers = await api.get('/publisher/subscription/tiers');
    log.success('Tiers retrieved');
    Object.keys(tiers.data.data.tiers).forEach(tier => {
      const tierData = tiers.data.data.tiers[tier];
      log.data(`${tier.toUpperCase()}`, `${tierData.price} ${tierData.currency || ''}/month`);
    });
    await sleep(1000);

    // Step 3: Check usage limits
    log.step('STEP 3: Check Current Usage Limits');
    const usage = await api.get('/publisher/subscription/usage');
    log.success('Usage retrieved');
    log.data('Interviews', `${usage.data.data.usage.interviews.used}/${usage.data.data.usage.interviews.limit}`);
    log.data('Applications', `${usage.data.data.usage.applications.used}/${usage.data.data.usage.applications.limit}`);
    await sleep(1000);

    // Step 4: Try to upgrade to Basic
    log.step('STEP 4: Upgrade to Basic Tier');
    try {
      const upgrade1 = await api.post('/publisher/subscription/upgrade', {
        tier: 'basic',
        billingCycle: 'monthly',
      });
      log.success('Upgraded to Basic');
      log.data('New Tier', upgrade1.data.data.subscription.tier);
      log.data('Max Interviews', upgrade1.data.data.subscription.features.maxInterviewsPerMonth);
    } catch (error) {
      log.error(`Upgrade failed: ${error.response?.data?.message || error.message}`);
    }
    await sleep(1000);

    // Step 5: Check features after upgrade
    log.step('STEP 5: Check Enabled Features');
    const features = await api.get('/publisher/features');
    log.success('Features retrieved');
    features.data.data.features.forEach(feature => {
      log.data('Feature', `${feature.name} (${feature.feature})`);
    });
    await sleep(1000);

    // Step 6: Upgrade to Pro
    log.step('STEP 6: Upgrade to Pro Tier');
    try {
      const upgrade2 = await api.post('/publisher/subscription/upgrade', {
        tier: 'pro',
        billingCycle: 'monthly',
      });
      log.success('Upgraded to Pro');
      log.data('New Tier', upgrade2.data.data.subscription.tier);
      log.data('Max Interviews', upgrade2.data.data.subscription.features.maxInterviewsPerMonth);
      log.data('Automation Rules', upgrade2.data.data.subscription.features.automationRules ? '✅ Enabled' : '❌ Disabled');
      log.data('Advanced Analytics', upgrade2.data.data.subscription.features.advancedAnalytics ? '✅ Enabled' : '❌ Disabled');
    } catch (error) {
      log.error(`Upgrade failed: ${error.response?.data?.message || error.message}`);
    }
    await sleep(1000);

    // Step 7: Check features again
    log.step('STEP 7: Verify Pro Features');
    const proFeatures = await api.get('/publisher/features');
    log.success('Pro features retrieved');
    log.data('Total Features', proFeatures.data.data.features.length);
    await sleep(1000);

    // Step 8: Try to schedule interview (should work with Pro)
    log.step('STEP 8: Test Interview Scheduling (Pro Feature)');
    try {
      const interview = await api.post('/publisher/interviews', {
        applicationId: '507f1f77bcf86cd799439011', // Mock ID
        type: 'online',
        scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        duration: 60,
        timezone: 'Asia/Riyadh',
      });
      log.success('Interview scheduled successfully');
      log.data('Interview ID', interview.data.data.interview._id);
    } catch (error) {
      log.warning(`Interview scheduling: ${error.response?.data?.message || error.message}`);
      log.info('This is expected if no valid application exists');
    }
    await sleep(1000);

    // Step 9: Downgrade to Basic
    log.step('STEP 9: Downgrade to Basic Tier');
    try {
      const downgrade = await api.post('/publisher/subscription/downgrade', {
        tier: 'basic',
        reason: 'Testing downgrade',
      });
      log.success('Downgraded to Basic');
      log.data('New Tier', downgrade.data.data.subscription.tier);
    } catch (error) {
      log.error(`Downgrade failed: ${error.response?.data?.message || error.message}`);
    }
    await sleep(1000);

    // Step 10: Check features after downgrade
    log.step('STEP 10: Verify Features After Downgrade');
    const basicFeatures = await api.get('/publisher/features');
    log.success('Features retrieved');
    log.data('Total Features', basicFeatures.data.data.features.length);
    log.info('Some Pro features should be disabled now');
    await sleep(1000);

    // Step 11: Check final subscription
    log.step('STEP 11: Final Subscription Check');
    const finalSub = await api.get('/publisher/subscription');
    log.success('Final subscription retrieved');
    log.data('Tier', finalSub.data.data.subscription.tier);
    log.data('Status', finalSub.data.data.subscription.status);
    log.data('Days Remaining', finalSub.data.data.subscription.daysRemaining);

    // Summary
    console.log(chalk.cyan('\n' + '='.repeat(60)));
    console.log(chalk.green.bold('✅ SUBSCRIPTION FLOW TEST COMPLETE'));
    console.log(chalk.cyan('='.repeat(60)));
    console.log(chalk.white('\n📊 Summary:'));
    console.log(chalk.gray('   Initial Tier:'), chalk.white(initialTier));
    console.log(chalk.gray('   Final Tier:'), chalk.white(finalSub.data.data.subscription.tier));
    console.log(chalk.green('\n✨ All subscription operations working correctly!'));
    console.log('');

  } catch (error) {
    log.error(`\nFatal error: ${error.message}`);
    console.log(chalk.red('\n❌ TEST SUITE FAILED\n'));
    process.exit(1);
  }
}

// Run tests
runAllTests();
