/**
 * National Address API Test Script
 * This tests the Saudi National Address API integration
 */

const axios = require('axios');
require('dotenv').config();

async function testNationalAddressAPI() {
  console.log('🧪 Testing National Address API Integration\n');
  console.log('='.repeat(50));
  
  // Check environment variables
  console.log('\n📋 Environment Configuration:');
  console.log(`  API URL: ${process.env.NATIONAL_ADDRESS_API_URL || 'NOT SET'}`);
  console.log(`  API KEY: ${process.env.NATIONAL_ADDRESS_API_KEY ? '***SET***' : 'NOT SET'}`);
  console.log(`  API ID: ${process.env.NATIONAL_ADDRESS_API_ID || 'NOT SET'}`);
  
  if (!process.env.NATIONAL_ADDRESS_API_KEY) {
    console.log('\n⚠️  WARNING: NATIONAL_ADDRESS_API_KEY not configured');
    console.log('   Set this in your .env file to enable verification');
    console.log('   Get your key from: https://api.address.gov.sa');
    return;
  }

  // Test data - Example National Address
  const testAddresses = [
    {
      name: 'Test Address 1 (Valid Format)',
      buildingNumber: '7240',
      additionalNumber: '8228',
      zipCode: '12345',
      city: 'Riyadh'
    },
    {
      name: 'Test Address 2 (Another Example)',
      buildingNumber: '1234',
      additionalNumber: '5678',
      zipCode: '11564',
      city: 'Jeddah'
    }
  ];

  for (const address of testAddresses) {
    console.log(`\n\n🏠 Testing: ${address.name}`);
    console.log('  Address Details:');
    console.log(`    Building Number: ${address.buildingNumber}`);
    console.log(`    Additional Number: ${address.additionalNumber}`);
    console.log(`    Zip Code: ${address.zipCode}`);
    console.log(`    City: ${address.city}`);

    try {
      console.log('\n  📡 Sending request to API...');
      
      // Actual API call
      const response = await axios.post(
        process.env.NATIONAL_ADDRESS_API_URL || 'https://api.address.gov.sa/NationalAddress/v3.1/Address/verify',
        {
          buildingNumber: address.buildingNumber,
          additionalNumber: address.additionalNumber,
          zipCode: address.zipCode,
          city: address.city
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.NATIONAL_ADDRESS_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'api-id': process.env.NATIONAL_ADDRESS_API_ID || ''
          },
          timeout: 15000
        }
      );

      console.log('  ✅ API Response:');
      console.log(`    Status: ${response.status}`);
      console.log(`    Verified: ${response.data.verified || response.data.success || 'N/A'}`);
      console.log(`    Response Data:`, JSON.stringify(response.data, null, 2));

    } catch (error) {
      console.log('  ❌ API Error:');
      if (error.response) {
        console.log(`    Status: ${error.response.status}`);
        console.log(`    Message: ${error.response.data?.message || error.message}`);
        console.log(`    Data:`, JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        console.log('    No response received from server');
        console.log(`    Error: ${error.message}`);
      } else {
        console.log(`    Error: ${error.message}`);
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('\n📝 Notes:');
  console.log('  1. The Saudi National Address API requires registration');
  console.log('  2. Get your credentials from: https://api.address.gov.sa');
  console.log('  3. Some test addresses may not be real and will fail validation');
  console.log('  4. Use real addresses from Saudi Arabia for actual testing');
  console.log('  5. The API may have rate limits - check documentation');
  console.log('\n✅ Test Complete!\n');
}

// Run the test
testNationalAddressAPI().catch(error => {
  console.error('💥 Test failed with error:', error.message);
  process.exit(1);
});
