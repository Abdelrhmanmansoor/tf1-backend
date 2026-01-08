/**
 * Caching utilities for matches system
 * Supports both Redis and in-memory caching
 * Redis is OPTIONAL - works perfectly without it
 */

const logger = require('./logger') || console;
let redis = null;
const memoryCache = new Map();

// Initialize Redis ONLY if explicitly configured
try {
  // Check if Redis is explicitly disabled
  if (process.env.NO_REDIS === 'true') {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Cache] Redis explicitly disabled via NO_REDIS=true. Using in-memory cache.');
    }
    redis = null;
  } else {
    const redisHost = process.env.REDIS_HOST;
    
    // CRITICAL: In production, NEVER attempt connection without REDIS_HOST
    // This prevents deployment failures and connection warnings
    if (!redisHost || redisHost.trim() === '') {
      // Redis not configured - silently use in-memory cache
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[Cache] Redis not configured (REDIS_HOST not set). Using in-memory cache.');
      }
      redis = null;
    } else {
      // Redis host is configured - attempt connection
      const redisClient = require('redis');
      const redisPort = process.env.REDIS_PORT || 6379;
      const redisPassword = process.env.REDIS_PASSWORD;
      const redisDb = process.env.REDIS_DB || 0;
      const hostToUse = redisHost.trim();
      
      // Build connection URL
      let redisUrl;
      if (redisPassword) {
        redisUrl = `redis://:${redisPassword}@${hostToUse}:${redisPort}/${redisDb}`;
      } else {
        redisUrl = `redis://${hostToUse}:${redisPort}/${redisDb}`;
      }
      
      const client = redisClient.createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: false, // Disable automatic reconnection completely
          connectTimeout: 2000, // Fast timeout - fail quickly
          lazyConnect: true // Don't connect immediately - connect manually
        },
        disableClientInfo: true
      });

      // Suppress ALL error events - Redis is optional
      // Don't log errors unless in development
      client.on('error', () => {
        // Silently handle - Redis is optional
        redis = null;
      });

      client.on('connect', () => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Cache] ✓ Redis connected to ${hostToUse}:${redisPort}`);
        }
        redis = client;
      });
      
      client.on('ready', () => {
        redis = client;
      });

      // Attempt connection asynchronously - don't block startup
      // Wrap in try-catch to suppress ALL errors
      (async () => {
        try {
          await client.connect();
        } catch (err) {
          // Silently fail - Redis is optional
          // NO logging - this is expected if Redis is not available
          redis = null;
          // Close client to prevent memory leaks
          try {
            await client.quit().catch(() => {});
          } catch {}
        }
      })();
    }
  }
} catch (error) {
  // Silently handle initialization errors - Redis is optional
  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[Cache] Redis initialization error: ${error.message}. Using in-memory cache.`);
  }
  redis = null;
}

/**
 * Get value from cache
 */
const get = async (key) => {
  try {
    if (redis && redis.isOpen) {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    }
    
    // Fallback to memory cache
    const cached = memoryCache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }
    
    // Remove expired entry
    if (cached) {
      memoryCache.delete(key);
    }
    
    return null;
  } catch (error) {
    // Silently fail - cache is optional
    return null;
  }
};

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds (default: 300)
 */
const set = async (key, value, ttl = 300) => {
  try {
    if (redis && redis.isOpen) {
      await redis.setEx(key, ttl, JSON.stringify(value));
    } else {
      // Fallback to memory cache
      memoryCache.set(key, {
        value,
        expiry: Date.now() + (ttl * 1000)
      });
    }
  } catch (error) {
    // Silently fail - cache is optional
  }
};

/**
 * Delete key from cache
 */
const del = async (key) => {
  try {
    if (redis && redis.isOpen) {
      await redis.del(key);
    } else {
      memoryCache.delete(key);
    }
  } catch (error) {
    // Silently fail - cache is optional
  }
};

/**
 * Delete multiple keys matching a pattern
 */
const delPattern = async (pattern) => {
  try {
    if (redis && redis.isOpen) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
      }
    } else {
      // For memory cache, iterate and delete matching keys
      for (const key of memoryCache.keys()) {
        if (key.includes(pattern.replace('*', ''))) {
          memoryCache.delete(key);
        }
      }
    }
  } catch (error) {
    // Silently fail - cache is optional
  }
};

/**
 * Clear all cache
 */
const clear = async () => {
  try {
    if (redis && redis.isOpen) {
      await redis.flushDb();
    } else {
      memoryCache.clear();
    }
  } catch (error) {
    // Silently fail - cache is optional
  }
};

/**
 * Middleware to cache GET requests
 * @param {number} ttl - Time to live in seconds
 */
const cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key from URL and query params
    const cacheKey = `cache:${req.originalUrl || req.url}`;

    try {
      const cachedData = await get(cacheKey);
      
      if (cachedData) {
        return res.status(200).json(cachedData);
      }

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode === 200) {
          set(cacheKey, data, ttl).catch(() => {
            // Silently fail - cache is optional
          });
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      // Silently fail and continue
      next();
    }
  };
};

/**
 * Invalidate cache for specific patterns
 */
const invalidateMatchCache = async (matchId) => {
  await Promise.all([
    delPattern(`cache:*/matches*`),
    delPattern(`cache:*/my-matches*`),
    del(`cache:match:${matchId}`)
  ]);
};

/**
 * Get or set cache with a function
 */
const getOrSet = async (key, fn, ttl = 300) => {
  const cached = await get(key);
  if (cached !== null) {
    return cached;
  }

  const value = await fn();
  await set(key, value, ttl);
  return value;
};

// Cleanup expired entries from memory cache every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of memoryCache.entries()) {
    if (data.expiry <= now) {
      memoryCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

module.exports = {
  get,
  set,
  del,
  delPattern,
  clear,
  cacheMiddleware,
  invalidateMatchCache,
  getOrSet
};
