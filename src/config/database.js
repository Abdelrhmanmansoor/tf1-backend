const mongoose = require('mongoose');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.connection = null;
    this.retryCount = 0;
    this.maxRetries = parseInt(process.env.MONGO_MAX_RETRIES) || 5;
    this.retryDelay = parseInt(process.env.MONGO_RETRY_DELAY) || 5000;
    this.isConnecting = false;
  }

  async connect() {
    // Prevent multiple simultaneous connection attempts
    if (this.isConnecting) {
      logger.warn('Connection attempt already in progress, waiting...');
      await this.waitForConnection();
      return this.connection;
    }

    this.isConnecting = true;

    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sportsplatform';

      logger.info('📦 Connecting to MongoDB...');

      mongoose.set('strictQuery', false);

      const options = {
        serverSelectionTimeoutMS: 30000, // Increased from 5000
        maxPoolSize: 10,
        minPoolSize: 2,
        socketTimeoutMS: 45000,
        family: 4,
        retryWrites: true,
        retryReads: true,
        maxIdleTimeMS: 30000,
        connectTimeoutMS: 30000
      };

      this.connection = await mongoose.connect(mongoUri, options);

      this.retryCount = 0; // Reset retry count on successful connection
      this.isConnecting = false;

      logger.info('✅ MongoDB Connected Successfully');
      logger.info(`   Database: ${mongoose.connection.db.databaseName}`);
      logger.info(`   Host: ${mongoose.connection.host}`);

      // Set up event listeners
      this.setupEventListeners();

      return this.connection;
    } catch (error) {
      this.isConnecting = false;
      logger.error('❌ MongoDB Connection Error:', error.message);

      // Retry logic
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        logger.warn(`⏳ Retrying connection (${this.retryCount}/${this.maxRetries}) in ${this.retryDelay / 1000}s...`);

        await this.delay(this.retryDelay);
        return this.connect(); // Recursive retry
      } else {
        logger.error(`❌ Failed to connect after ${this.maxRetries} attempts`);
        throw new Error(`MongoDB connection failed after ${this.maxRetries} attempts: ${error.message}`);
      }
    }
  }

  setupEventListeners() {
    // Connection error
    mongoose.connection.on('error', error => {
      logger.error('❌ MongoDB Connection Error:', error.message);
    });

    // Disconnected - attempt to reconnect
    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ MongoDB disconnected');

      if (this.retryCount < this.maxRetries && !this.isConnecting) {
        logger.info('🔄 Attempting to reconnect...');
        this.connect().catch(err => {
          logger.error('Failed to reconnect:', err.message);
        });
      }
    });

    // Reconnected
    mongoose.connection.on('reconnected', () => {
      logger.info('✅ MongoDB reconnected successfully');
      this.retryCount = 0; // Reset retry count
    });

    // Connection close
    mongoose.connection.on('close', () => {
      logger.warn('⚠️ MongoDB connection closed');
    });

    // SIGINT - graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('🛑 Received SIGINT, closing MongoDB connection...');
      await this.disconnect();
      process.exit(0);
    });

    // SIGTERM - graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('🛑 Received SIGTERM, closing MongoDB connection...');
      await this.disconnect();
      process.exit(0);
    });
  }

  /**
   * Wait for an ongoing connection attempt to complete
   */
  async waitForConnection() {
    const maxWait = 60000; // 60 seconds
    const checkInterval = 500; // Check every 500ms
    let waited = 0;

    while (this.isConnecting && waited < maxWait) {
      await this.delay(checkInterval);
      waited += checkInterval;
    }

    if (this.isConnecting) {
      throw new Error('Connection timeout waiting for existing connection attempt');
    }
  }

  /**
   * Delay helper for retry logic
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async disconnect() {
    if (this.connection) {
      await mongoose.disconnect();
      console.log('MongoDB disconnected');
    }
  }

  isConnected() {
    return mongoose.connection.readyState === 1;
  }
}

module.exports = new Database();
