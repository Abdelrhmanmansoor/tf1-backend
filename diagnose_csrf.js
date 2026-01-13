const request = require('supertest');
const { app, server } = require('./server'); // Import the app
const http = require('http');

async function runDiagnosis() {
    console.log('🔍 Starting CSRF Diagnosis...');

    // Ensure server is closed after tests if it starts automatically
    const closeServer = () => {
        if (server && server.listening) {
            server.close();
        }
        // Force exit because database connection might keep it alive
        process.exit(0);
    };

    try {
        const agent = request.agent(app);

        // 1. Get CSRF Token
        console.log('\nTesting GET /api/v1/auth/csrf-token...');
        const resTok = await agent.get('/api/v1/auth/csrf-token');

        if (resTok.status !== 200) {
            console.error('❌ Failed to get CSRF token. Status:', resTok.status);
            return closeServer();
        }

        const csrfToken = resTok.body.token || (resTok.body.data && resTok.body.data.token);
        const setCookie = resTok.headers['set-cookie'];

        console.log(`✅ Token Endpoint Response: ${resTok.status}`);
        console.log(`ℹ️  Token received: ${csrfToken ? 'Yes' : 'No'}`);
        console.log(`ℹ️  Cookie received: ${setCookie ? 'Yes' : 'No'}`);

        if (!csrfToken || !setCookie) {
            console.error('❌ Critical: Missing Token or Cookie in response');
            console.log('Body:', resTok.body);
            return closeServer();
        }

        // Extract xsrf-token cookie for logging
        const xsrfCookie = setCookie.find(c => c.includes('XSRF-TOKEN'));
        console.log(`ℹ️  XSRF-TOKEN Cookie: ${xsrfCookie}`);

        // 2. Test Invalid Request (No Token)
        console.log('\nTesting POST /api/v1/auth/login (No Token or Cookie)...');
        // Create new agent to simulate fresh browser without cookies
        const resNoToken = await request(app).post('/api/v1/auth/login').send({ email: 'test@test.com', password: 'test' });

        if (resNoToken.status === 403 && resNoToken.body.code === 'CSRF_TOKEN_MISSING') {
            console.log('✅ Correctly rejected missing token (403)');
        } else {
            console.error(`❌ Unexpected response for missing token: ${resNoToken.status}`);
            console.log('Body:', resNoToken.body);
        }

        // 3. Test Invalid Request (Header only, No Cookie)
        console.log('\nTesting POST /api/v1/auth/login (Header only)...');
        const resHeaderOnly = await request(app)
            .post('/api/v1/auth/login')
            .set('X-CSRF-Token', csrfToken)
            .send({ email: 'test@test.com', password: 'test' });

        if (resHeaderOnly.status === 403 && resHeaderOnly.body.code === 'CSRF_TOKEN_MISSING') {
            console.log('✅ Correctly rejected missing cookie (403)');
            // Note: Middleware checks BOTH. If one is missing, it says "CSRF token missing".
        } else {
            console.error(`❌ Unexpected response for header only: ${resHeaderOnly.status}`);
            console.log('Body:', resHeaderOnly.body);
        }

        // 4. Test Valid Request (Cookie + Header)
        console.log('\nTesting POST /api/v1/auth/login (Valid CSRF)...');
        // 'agent' persists cookies from the GET request
        const resValid = await agent
            .post('/api/v1/auth/login')
            .set('X-CSRF-Token', csrfToken)
            .send({ email: 'test@test.com', password: 'test' });

        // We expect either 200 (if login success) or 400/401/404 (validation error), but NOT 403 CSRF error
        if (resValid.status !== 403) {
            console.log(`✅ CSRF Check Passed! Response Status: ${resValid.status} (Expected not 403)`);
        } else {
            console.error('❌ CSRF Check Failed despite valid tokens');
            console.log('Body:', resValid.body);
        }

    } catch (err) {
        console.error('❌ Diagnosis failed with error:', err);
    } finally {
        closeServer();
    }
}

runDiagnosis();
