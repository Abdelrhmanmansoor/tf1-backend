/**
 * Security Headers Middleware
 * Prevents browser caching of authenticated pages
 * Protects against session fixation and back button vulnerabilities
 */

const securityHeadersMiddleware = (req, res, next) => {
  const isAuthContext = req.user || (req.headers.authorization && req.headers.authorization.startsWith('Bearer '));

  // Prevent caching of authenticated responses
  if (isAuthContext) {
    res.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate, no-cache, no-cache="set-cookie"');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
  } else {
    // Allow short-lived caching for public endpoints but prevent intermediary caching
    res.set('Cache-Control', 'public, max-age=300, must-revalidate');
  }

  // Core hardening headers
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('X-XSS-Protection', '1; mode=block');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy tuned for API + static assets
  res.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self' https:",
      "font-src 'self' data:",
      "form-action 'self'"
    ].join('; ')
  );

  // HSTS for HTTPS environments
  const enableHsts = process.env.NODE_ENV === 'production' || process.env.ENABLE_HSTS === 'true';
  if (enableHsts) {
    res.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }

  next();
};

module.exports = securityHeadersMiddleware;
