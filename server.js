require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const chalk = require('chalk');
const { Server } = require('socket.io');

const database = require('./src/config/database');
const routes = require('./src/routes');
const blogRoutes = require('./src/modules/blog/routes');
const adminRoutes = require('./src/routes/admin');
const administratorRoutes = require('./src/routes/administrator');
const ageGroupSupervisorRoutes = require('./src/routes/ageGroupSupervisor');
const sportsDirectorRoutes = require('./src/routes/sportsDirector');
const executiveDirectorRoutes = require('./src/routes/executiveDirector');
const secretaryRoutes = require('./src/routes/secretary');
const matchHubRoutes = require('./src/routes/matchHub');
const matchesSystemRoutes = require('./src/modules/matches/routes');
const profileRoutes = require('./src/routes/profile');
const jobsRoutes = require('./src/routes/jobs');
const sportsAdminRoutes = require('./src/routes/sportsAdmin');
const teamDashboardRoutes = require('./src/routes/teamDashboard');
const administrativeOfficerRoutes = require('./src/routes/administrativeOfficer');
const siteSettingsRoutes = require('./src/routes/siteSettings');
const locationsRoutes = require('./src/routes/locations');
const openaiWebhookRoutes = require('./src/modules/integrations/openai/webhook.routes');
const adminDashboardRoutes = require('./src/modules/admin-dashboard/routes');
const notificationRoutes = require('./src/modules/notifications/routes/notificationRoutes');
const messagingRoutes = require('./src/modules/messaging/routes/messagingRoutes');
const jobPublisherRoutes = require('./src/modules/job-publisher/routes/jobPublisherRoutes');
const clubRoutes = require('./src/modules/club/routes/club.routes');
const interviewRoutes = require('./src/modules/interviews/routes/interviewRoutes');
const automationRoutes = require('./src/modules/automation/routes/automationRoutes');
const { adminRouter: adminFeatureRoutes, publisherRouter: publisherFeatureRoutes } = require('./src/modules/admin-features/routes/featureRoutes');
const { router: subscriptionRoutes, adminRouter: adminSubscriptionRoutes } = require('./src/modules/subscriptions/routes/subscriptionRoutes');
const securityHeadersMiddleware = require('./src/middleware/securityHeaders');
const { seedRegions } = require('./src/utils/seedLocations');
const { createSearchIndexes } = require('./src/config/searchIndexes');
const configureSocket = require('./src/config/socket');
const logger = require('./src/utils/logger');
const { sanitizeRequest } = require('./src/middleware/sanitize');
const { getCSRFToken } = require('./src/middleware/csrf');
const { csrfDiagnostic, csrfTest, csrfGenerateTest } = require('./src/middleware/csrf-diagnostic');
const User = require('./src/modules/shared/models/User');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const API_VERSION = process.env.API_VERSION || 'v1';

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  'https://tf1one.com',
  'https://www.tf1one.com',
];

// In development, allow additional origins but NOT wildcard
if (NODE_ENV === 'development') {
  // Add common development origins
  if (!allowedOrigins.includes('http://localhost:5000')) allowedOrigins.push('http://localhost:5000');
  if (!allowedOrigins.includes('http://localhost:5173')) allowedOrigins.push('http://localhost:5173');
  if (!allowedOrigins.includes('http://127.0.0.1:3000')) allowedOrigins.push('http://127.0.0.1:3000');
  if (!allowedOrigins.includes('http://127.0.0.1:5000')) allowedOrigins.push('http://127.0.0.1:5000');
  
  // Add Replit domain if specified
  if (process.env.REPLIT_DEV_DOMAIN) {
    allowedOrigins.push(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  }
}

// ==================== BANNER ====================
const printBanner = () => {
  console.clear();
  console.log(
    chalk.cyan.bold(
      '\n╔═══════════════════════════════════════════════════════════╗'
    )
  );
  console.log(
    chalk.cyan.bold(
      '║                                                           ║'
    )
  );
  console.log(
    chalk.cyan.bold(
      '║              🏆 SPORTX PLATFORM API 🏆                   ║'
    )
  );
  console.log(
    chalk.cyan.bold(
      '║                                                           ║'
    )
  );
  console.log(
    chalk.cyan.bold(
      '╚═══════════════════════════════════════════════════════════╝\n'
    )
  );
};

// ==================== SOCKET.IO ====================
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const socketHelpers = configureSocket(io);
app.set('io', io);
app.set('socketHelpers', socketHelpers);
global.io = io;

// ==================== TRUST PROXY ====================
// Enable trust proxy for production (behind Render/Heroku/etc proxies)
// Also enable if RENDER or REPLIT environment variable is present
if (NODE_ENV === 'production' || process.env.RENDER || process.env.REPL_ID || process.env.REPLIT_DEV_DOMAIN) {
  app.set('trust proxy', 1);
  logger.info('Trust proxy enabled for production/cloud deployment');
}

// ==================== LOGGING MIDDLEWARE ====================
// Request ID and logging middleware (MUST BE FIRST)
const { requestLogger } = require('./src/middleware/requestLogger');
app.use(requestLogger);

// ==================== SECURITY MIDDLEWARE ====================
// Apply security headers middleware first
app.use(securityHeadersMiddleware);

app.use(
  helmet({
    contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // PRODUCTION DEBUG: Log all CORS requests
      console.log('🌐 [CORS] Request from origin:', origin || 'NO-ORIGIN');
      
      // In production, require exact origin match - NEVER allow '*' with credentials
      if (!origin) {
        if (NODE_ENV === 'development') {
          // Allow no-origin requests in development (Postman, mobile apps, etc.)
          return callback(null, true);
        }
        // In production, allow no-origin for same-origin requests (cookies will still work)
        logger.info('CORS: Request with no origin (same-origin or Postman)');
        return callback(null, true);
      }
      
      // Check if origin is in allowed list (exact match or domain suffix)
      const isAllowed = allowedOrigins.includes(origin) || 
                       origin.endsWith('tf1one.com') || 
                       origin.endsWith('.vercel.app') || // Allow Vercel preview deployments
                       (NODE_ENV === 'development');
      
      if (isAllowed) {
        console.log('✅ [CORS] Allowing origin:', origin);
        logger.debug(`CORS: Allowing origin: ${origin}`);
        callback(null, true);
      } else {
        if (NODE_ENV === 'development') {
          // Log but allow in development
          logger.warn(`CORS: Request from unlisted origin: ${origin} (allowed in dev)`);
          return callback(null, true);
        }
        // Strictly reject in production
        console.error('❌ [CORS] Blocking origin:', origin);
        logger.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // REQUIRED for cookies and CSRF tokens
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    // CRITICAL FIX: Add Cache-Control and Pragma to allowed headers
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With', 
      'x-admin-key', 
      'X-Admin-Key', 
      'Accept', 
      'X-CSRF-Token', 
      'X-XSRF-TOKEN', 
      'x-csrf-token', 
      'x-xsrf-token',
      'Cache-Control',  // Required for CSRF token fetching
      'Pragma'          // Required for CSRF token fetching
    ],
    exposedHeaders: ['Content-Type', 'Content-Length', 'X-CSRF-Token', 'X-XSRF-TOKEN', 'Set-Cookie'],
    maxAge: 86400, // Cache preflight for 24 hours
  })
);

// ==================== RATE LIMITING ====================
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => {
    return req.path === '/health' || req.path.includes('/auth/verify-email');
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: NODE_ENV === 'development' ? 50 : 10,
  message: {
    success: false,
    message:
      'Too many authentication attempts. Please try again after 15 minutes.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const notificationsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Too many notification requests. Please slow down.',
    code: 'NOTIFICATIONS_RATE_LIMIT',
  },
});

app.use('/api/', limiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/notifications', notificationsLimiter);

// ==================== STATIC FILES (UPLOADS) ====================
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadsDir));

// ==================== REQUEST LOGGING ====================
morgan.token('colored-status', (req, res) => {
  const status = res.statusCode;
  let color = chalk.green;
  if (status >= 500) color = chalk.red;
  else if (status >= 400) color = chalk.yellow;
  else if (status >= 300) color = chalk.cyan;
  return color(status);
});

morgan.token('colored-method', req => {
  const methods = {
    GET: chalk.blue,
    POST: chalk.green,
    PUT: chalk.yellow,
    DELETE: chalk.red,
    PATCH: chalk.magenta,
  };
  return (methods[req.method] || chalk.white)(req.method);
});

if (NODE_ENV === 'development') {
  app.use(
    morgan(
      ':colored-method :url :colored-status :response-time ms - :res[content-length]'
    )
  );
} else {
  app.use(
    morgan('combined', {
      stream: { write: message => logger.info(message.trim()) },
    })
  );
}

// ==================== BODY PARSING ====================
app.use(express.json({ limit: '10mb', type: ['application/json', 'application/*+json', 'text/plain'] }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

// ==================== SECURITY: SANITIZE REQUESTS ====================
app.use(sanitizeRequest); // Prevent NoSQL injection

// ==================== ROOT & HEALTH CHECK ====================
// Explicitly handle CSRF token route to avoid 404
app.get('/api/v1/auth/csrf-token', getCSRFToken);

// ==================== CSRF DIAGNOSTIC ROUTES (Development & Testing) ====================
// These routes help diagnose CSRF issues quickly
app.get('/api/v1/auth/csrf-diagnostic', csrfDiagnostic);
app.post('/api/v1/auth/csrf-test', csrfTest);
app.get('/api/v1/auth/csrf-generate-test', csrfGenerateTest);

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'SportX Platform API',
    version: API_VERSION,
    message: 'Welcome to SportX Platform API',
    documentation: `/api/${API_VERSION}`,
    health: '/health',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'SportX Platform API',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    version: API_VERSION,
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
    },
  });
});

// ==================== STATIC FILES ====================
// Serve React Frontend (Vite build)
app.use(express.static('frontend/app/dist'));

// Legacy static files
app.use(express.static('src/public'));

// Admin Dashboard Page - Multiple routes for accessibility
app.get('/admin', (req, res) => {
  res.sendFile(`${__dirname}/src/public/admin-dashboard.html`);
});

app.get('/admin-panel', (req, res) => {
  res.sendFile(`${__dirname}/src/public/admin-dashboard.html`);
});

app.get('/control', (req, res) => {
  res.sendFile(`${__dirname}/src/public/admin-dashboard.html`);
});

// ==================== API ROUTES ====================
app.use(`/api/${API_VERSION}`, routes);
app.use(`/api/${API_VERSION}/blog`, blogRoutes);
app.use(`/api/${API_VERSION}/admin`, adminRoutes);

// New Admin Roles Routes
app.use(`/api/${API_VERSION}/administrator`, administratorRoutes);
app.use(`/api/${API_VERSION}/age-group-supervisor`, ageGroupSupervisorRoutes);
app.use(`/api/${API_VERSION}/sports-director`, sportsDirectorRoutes);
app.use(`/api/${API_VERSION}/executive-director`, executiveDirectorRoutes);
app.use(`/api/${API_VERSION}/secretary`, secretaryRoutes);

// Match Hub & Profile Routes
// Old match hub (preserved for backward compatibility)
app.use(`/api/${API_VERSION}/match-hub`, matchHubRoutes);

// New isolated matches system
app.use('/matches', matchesSystemRoutes);
app.use(`/api/${API_VERSION}/matches`, matchesSystemRoutes); // Support /api/v1/matches paths

app.use(`/api/${API_VERSION}/profile`, profileRoutes);
app.use(`/api/${API_VERSION}/jobs`, jobsRoutes);
app.use(`/api/${API_VERSION}/locations`, locationsRoutes);

// Club Routes
app.use(`/api/${API_VERSION}/clubs`, clubRoutes);

// Job Publisher Routes
app.use(`/api/${API_VERSION}/job-publisher`, jobPublisherRoutes);

// Notifications Routes
app.use(`/api/${API_VERSION}/notifications`, notificationRoutes);

// Messaging Routes
app.use(`/api/${API_VERSION}/messages`, messagingRoutes);
app.use(`/api/${API_VERSION}/publisher/messages`, messagingRoutes);

// Interview Routes (Publisher)
app.use(`/api/${API_VERSION}/publisher/interviews`, interviewRoutes);

// Automation Routes (Publisher)
app.use(`/api/${API_VERSION}/publisher/automations`, automationRoutes);

// Feature Management Routes
app.use(`/api/${API_VERSION}/admin/features`, adminFeatureRoutes);
app.use(`/api/${API_VERSION}/publisher/features`, publisherFeatureRoutes);

// Subscription Management Routes
app.use(`/api/${API_VERSION}/publisher/subscription`, subscriptionRoutes);
app.use(`/api/${API_VERSION}/admin/subscriptions`, adminSubscriptionRoutes);

// Leader & Team Dashboard Routes
app.use(`/api/${API_VERSION}/sports-admin`, sportsAdminRoutes);
app.use(`/api/${API_VERSION}/team`, teamDashboardRoutes);
app.use(
  `/api/${API_VERSION}/administrative-officer`,
  administrativeOfficerRoutes
);

// Site Settings (Leader Control Panel)
app.use(`/api/${API_VERSION}/settings`, siteSettingsRoutes);

// ==================== ADMIN DASHBOARD SECURE PANEL ====================
// 🔐 System Admin Dashboard - Requires Admin Key
app.use('/sys-admin-secure-panel/api', adminDashboardRoutes);

// ==================== INTEGRATIONS WEBHOOKS ====================
app.use(`/api/${API_VERSION}/webhooks`, openaiWebhookRoutes);

// ==================== SPA FALLBACK ====================
// Serve React index.html for any route not handled by API
app.use((req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api')) {
    return next();
  }
  // Serve React index.html for all other routes (SPA fallback)
  res.sendFile(`${__dirname}/frontend/app/dist/index.html`);
});

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  logger.error(`${err.name}: ${err.message}`, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    stack: err.stack,
  });

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: NODE_ENV === 'development' ? err.name : 'Server Error',
    message,
    ...(NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.errors,
    }),
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  logger.warn(
    `404 Not Found: ${req.method} ${req.originalUrl} - IP: ${req.ip}`
  );

  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    suggestion: `Check API documentation at http://localhost:${PORT}/api/${API_VERSION}`,
    timestamp: new Date().toISOString(),
  });
});

// ==================== SERVER STARTUP ====================
const startServer = async () => {
  try {
    printBanner();

    logger.info(chalk.cyan('━'.repeat(60)));
    logger.info(chalk.cyan.bold('🚀 INITIALIZING SPORTX PLATFORM...'));
    logger.info(chalk.cyan('━'.repeat(60)));

    let dbConnected = false;
    logger.info('📦 Connecting to MongoDB...');
    try {
      await database.connect();
      logger.info(chalk.green('✅ Database connected successfully'));
      dbConnected = true;
    } catch (dbError) {
      logger.warn(
        chalk.yellow(
          '⚠️  MongoDB connection failed - Server will start without database'
        )
      );
      logger.warn(
        chalk.yellow('⚠️  Please configure MONGODB_URI environment variable')
      );
      logger.warn(
        chalk.yellow(
          '⚠️  Database-dependent features will not work until connected'
        )
      );
    }

    if (dbConnected) {
      try {
        const seedResult = await seedRegions();
        if (seedResult.success) {
          logger.info(chalk.green(`✅ Locations seed: ${seedResult.message}`));
        } else {
          logger.warn(chalk.yellow(`⚠️  Locations seed failed: ${seedResult.message}`));
        }
      } catch (seedError) {
        logger.warn(chalk.yellow('⚠️  Locations seed error'));
      }
      logger.info('🔍 Initializing search indexes...');
      const indexResult = await createSearchIndexes();
      if (indexResult.success) {
        logger.info(chalk.green('✅ Search indexes initialized'));
      } else {
        logger.warn(chalk.yellow('⚠️  Search indexes initialization failed'));
      }
    }

    server.listen(PORT, () => {
      logger.info(chalk.cyan('━'.repeat(60)));
      logger.info(chalk.green.bold('✅ SERVER RUNNING'));
      logger.info(chalk.cyan('━'.repeat(60)));

      console.log('');
      console.log(chalk.bold('  📍 Server Details:'));
      console.log(chalk.gray('  ├─') + ' Port: ' + chalk.cyan.bold(PORT));
      console.log(
        chalk.gray('  ├─') + ' Environment: ' + chalk.cyan.bold(NODE_ENV)
      );
      console.log(
        chalk.gray('  ├─') + ' API Version: ' + chalk.cyan.bold(API_VERSION)
      );
      console.log(
        chalk.gray('  └─') + ' Process ID: ' + chalk.cyan.bold(process.pid)
      );

      console.log('');
      console.log(chalk.bold('  🌐 Endpoints:'));
      console.log(
        chalk.gray('  ├─') +
        ' API Base: ' +
        chalk.blue.underline(`http://localhost:${PORT}/api/${API_VERSION}`)
      );
      console.log(
        chalk.gray('  ├─') +
        ' Health Check: ' +
        chalk.blue.underline(`http://localhost:${PORT}/health`)
      );
      console.log(
        chalk.gray('  └─') + ' Socket.io: ' + chalk.green('✓ Enabled')
      );

      console.log('');
      console.log(chalk.bold('  🎯 Available APIs:'));
      console.log(chalk.gray('  ├─') + ' Authentication & Users');
      console.log(chalk.gray('  ├─') + ' Player Management');
      console.log(chalk.gray('  ├─') + ' Coach Management');
      console.log(chalk.gray('  ├─') + ' Club Management');
      console.log(chalk.gray('  ├─') + ' Specialist Management');
      console.log(chalk.gray('  ├─') + ' Real-time Messaging');
      console.log(chalk.gray('  ├─') + ' Global Search');
      console.log(chalk.gray('  ├─') + ' Notifications');
      console.log(chalk.gray('  ├─') + ' Reviews & Ratings');
      console.log(
        chalk.gray('  └─') + ' Global Services (Upload, Location, etc.)'
      );

      console.log('');
      console.log(chalk.bold('  📊 System Status:'));
      console.log(
        chalk.gray('  ├─') +
        ' Database: ' +
        (dbConnected
          ? chalk.green('✓ Connected')
          : chalk.yellow('⚠ Not Connected'))
      );
      console.log(
        chalk.gray('  ├─') +
        ' Search Indexes: ' +
        (dbConnected ? chalk.green('✓ Ready') : chalk.yellow('⚠ Disabled'))
      );
      console.log(
        chalk.gray('  ├─') + ' Socket.io: ' + chalk.green('✓ Active')
      );
      console.log(
        chalk.gray('  └─') + ' Rate Limiting: ' + chalk.green('✓ Enabled')
      );

      console.log('');
      console.log(chalk.cyan('━'.repeat(60)));
      console.log(chalk.green.bold('  ✨ SERVER READY FOR CONNECTIONS ✨'));
      console.log(chalk.cyan('━'.repeat(60)));
      console.log('');

      logger.info('Press CTRL+C to stop the server');
    });
  } catch (error) {
    logger.error(chalk.red('❌ Failed to start server:'), error);
    process.exit(1);
  }
};

// ==================== GRACEFUL SHUTDOWN ====================
const gracefulShutdown = async signal => {
  logger.info(
    chalk.yellow(`\n${signal} received. Initiating graceful shutdown...`)
  );

  server.close(async () => {
    logger.info('🔌 HTTP server closed');

    try {
      await database.disconnect();
      logger.info('📦 Database disconnected');
      logger.info(chalk.green('✅ Graceful shutdown complete'));
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', error => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// ==================== START SERVER ====================
startServer();

module.exports = { app, server };
