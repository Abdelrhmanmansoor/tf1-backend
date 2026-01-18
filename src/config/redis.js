const Redis = require('ioredis');
const logger = require('../utils/logger');

/**
 * Redis Configuration & Client
 * Used for caching, session storage, and rate limiting
 */

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  lazyConnect: false,
};

// Create Redis client
const redis = new Redis(redisConfig);

// Event handlers
redis.on('connect', () => {
  logger.info('✅ Redis client connected');
});

redis.on('ready', () => {
  logger.info('✅ Redis client ready');
});

redis.on('error', (err) => {
  logger.error('❌ Redis client error:', err);
});

redis.on('close', () => {
  logger.warn('⚠️  Redis client connection closed');
});

redis.on('reconnecting', () => {
  logger.info('🔄 Redis client reconnecting...');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing Redis client');
  await redis.quit();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing Redis client');
  await redis.quit();
});

/**
 * Helper functions for common cache operations
 */

/**
 * Get cached data with JSON parsing
 * @param {string} key
 * @returns {Promise<any>}
 */
redis.getJSON = async function (key) {
  try {
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error(`Redis getJSON error for key ${key}:`, error);
    return null;
  }
};

/**
 * Set data with JSON stringification
 * @param {string} key
 * @param {any} value
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<string>}
 */
redis.setJSON = async function (key, value, ttl = null) {
  try {
    const stringified = JSON.stringify(value);
    if (ttl) {
      return await this.setex(key, ttl, stringified);
    }
    return await this.set(key, stringified);
  } catch (error) {
    logger.error(`Redis setJSON error for key ${key}:`, error);
    throw error;
  }
};

/**
 * Delete multiple keys matching a pattern
 * @param {string} pattern - Pattern to match (e.g., "user:*")
 * @returns {Promise<number>} - Number of keys deleted
 */
redis.deletePattern = async function (pattern) {
  try {
    const keys = await this.keys(pattern);
    if (keys.length === 0) return 0;
    return await this.del(...keys);
  } catch (error) {
    logger.error(`Redis deletePattern error for pattern ${pattern}:`, error);
    throw error;
  }
};

/**
 * Cache wrapper function
 * @param {string} key
 * @param {Function} fetchFunction - Function to fetch data if not in cache
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<any>}
 */
redis.cache = async function (key, fetchFunction, ttl = 300) {
  try {
    // Try to get from cache
    const cached = await this.getJSON(key);
    if (cached !== null) {
      logger.debug(`Cache HIT for key: ${key}`);
      return { data: cached, cached: true };
    }

    // Cache miss - fetch data
    logger.debug(`Cache MISS for key: ${key}`);
    const data = await fetchFunction();

    // Save to cache
    await this.setJSON(key, data, ttl);

    return { data, cached: false };
  } catch (error) {
    logger.error(`Redis cache error for key ${key}:`, error);
    // Fallback to fetching data without cache
    const data = await fetchFunction();
    return { data, cached: false };
  }
};

/**
 * Invalidate cache by pattern
 * @param {string} pattern
 * @returns {Promise<void>}
 */
redis.invalidateCache = async function (pattern) {
  try {
    const deleted = await this.deletePattern(pattern);
    logger.info(`Invalidated ${deleted} cache keys matching pattern: ${pattern}`);
  } catch (error) {
    logger.error(`Failed to invalidate cache pattern ${pattern}:`, error);
  }
};

/**
 * Get cache stats
 * @returns {Promise<object>}
 */
redis.getStats = async function () {
  try {
    const info = await this.info('stats');
    const lines = info.split('\r\n');
    const stats = {};

    lines.forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) {
        stats[key] = value;
      }
    });

    return stats;
  } catch (error) {
    logger.error('Failed to get Redis stats:', error);
    return null;
  }
};

/**
 * Health check
 * @returns {Promise<boolean>}
 */
redis.healthCheck = async function () {
  try {
    const result = await this.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return false;
  }
};

// Export Redis client
module.exports = redis;
