const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.MATCHES_JWT_SECRET || 'matches-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.MATCHES_JWT_EXPIRES_IN || '7d';

class MatchJwtService {
  generateAccessToken(userId, email) {
    return jwt.sign(
      { userId, email, type: 'matches' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  verifyAccessToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      }
      throw new Error('Invalid token');
    }
  }

  extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Invalid authorization header format');
    }
    return authHeader.substring(7);
  }

  extractTokenFromCookie(cookies) {
    if (!cookies || !cookies.matches_token) {
      throw new Error('No matches_token cookie found');
    }
    return cookies.matches_token;
  }

  getCookieOptions() {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER;
    return {
      httpOnly: true,
      secure: isProduction, // true in production
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    };
  }
}

module.exports = new MatchJwtService();
