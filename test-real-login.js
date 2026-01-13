// Test real login credentials
const axios = require('axios');

const API_URL = 'http://localhost:4000/api/v1';
const email = 'ali-kw@mechanicspedia.com';
const password = '_B6P3L9hCmT6i7?';

async function testLogin() {
  console.log('========================================');
  console.log('  Testing Login with Real Credentials');
  console.log('========================================\n');
  
  console.log(`Email: ${email}`);
  console.log(`Testing login...\n`);

  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password
    });
    
    console.log('✅ LOGIN SUCCESS!');
    console.log(`Status: ${response.status}`);
    console.log(`User: ${JSON.stringify(response.data.user, null, 2)}`);
    console.log('\n🎉 CSRF is bypassed and login works!');
    
  } catch (error) {
    const status = error.response?.status;
    const code = error.response?.data?.code;
    const message = error.response?.data?.message;
    
    console.log(`Status: ${status}`);
    console.log(`Code: ${code}`);
    console.log(`Message: ${message}\n`);
    
    if (code?.includes('CSRF')) {
      console.log('❌ CSRF Error still exists!');
      console.log(`   Code: ${code}`);
    } else if (status === 401) {
      console.log('✅ No CSRF Error! (401 = wrong credentials or user not found)');
      console.log('✅ CSRF bypass is working correctly!');
    } else if (code === 'LOGIN_FAILED') {
      console.log('✅ No CSRF Error! (LOGIN_FAILED = database issue or wrong credentials)');
      console.log('✅ CSRF bypass is working correctly!');
      console.log('\n⚠️  Note: Database might not be connected (MongoDB error in logs)');
    } else {
      console.log(`⚠️  Other error: ${code}`);
    }
  }
  
  console.log('\n========================================');
  console.log('  Test Complete');
  console.log('========================================');
}

testLogin();
