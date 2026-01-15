/**
 * Automated Testing Script for Job Publisher Automation System
 * Run: node test-automation-system.js
 */

const axios = require('axios');
const chalk = require('chalk');

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const API_VERSION = 'v1';

let publisherToken = '';
let adminToken = '';
let testData = {
  applicationId: null,
  interviewId: null,
  threadId: null,
  ruleId: null,
  featureId: null,
  publisherId: null,
};

// Utility functions
const log = {
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  success: (msg) => console.log(chalk.green('✅'), msg),
  error: (msg) => console.log(chalk.red('❌'), msg),
  warning: (msg) => console.log(chalk.yellow('⚠️'), msg),
  test: (msg) => console.log(chalk.cyan('🧪'), msg),
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function makeRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}/api/${API_VERSION}${endpoint}`,
      headers: {},
    };

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      config.headers['Content-Type'] = 'application/json';
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      status: error.response?.status,
    };
  }
}

// Test functions
async function testHealthCheck() {
  log.test('Testing Health Check...');
  const result = await makeRequest('GET', '/../health');
  
  if (result.success && result.data.status === 'OK') {
    log.success('Health check passed');
    return true;
  } else {
    log.error('Health check failed');
    return false;
  }
}

async function testSubscriptionTiers() {
  log.test('Testing GET /subscription/tiers...');
  const result = await makeRequest('GET', '/publisher/subscription/tiers');
  
  if (result.success && result.data.data.tiers) {
    log.success(`Found ${Object.keys(result.data.data.tiers).length} tiers`);
    return true;
  } else {
    log.error('Failed to get tiers');
    return false;
  }
}

async function testGetMySubscription() {
  log.test('Testing GET /publisher/subscription...');
  const result = await makeRequest('GET', '/publisher/subscription', null, publisherToken);
  
  if (result.success && result.data.data.subscription) {
    log.success(`Current tier: ${result.data.data.subscription.tier}`);
    return true;
  } else {
    log.error('Failed to get subscription');
    return false;
  }
}

async function testUpgradeSubscription() {
  log.test('Testing POST /publisher/subscription/upgrade...');
  const result = await makeRequest(
    'POST',
    '/publisher/subscription/upgrade',
    {
      tier: 'pro',
      billingCycle: 'monthly',
    },
    publisherToken
  );
  
  if (result.success) {
    log.success('Subscription upgraded to Pro');
    return true;
  } else {
    log.error(`Failed to upgrade: ${result.error}`);
    return false;
  }
}

async function testScheduleInterview() {
  log.test('Testing POST /publisher/interviews...');
  
  // This will fail if no application exists, which is expected
  const result = await makeRequest(
    'POST',
    '/publisher/interviews',
    {
      applicationId: '507f1f77bcf86cd799439011', // Mock ID
      type: 'online',
      scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 60,
      timezone: 'Asia/Riyadh',
      meetingPlatform: 'internal',
    },
    publisherToken
  );
  
  if (result.success) {
    testData.interviewId = result.data.data.interview._id;
    testData.threadId = result.data.data.thread._id;
    log.success('Interview scheduled successfully');
    return true;
  } else {
    log.warning(`Interview scheduling failed (expected if no application): ${result.error}`);
    return false;
  }
}

async function testGetInterviews() {
  log.test('Testing GET /publisher/interviews...');
  const result = await makeRequest('GET', '/publisher/interviews', null, publisherToken);
  
  if (result.success) {
    log.success(`Found ${result.data.data.interviews?.length || 0} interviews`);
    return true;
  } else {
    log.error(`Failed: ${result.error}`);
    return false;
  }
}

async function testGetThreads() {
  log.test('Testing GET /publisher/messages/threads...');
  const result = await makeRequest('GET', '/publisher/messages/threads', null, publisherToken);
  
  if (result.success) {
    log.success(`Found ${result.data.data.threads?.length || 0} threads`);
    return true;
  } else {
    log.error(`Failed: ${result.error}`);
    return false;
  }
}

async function testCreateAutomationRule() {
  log.test('Testing POST /publisher/automations...');
  const result = await makeRequest(
    'POST',
    '/publisher/automations',
    {
      name: 'Test Automation Rule',
      nameAr: 'قاعدة أتمتة تجريبية',
      trigger: {
        event: 'APPLICATION_STAGE_CHANGED',
        conditions: [
          {
            field: 'newStatus',
            operator: 'equals',
            value: 'shortlisted',
          },
        ],
      },
      actions: [
        {
          type: 'SEND_NOTIFICATION',
          order: 0,
          enabled: true,
          config: {
            templateKey: 'application_stage_changed',
            priority: 'high',
          },
        },
      ],
      isActive: true,
    },
    publisherToken
  );
  
  if (result.success) {
    testData.ruleId = result.data.data.rule._id;
    log.success('Automation rule created successfully');
    return true;
  } else {
    log.error(`Failed: ${result.error}`);
    return false;
  }
}

async function testGetAutomations() {
  log.test('Testing GET /publisher/automations...');
  const result = await makeRequest('GET', '/publisher/automations', null, publisherToken);
  
  if (result.success) {
    log.success(`Found ${result.data.data.rules?.length || 0} automation rules`);
    return true;
  } else {
    log.error(`Failed: ${result.error}`);
    return false;
  }
}

async function testToggleAutomation() {
  if (!testData.ruleId) {
    log.warning('No rule ID available for toggle test');
    return false;
  }

  log.test('Testing POST /publisher/automations/:id/toggle...');
  const result = await makeRequest(
    'POST',
    `/publisher/automations/${testData.ruleId}/toggle`,
    null,
    publisherToken
  );
  
  if (result.success) {
    log.success('Automation rule toggled successfully');
    return true;
  } else {
    log.error(`Failed: ${result.error}`);
    return false;
  }
}

async function testGetPublisherFeatures() {
  log.test('Testing GET /publisher/features...');
  const result = await makeRequest('GET', '/publisher/features', null, publisherToken);
  
  if (result.success) {
    log.success(`Found ${result.data.data.features?.length || 0} enabled features`);
    return true;
  } else {
    log.error(`Failed: ${result.error}`);
    return false;
  }
}

async function testGetUsage() {
  log.test('Testing GET /publisher/subscription/usage...');
  const result = await makeRequest('GET', '/publisher/subscription/usage', null, publisherToken);
  
  if (result.success) {
    const usage = result.data.data.usage;
    log.success(`Interviews used: ${usage.interviews.used}/${usage.interviews.limit}`);
    log.success(`Applications used: ${usage.applications.used}/${usage.applications.limit}`);
    return true;
  } else {
    log.error(`Failed: ${result.error}`);
    return false;
  }
}

async function testAutomationStatistics() {
  log.test('Testing GET /publisher/automations/statistics...');
  const result = await makeRequest('GET', '/publisher/automations/statistics', null, publisherToken);
  
  if (result.success) {
    const stats = result.data.data.statistics;
    log.success(`Total rules: ${stats.totalRules}, Active: ${stats.activeRules}`);
    return true;
  } else {
    log.error(`Failed: ${result.error}`);
    return false;
  }
}

async function testUnreadCount() {
  log.test('Testing GET /publisher/messages/unread-count...');
  const result = await makeRequest('GET', '/publisher/messages/unread-count', null, publisherToken);
  
  if (result.success) {
    log.success(`Unread messages: ${result.data.data.unreadCount}`);
    return true;
  } else {
    log.error(`Failed: ${result.error}`);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log(chalk.cyan('\n' + '='.repeat(60)));
  console.log(chalk.cyan.bold('🚀 JOB PUBLISHER AUTOMATION SYSTEM - AUTOMATED TESTS'));
  console.log(chalk.cyan('='.repeat(60) + '\n'));

  log.info('Starting automated tests...\n');

  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Subscription Tiers', fn: testSubscriptionTiers },
  ];

  // Check if we have tokens
  if (!publisherToken) {
    log.warning('No publisher token provided. Set PUBLISHER_TOKEN env variable.');
    log.info('Skipping authenticated tests.\n');
  } else {
    tests.push(
      { name: 'Get My Subscription', fn: testGetMySubscription },
      { name: 'Upgrade Subscription', fn: testUpgradeSubscription },
      { name: 'Get Usage', fn: testGetUsage },
      { name: 'Schedule Interview', fn: testScheduleInterview },
      { name: 'Get Interviews', fn: testGetInterviews },
      { name: 'Get Message Threads', fn: testGetThreads },
      { name: 'Get Unread Count', fn: testUnreadCount },
      { name: 'Create Automation Rule', fn: testCreateAutomationRule },
      { name: 'Get Automations', fn: testGetAutomations },
      { name: 'Toggle Automation', fn: testToggleAutomation },
      { name: 'Automation Statistics', fn: testAutomationStatistics },
      { name: 'Get Publisher Features', fn: testGetPublisherFeatures }
    );
  }

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const test of tests) {
    try {
      log.info(`\nRunning: ${test.name}...`);
      const result = await test.fn();
      
      if (result) {
        passed++;
      } else {
        failed++;
      }

      await delay(500); // Small delay between tests
    } catch (error) {
      log.error(`Test '${test.name}' threw error: ${error.message}`);
      failed++;
    }
  }

  // Print summary
  console.log(chalk.cyan('\n' + '='.repeat(60)));
  console.log(chalk.cyan.bold('📊 TEST SUMMARY'));
  console.log(chalk.cyan('='.repeat(60)));
  
  console.log(chalk.green(`✅ Passed: ${passed}`));
  console.log(chalk.red(`❌ Failed: ${failed}`));
  
  const total = passed + failed;
  const percentage = total > 0 ? ((passed / total) * 100).toFixed(2) : 0;
  
  console.log(chalk.cyan(`\n📈 Success Rate: ${percentage}%`));
  
  if (percentage >= 80) {
    console.log(chalk.green.bold('\n🎉 TESTS PASSED! System is working well!'));
  } else if (percentage >= 50) {
    console.log(chalk.yellow.bold('\n⚠️  SOME TESTS FAILED. Review the errors above.'));
  } else {
    console.log(chalk.red.bold('\n❌ MANY TESTS FAILED. System needs attention.'));
  }
  
  console.log(chalk.cyan('='.repeat(60) + '\n'));

  // Cleanup
  if (testData.ruleId && publisherToken) {
    log.info('Cleaning up test data...');
    await makeRequest('DELETE', `/publisher/automations/${testData.ruleId}`, null, publisherToken);
    log.success('Test data cleaned up');
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Read tokens from environment or command line
publisherToken = process.env.PUBLISHER_TOKEN || process.argv[2] || '';
adminToken = process.env.ADMIN_TOKEN || process.argv[3] || '';

// Banner
console.clear();
console.log(chalk.cyan.bold(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     🧪 AUTOMATION SYSTEM - AUTOMATED TESTING 🧪          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`));

console.log(chalk.gray('Base URL:'), chalk.white(BASE_URL));
console.log(chalk.gray('API Version:'), chalk.white(API_VERSION));
console.log(chalk.gray('Publisher Token:'), publisherToken ? chalk.green('✓ Set') : chalk.red('✗ Not Set'));
console.log(chalk.gray('Admin Token:'), adminToken ? chalk.green('✓ Set') : chalk.red('✗ Not Set'));
console.log('');

// Run tests
runAllTests().catch(error => {
  log.error('Fatal error in test suite:', error);
  process.exit(1);
});
