/**
 * Performance Optimization Middleware
 * Response compression, caching headers, query optimization
 */

const cache = require('../utils/cache');

/**
 * Add caching headers
 */
const addCachingHeaders = (seconds = 300) => {
  return (req, res, next) => {
    if (req.method === 'GET') {
      res.set('Cache-Control', `public, max-age=${seconds}`);
      res.set('ETag', `"${Date.now()}"`);
    }
    next();
  };
};

/**
 * Response compression middleware
 */
const compressResponse = () => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function(data) {
      // Remove null/undefined values
      const cleaned = JSON.parse(JSON.stringify(data, (k, v) => v === null || v === undefined ? undefined : v));
      return originalJson(cleaned);
    };

    next();
  };
};

/**
 * Smart pagination middleware
 */
const smartPagination = (defaultLimit = 20, maxLimit = 100) => {
  return (req, res, next) => {
    // Parse and validate pagination params
    req.pagination = {
      limit: Math.min(Math.max(parseInt(req.query.limit) || defaultLimit, 1), maxLimit),
      page: Math.max(parseInt(req.query.page) || 1, 1)
    };

    req.pagination.skip = (req.pagination.page - 1) * req.pagination.limit;

    next();
  };
};

/**
 * Query optimizer - add lean() and select optimizations
 */
const optimizeQuery = (req, res, next) => {
  // Store hints for query optimization
  req.queryHints = {
    useLean: true,
    selectFields: req.query.fields?.split(',') || null,
    populateMinimal: true
  };

  next();
};

/**
 * Request deduplication - prevent duplicate requests
 */
const deduplicateRequests = () => {
  const pendingRequests = new Map();

  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const requestKey = `${req.method}:${req.originalUrl}:${req.matchUser?._id || 'anon'}`;

    // Check if same request is pending
    if (pendingRequests.has(requestKey)) {
      const pending = pendingRequests.get(requestKey);
      
      // Wait for the pending request to complete
      try {
        const result = await pending;
        return res.status(200).json(result);
      } catch (error) {
        return next(error);
      }
    }

    // Create promise for this request
    const requestPromise = new Promise((resolve, reject) => {
      const originalJson = res.json.bind(res);
      
      res.json = function(data) {
        pendingRequests.delete(requestKey);
        resolve(data);
        return originalJson(data);
      };

      // Cleanup on error
      res.on('finish', () => {
        pendingRequests.delete(requestKey);
      });

      next();
    });

    pendingRequests.set(requestKey, requestPromise);
  };
};

/**
 * Lazy loading helper
 */
const enableLazyLoading = () => {
  return (req, res, next) => {
    // Add lazy loading hints
    req.lazyLoad = {
      enabled: req.query.lazy === 'true',
      fields: req.query.lazyFields?.split(',') || []
    };

    next();
  };
};

/**
 * Response time tracker
 */
const trackResponseTime = () => {
  return (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      
      // Log slow requests
      if (duration > 1000) {
        console.warn(`⚠️ Slow request: ${req.method} ${req.path} - ${duration}ms`);
      }

      // Add header
      res.set('X-Response-Time', `${duration}ms`);
    });

    next();
  };
};

/**
 * Smart prefetch - prefetch related data
 */
const smartPrefetch = () => {
  return (req, res, next) => {
    // Store original json
    const originalJson = res.json.bind(res);

    res.json = function(data) {
      // Add prefetch hints
      if (data.success && data.data) {
        const prefetchHints = [];

        // If returning matches, hint to prefetch owner details
        if (data.data.matches) {
          prefetchHints.push('/api/me/profile');
        }

        // If returning match details, hint to prefetch participants
        if (data.data.match) {
          prefetchHints.push(`/api/matches/${data.data.match._id}/participants`);
        }

        if (prefetchHints.length > 0) {
          res.set('X-Prefetch-Hints', prefetchHints.join(','));
        }
      }

      return originalJson(data);
    };

    next();
  };
};

/**
 * Batch request handler
 */
const batchHandler = async (req, res) => {
  const { requests } = req.body;

  if (!Array.isArray(requests) || requests.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'requests must be a non-empty array'
    });
  }

  if (requests.length > 10) {
    return res.status(400).json({
      success: false,
      message: 'Maximum 10 requests per batch'
    });
  }

  // Execute all requests in parallel
  const results = await Promise.allSettled(
    requests.map(async (request) => {
      // Simulate request handling
      // In real implementation, you'd call the appropriate controller
      return {
        id: request.id,
        status: 200,
        data: { placeholder: true }
      };
    })
  );

  res.status(200).json({
    success: true,
    results: results.map((r, i) => ({
      id: requests[i].id,
      success: r.status === 'fulfilled',
      data: r.value || null,
      error: r.reason?.message || null
    }))
  });
};

module.exports = {
  addCachingHeaders,
  compressResponse,
  smartPagination,
  optimizeQuery,
  deduplicateRequests,
  enableLazyLoading,
  trackResponseTime,
  smartPrefetch,
  batchHandler
};


