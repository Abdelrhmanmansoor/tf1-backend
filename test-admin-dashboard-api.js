/**
 * Admin Dashboard API Tests
 * Complete Test Suite for Development
 */

const http = require('http');

// Test Admin Key
const TEST_ADMIN_KEY = 'sk_admin_2a2097d2dbf949c50e3a5f2eaa231e81c4f5d2fb1128443165a6198201b758eb';

// Helper function to make HTTP requests
function makeRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          parsed: (() => {
            try {
              return JSON.parse(data);
            } catch {
              return data;
            }
          })()
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Run tests
async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║            🧪 ADMIN DASHBOARD API TESTS 🧪                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  let passed = 0;
  let failed = 0;

  // Test 1: No Admin Key
  console.log('📋 TEST 1: Access without Admin Key (should return 401)');
  try {
    const response = await makeRequest('GET', '/sys-admin-secure-panel/api/overview');
    if (response.statusCode === 401 && response.parsed.error === 'NO_ADMIN_KEY') {
      console.log('  ✅ PASSED: Got 401 with NO_ADMIN_KEY error\n');
      passed++;
    } else {
      console.log('  ❌ FAILED: Expected 401, got ' + response.statusCode + '\n');
      failed++;
    }
  } catch (error) {
    console.log('  ❌ ERROR: ' + error.message + '\n');
    failed++;
  }

  // Test 2: Invalid Admin Key
  console.log('📋 TEST 2: Access with invalid Admin Key (should return 401)');
  try {
    const response = await makeRequest('GET', '/sys-admin-secure-panel/api/overview', {
      'x-admin-key': 'invalid_key_12345'
    });
    if (response.statusCode === 401 && response.parsed.error === 'INVALID_ADMIN_KEY') {
      console.log('  ✅ PASSED: Got 401 with INVALID_ADMIN_KEY error\n');
      passed++;
    } else {
      console.log('  ❌ FAILED: Expected 401, got ' + response.statusCode + '\n');
      failed++;
    }
  } catch (error) {
    console.log('  ❌ ERROR: ' + error.message + '\n');
    failed++;
  }

  // Test 3: Valid Admin Key - Overview
  console.log('📋 TEST 3: Access Overview with valid Admin Key (should return 200)');
  try {
    const response = await makeRequest('GET', '/sys-admin-secure-panel/api/overview', {
      'x-admin-key': TEST_ADMIN_KEY
    });
    if (response.statusCode === 200 && response.parsed.success === true) {
      console.log('  ✅ PASSED: Got 200 with valid response');
      console.log('     Data:', JSON.stringify(response.parsed.data, null, 2).split('\n').slice(0, 5).join('\n'));
      console.log('');
      passed++;
    } else {
      console.log('  ❌ FAILED: Expected 200, got ' + response.statusCode + '\n');
      failed++;
    }
  } catch (error) {
    console.log('  ❌ ERROR: ' + error.message + '\n');
    failed++;
  }

  // Test 4: Valid Admin Key - Activity Logs
  console.log('📋 TEST 4: Access Activity Logs with valid Admin Key (should return 200)');
  try {
    const response = await makeRequest('GET', '/sys-admin-secure-panel/api/logs', {
      'x-admin-key': TEST_ADMIN_KEY
    });
    if (response.statusCode === 200 && response.parsed.success === true) {
      console.log('  ✅ PASSED: Got 200 with valid logs response\n');
      passed++;
    } else {
      console.log('  ❌ FAILED: Expected 200, got ' + response.statusCode + '\n');
      failed++;
    }
  } catch (error) {
    console.log('  ❌ ERROR: ' + error.message + '\n');
    failed++;
  }

  // Test 5: Valid Admin Key - Admin Keys List
  console.log('📋 TEST 5: Access Admin Keys with valid Admin Key (should return 200)');
  try {
    const response = await makeRequest('GET', '/sys-admin-secure-panel/api/admin-keys', {
      'x-admin-key': TEST_ADMIN_KEY
    });
    if (response.statusCode === 200 && response.parsed.success === true) {
      console.log('  ✅ PASSED: Got 200 with valid admin keys response\n');
      passed++;
    } else {
      console.log('  ❌ FAILED: Expected 200, got ' + response.statusCode + '\n');
      failed++;
    }
  } catch (error) {
    console.log('  ❌ ERROR: ' + error.message + '\n');
    failed++;
  }

  // Test 6: Valid Admin Key - Users
  console.log('📋 TEST 6: Access Users with valid Admin Key (should return 200)');
  try {
    const response = await makeRequest('GET', '/sys-admin-secure-panel/api/users', {
      'x-admin-key': TEST_ADMIN_KEY
    });
    if (response.statusCode === 200 && response.parsed.success === true) {
      console.log('  ✅ PASSED: Got 200 with valid users response\n');
      passed++;
    } else {
      console.log('  ❌ FAILED: Expected 200, got ' + response.statusCode + '\n');
      failed++;
    }
  } catch (error) {
    console.log('  ❌ ERROR: ' + error.message + '\n');
    failed++;
  }

  // Test 7: Valid Admin Key - Settings
  console.log('📋 TEST 7: Access Settings with valid Admin Key (should return 200)');
  try {
    const response = await makeRequest('GET', '/sys-admin-secure-panel/api/settings', {
      'x-admin-key': TEST_ADMIN_KEY
    });
    if (response.statusCode === 200 && response.parsed.success === true) {
      console.log('  ✅ PASSED: Got 200 with valid settings response\n');
      passed++;
    } else {
      console.log('  ❌ FAILED: Expected 200, got ' + response.statusCode + '\n');
      failed++;
    }
  } catch (error) {
    console.log('  ❌ ERROR: ' + error.message + '\n');
    failed++;
  }

  // Test 8: Admin Key via Query Parameter
  console.log('📋 TEST 8: Access via Query Parameter (should return 200)');
  try {
    const response = await makeRequest('GET', '/sys-admin-secure-panel/api/overview?adminKey=' + TEST_ADMIN_KEY);
    if (response.statusCode === 200 && response.parsed.success === true) {
      console.log('  ✅ PASSED: Got 200 with Admin Key in query param\n');
      passed++;
    } else {
      console.log('  ❌ FAILED: Expected 200, got ' + response.statusCode + '\n');
      failed++;
    }
  } catch (error) {
    console.log('  ❌ ERROR: ' + error.message + '\n');
    failed++;
  }

  // Summary
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                      📊 TEST SUMMARY 📊                     ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  ✅ PASSED: ${passed}                                                     ║`);
  console.log(`║  ❌ FAILED: ${failed}                                                     ║`);
  console.log(`║  📈 SUCCESS RATE: ${Math.round((passed / (passed + failed)) * 100)}%                                        ║`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Report
  console.log('🔑 TEST ADMIN KEY:');
  console.log(`   ${TEST_ADMIN_KEY}\n`);

  console.log('📍 API Base URL:');
  console.log('   http://localhost:4000/sys-admin-secure-panel/api\n');

  console.log('📚 Available Endpoints:');
  console.log('   - GET /overview - Dashboard overview stats');
  console.log('   - GET /logs - Activity logs');
  console.log('   - GET /admin-keys - Admin keys list');
  console.log('   - GET /users - Users list');
  console.log('   - GET /settings - System settings');
  console.log('   - GET /posts - Posts/articles');
  console.log('   - GET /media - Media files');
  console.log('   - GET /backups - Backup files\n');

  process.exit(passed === 8 ? 0 : 1);
}

// Run tests after a delay to ensure server is ready
setTimeout(runTests, 2000);
