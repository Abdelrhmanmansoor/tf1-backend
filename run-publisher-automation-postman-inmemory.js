const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const newman = require('newman');
const axios = require('axios');

process.env.PORT = process.env.PORT || '4010';
process.env.API_VERSION = process.env.API_VERSION || 'v1';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret-please-change';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-please-change';

async function waitForMongoReady(timeoutMs = 20000) {
  const start = Date.now();
  while (mongoose.connection.readyState !== 1) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('MongoDB connection timeout');
    }
    await new Promise(r => setTimeout(r, 100));
  }
}

async function waitForHttpReady(baseUrl, timeoutMs = 20000) {
  const start = Date.now();
  while (true) {
    try {
      const res = await axios.get(`${baseUrl}/health`, { validateStatus: () => true });
      if (res.status >= 200 && res.status < 300) return;
    } catch {}

    if (Date.now() - start > timeoutMs) {
      throw new Error('HTTP server readiness timeout');
    }
    await new Promise(r => setTimeout(r, 200));
  }
}

async function seedPublisherTestData() {
  const User = require('./src/modules/shared/models/User');
  const Subscription = require('./src/modules/subscriptions/models/Subscription');
  const NotificationTemplate = require('./src/modules/notifications/models/NotificationTemplate');
  const FeatureToggle = require('./src/modules/admin-features/models/FeatureToggle');
  const { templates } = require('./src/utils/seedData/notificationTemplates');
  const { features } = require('./src/utils/seedData/featureToggles');
  const jwtService = require('./src/utils/jwt');

  await NotificationTemplate.deleteMany({ isSystemTemplate: true });
  await NotificationTemplate.insertMany(templates, { ordered: false });

  await FeatureToggle.deleteMany({});
  await FeatureToggle.insertMany(features, { ordered: false });

  const passwordHash = await bcrypt.hash('password123', 12);

  await User.deleteMany({ email: { $in: ['publisher@example.com', 'admin@example.com'] } });

  const now = new Date();
  const insertResult = await User.collection.insertMany([
    {
      email: 'publisher@example.com',
      password: passwordHash,
      role: 'job-publisher',
      firstName: 'Publisher',
      lastName: 'Test',
      isActive: true,
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      email: 'admin@example.com',
      password: passwordHash,
      role: 'admin',
      firstName: 'Admin',
      lastName: 'Test',
      isActive: true,
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  const insertedUsers = await User.find({
    email: { $in: ['publisher@example.com', 'admin@example.com'] },
  }).lean();

  const publisherUser = insertedUsers.find(u => u.email === 'publisher@example.com');
  const adminUser = insertedUsers.find(u => u.email === 'admin@example.com');

  await Subscription.deleteMany({ publisherId: publisherUser._id });
  await Subscription.createSubscription(publisherUser._id, 'free', 'lifetime');

  const adminToken = jwtService.generateTokenPair(adminUser).accessToken;
  return { adminToken };
}

async function runNewman(baseUrl, apiVersion, adminToken) {
  return new Promise((resolve, reject) => {
    newman.run(
      {
        collection: require('./postman/Job_Publisher_Automation.postman_collection.json'),
        reporters: ['cli'],
        envVar: [
          { key: 'baseUrl', value: baseUrl },
          { key: 'apiVersion', value: apiVersion },
          { key: 'adminToken', value: adminToken },
        ],
        insecure: true,
        timeoutRequest: 20000,
      },
      (err, summary) => {
        if (err) return reject(err);
        return resolve(summary);
      }
    );
  });
}

async function main() {
  const mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri('sportsplatform_test');

  const { server } = require('./server');

  const baseUrl = `http://localhost:${process.env.PORT}`;
  const apiVersion = process.env.API_VERSION;

  await waitForMongoReady();
  const { adminToken } = await seedPublisherTestData();
  await waitForHttpReady(baseUrl);

  let exitCode = 0;
  try {
    const summary = await runNewman(baseUrl, apiVersion, adminToken);
    exitCode = summary.run.failures?.length ? 1 : 0;
  } finally {
    await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect();
    await mongo.stop();
  }

  process.exit(exitCode);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
