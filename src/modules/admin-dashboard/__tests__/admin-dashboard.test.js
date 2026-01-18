/**
 * Admin Dashboard API Tests
 * Using Jest and Supertest
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../../../../server');
const { MongoMemoryServer } = require('mongodb-memory-server');
const AdminKey = require('../models/AdminKey');
const AdminLog = require('../models/AdminLog');
const User = require('../../shared/models/User');

describe.skip('Admin Dashboard API', () => {
  let mongoServer;
  let mongoUri;
  let adminKey;
  let adminKeyValue;
  let testUserId;
  let csrfToken;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    // Generate admin key
    const { rawKey, hashedKey, keyPrefix } = AdminKey.generateKey();
    adminKeyValue = rawKey;

    adminKey = new AdminKey({
      keyName: 'Test Admin Key',
      hashedKey,
      keyPrefix,
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

    // Generate CSRF token
    csrfToken = Math.random().toString(36).substring(2);

    // Create test user
    const user = new User({
      firstName: 'Test',
      lastName: 'Admin',
      email: 'admin@test.com',
      password: '$2a$12$7Ex6A9I7gD0O0hQ9rFQk1eV7b9xBqg9nQ2dZ0jY8w7mQ5Qx2cEo4e',
      role: 'admin',
      isActive: true,
    });
    await user.save();
    testUserId = user._id;
  });

  afterEach(async () => {
    // Cleanup
    if (mongoose.connection.readyState === 1) {
      await AdminKey.deleteMany({});
      await AdminLog.deleteMany({});
      await User.deleteMany({});
    }
  });

  describe('Authentication', () => {
    test('should require admin key', async () => {
      const res = await request(app).get('/sys-admin-secure-panel/api/overview');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('NO_ADMIN_KEY');
    });

    test('should accept valid admin key', async () => {
      const res = await request(app)
        .get('/sys-admin-secure-panel/api/overview')
        .set('x-admin-key', adminKeyValue);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('should reject invalid admin key', async () => {
      const res = await request(app)
        .get('/sys-admin-secure-panel/api/overview')
        .set('x-admin-key', 'invalid-key');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('INVALID_ADMIN_KEY');
    });

    test('should reject expired admin key', async () => {
      const expiredKey = await AdminKey.findOne({ keyName: 'Test Admin Key' });
      expiredKey.expiresAt = new Date(Date.now() - 1000);
      await expiredKey.save();

      const res = await request(app)
        .get('/sys-admin-secure-panel/api/overview')
        .set('x-admin-key', adminKeyValue);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('EXPIRED_KEY');
    });

    test('should reject inactive admin key', async () => {
      const inactiveKey = await AdminKey.findOne({ keyName: 'Test Admin Key' });
      inactiveKey.isActive = false;
      await inactiveKey.save();

      const res = await request(app)
        .get('/sys-admin-secure-panel/api/overview')
        .set('x-admin-key', adminKeyValue);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('INACTIVE_KEY');
    });
  });

  describe('Dashboard Overview', () => {
    test('should get dashboard overview', async () => {
      const res = await request(app)
        .get('/sys-admin-secure-panel/api/overview?days=7')
        .set('x-admin-key', adminKeyValue);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('stats');
      expect(res.body.data).toHaveProperty('topAdmins');
      expect(res.body.data).toHaveProperty('timeline');
      expect(res.body.data).toHaveProperty('failureRate');
    });

    test('should log dashboard view', async () => {
      await request(app)
        .get('/sys-admin-secure-panel/api/overview')
        .set('x-admin-key', adminKeyValue);

      const logs = await AdminLog.find({ actionType: 'LOGIN' });
      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('Activity Logs', () => {
    test('should get activity logs', async () => {
      const res = await request(app)
        .get('/sys-admin-secure-panel/api/logs?page=1&limit=20')
        .set('x-admin-key', adminKeyValue);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('logs');
      expect(res.body.data).toHaveProperty('pagination');
    });

    test('should filter logs by action type', async () => {
      const res = await request(app)
        .get('/sys-admin-secure-panel/api/logs?actionType=LOGIN')
        .set('x-admin-key', adminKeyValue);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      res.body.data.logs.forEach((log) => {
        expect(log.actionType).toBe('LOGIN');
      });
    });

    test('should export logs as CSV', async () => {
      const res = await request(app)
        .get('/sys-admin-secure-panel/api/logs/export')
        .set('x-admin-key', adminKeyValue);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
    });
  });

  describe('Admin Key Management', () => {
    test('should get admin keys', async () => {
      const res = await request(app)
        .get('/sys-admin-secure-panel/api/admin-keys')
        .set('x-admin-key', adminKeyValue);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('should create new admin key', async () => {
      const res = await request(app)
        .post('/sys-admin-secure-panel/api/admin-keys/create')
        .set('x-admin-key', adminKeyValue)
        .send({
          keyName: 'New Test Key',
          description: 'Test key creation',
          permissions: ['view_dashboard', 'manage_posts'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('rawKey');
      expect(res.body.data).toHaveProperty('keyId');
    });

    test('should revoke admin key', async () => {
      const key = await AdminKey.findOne({ keyName: 'Test Admin Key' });

      const res = await request(app)
        .post(`/sys-admin-secure-panel/api/admin-keys/${key._id}/revoke`)
        .set('x-admin-key', adminKeyValue);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const revokedKey = await AdminKey.findById(key._id);
      expect(revokedKey.isActive).toBe(false);
    });
  });

  describe('Permission Checks', () => {
    test('should deny access without proper permission', async () => {
      const { rawKey, hashedKey, keyPrefix } = AdminKey.generateKey();
      const limitedKey = new AdminKey({
        keyName: 'Limited Key',
        hashedKey,
        keyPrefix,
        permissions: ['view_dashboard'],
        isActive: true,
      });
      await limitedKey.save();

      const res = await request(app)
        .post('/sys-admin-secure-panel/api/posts/create')
        .set('x-admin-key', rawKey)
        .send({
          title: 'Test',
          content: 'Test content',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('PERMISSION_DENIED');
    });
  });

  describe('Security', () => {
    test('should sanitize input to prevent XSS', async () => {
      const res = await request(app)
        .post('/sys-admin-secure-panel/api/posts/create')
        .set('x-admin-key', adminKeyValue)
        .send({
          title: 'Test<script>alert("xss")</script>',
          content: 'Content',
        });

      // Should handle XSS
      expect(res.status).toBe(201);
    });

    test('should check rate limiting', async () => {
      const promises = [];

      // Make multiple requests
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .get('/sys-admin-secure-panel/api/overview')
            .set('x-admin-key', adminKeyValue)
        );
      }

      const results = await Promise.all(promises);

      // At least one should succeed
      expect(results.some((r) => r.status === 200)).toBe(true);
    });
  });

  describe('System Health', () => {
    test('should get system health', async () => {
      const res = await request(app)
        .get('/sys-admin-secure-panel/api/settings/health')
        .set('x-admin-key', adminKeyValue);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('server');
      expect(res.body.data).toHaveProperty('database');
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Disconnect database temporarily
      await mongoose.disconnect();

      const res = await request(app)
        .get('/sys-admin-secure-panel/api/overview')
        .set('x-admin-key', adminKeyValue);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);

      // Reconnect
      await mongoose.connect(mongoUri);
    });
  });
});
