const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// Ensure secrets exist for token helpers that might be loaded
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

const { csrf, verifyCsrf } = require('../middleware/csrf');

const buildCsrfApp = () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.get('/csrf', csrf, (req, res) => {
    res.status(200).json({ token: req.csrfToken });
  });

  app.post('/protected', verifyCsrf, (req, res) => {
    res.status(200).json({ ok: true });
  });

  return app;
};

const buildRateLimitedApp = () => {
  const app = express();
  app.use(
    rateLimit({
      windowMs: 50,
      max: 1,
      standardHeaders: false,
      legacyHeaders: false,
    })
  );
  app.get('/ping', (req, res) => res.json({ ok: true }));
  return app;
};

describe('CSRF middleware', () => {
  it('rejects POST without CSRF token', async () => {
    const app = buildCsrfApp();
    const res = await request(app).post('/protected').send({ hello: 'world' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CSRF_TOKEN_MISSING');
  });

  it('accepts POST with valid CSRF token and rotates a new one', async () => {
    const app = buildCsrfApp();

    const tokenResp = await request(app).get('/csrf');
    const token = tokenResp.body.token || tokenResp.headers['x-csrf-token'];
    const cookies = tokenResp.headers['set-cookie'];

    const res = await request(app)
      .post('/protected')
      .set('Cookie', cookies)
      .set('x-csrf-token', token)
      .send({ hello: 'world' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.headers['x-csrf-token']).toBeDefined();
  });
});

describe('Rate limiter', () => {
  it('blocks after exceeding the limit', async () => {
    const app = buildRateLimitedApp();

    const first = await request(app).get('/ping');
    expect(first.status).toBe(200);

    const second = await request(app).get('/ping');
    expect(second.status).toBe(429);
  });
});
