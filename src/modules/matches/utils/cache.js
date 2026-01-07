/**
 * Caching utilities for matches system
 * Supports both Redis and in-memory caching
 */

let redis = null;
const memoryCache = new Map();

// Try to initialize Redis if available
try {
  const redisClient = require('redis');
  const client = redisClient.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: process.env.REDIS_DB || 0
  });

  client.on('error', (err) => {
    console.warn('Redis client error:', err.message);
    redis = null;
  });

  client.on('connect', () => {
    console.log('✓ Redis cache connected');
    redis = client;
  });

  // Connect to Redis
  client.connect().catch(() => {
    console.warn('Redis not available, using in-memory cache');
    redis = null;
  });
} catch (error) {
  console.warn('Redis not installed, using in-memory cache');
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
    console.error('Cache get error:', error);
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
    console.error('Cache set error:', error);
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
    console.error('Cache delete error:', error);
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
    console.error('Cache delete pattern error:', error);
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
    console.error('Cache clear error:', error);
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
          set(cacheKey, data, ttl).catch(err => {
            console.error('Failed to cache response:', err);
          });
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
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
if (!redis) {
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of memoryCache.entries()) {
      if (data.expiry <= now) {
        memoryCache.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

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

