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
const leaderDashboardRoutes = require('./src/routes/leaderDashboard');
const teamDashboardRoutes = require('./src/routes/teamDashboard');
const administrativeOfficerRoutes = require('./src/routes/administrativeOfficer');
const siteSettingsRoutes = require('./src/routes/siteSettings');
const { createSearchIndexes } = require('./src/config/searchIndexes');
const configureSocket = require('./src/config/socket');
const logger = require('./src/utils/logger');
const { sanitizeRequest } = require('./src/middleware/sanitize');
const User = require('./src/modules/shared/models/User');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const API_VERSION = process.env.API_VERSION || 'v1';

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
];

// In development, allow Replit domains dynamically
if (NODE_ENV === 'development' || process.env.REPLIT_DEV_DOMAIN) {
  allowedOrigins.push('*');
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
// Also enable if RENDER environment variable is present (Render.com deployment)
if (NODE_ENV === 'production' || process.env.RENDER) {
  app.set('trust proxy', 1);
  logger.info('Trust proxy enabled for production/cloud deployment');
}

// ==================== SECURITY MIDDLEWARE ====================
app.use(
  helmet({
    contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

// ==================== SECURITY: SANITIZE REQUESTS ====================
app.use(sanitizeRequest); // Prevent NoSQL injection

// ==================== ROOT & HEALTH CHECK ====================
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

// Leader & Team Dashboard Routes
app.use(`/api/${API_VERSION}/leader`, leaderDashboardRoutes);
app.use(`/api/${API_VERSION}/team`, teamDashboardRoutes);
app.use(
  `/api/${API_VERSION}/administrative-officer`,
  administrativeOfficerRoutes
);

// Site Settings (Leader Control Panel)
app.use(`/api/${API_VERSION}/settings`, siteSettingsRoutes);

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
