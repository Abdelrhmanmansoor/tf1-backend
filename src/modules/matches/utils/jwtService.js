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
}

module.exports = new MatchJwtService();
