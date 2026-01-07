/**
 * Security Headers Middleware
 * Prevents browser caching of authenticated pages
 * Protects against session fixation and back button vulnerabilities
 */

const securityHeadersMiddleware = (req, res, next) => {
  // Prevent caching of authenticated responses
  if (req.user || (req.headers.authorization && req.headers.authorization.startsWith('Bearer '))) {
    res.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate, no-cache, no-cache="set-cookie"');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
  } else {
    // Allow caching for public endpoints but prevent intermediary caching
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
  }

  // Prevent XSS attacks
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  res.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
  
  // Prevent opening in iframe
  res.set('X-Frame-Options', 'SAMEORIGIN');

  next();
};

module.exports = securityHeadersMiddleware;
