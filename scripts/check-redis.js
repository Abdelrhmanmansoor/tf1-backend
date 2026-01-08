const redis = require('redis');
require('dotenv').config();

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT || 6379;
const redisPassword = process.env.REDIS_PASSWORD;
const redisDb = process.env.REDIS_DB || 0;

console.log('🔍 Testing Redis Connection...');
console.log(`Configuration:
  Host: ${redisHost}
  Port: ${redisPort}
  Database: ${redisDb}
  Password: ${redisPassword ? '******' : 'None'}
`);

let redisUrl;
if (redisPassword) {
  redisUrl = `redis://:${redisPassword}@${redisHost}:${redisPort}/${redisDb}`;
} else {
  redisUrl = `redis://${redisHost}:${redisPort}/${redisDb}`;
}

const client = redis.createClient({
  url: redisUrl
});

client.on('error', (err) => {
  console.error('❌ Redis Connection Error:', err.message);
  process.exit(1);
});

client.on('connect', () => {
  console.log('✅ Redis Connected Successfully!');
});

client.on('ready', async () => {
  console.log('✅ Redis Client Ready!');
  
  try {
    console.log('📝 Testing Set/Get...');
    await client.set('test_key', 'Hello Redis');
    const value = await client.get('test_key');
    console.log(`✅ Retrieved value: ${value}`);
    
    await client.del('test_key');
    console.log('✅ Cleanup successful');
    
    console.log('\n🎉 Redis service is fully operational!');
    await client.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Operation Failed:', err.message);
    await client.disconnect();
    process.exit(1);
  }
});

client.connect().catch(err => {
  console.error('❌ Failed to initiate connection:', err.message);
  process.exit(1);
});
