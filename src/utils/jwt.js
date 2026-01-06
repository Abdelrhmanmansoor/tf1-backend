const jwt = require('jsonwebtoken');
const logger = require('./logger');

class JWTService {
  /**
   * Validate that required JWT secrets are set
   */
  _validateSecrets() {
    if (!process.env.JWT_ACCESS_SECRET) {
      throw new Error(
        'JWT_ACCESS_SECRET environment variable is not set. Please configure it in your .env file.'
      );
    }
    if (!process.env.JWT_REFRESH_SECRET) {
      throw new Error(
        'JWT_REFRESH_SECRET environment variable is not set. Please configure it in your .env file.'
      );
    }
  }

  generateAccessToken(payload) {
    this._validateSecrets();
    
    if (!payload || !payload.userId) {
      throw new Error('Invalid payload: userId is required');
    }

    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1h',
      issuer: 'sportsplatform-api',
    });
  }

  generateRefreshToken(payload) {
    this._validateSecrets();
    
    if (!payload || !payload.userId) {
      throw new Error('Invalid payload: userId is required');
    }

    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      issuer: 'sportsplatform-api',
    });
  }

  verifyAccessToken(token) {
    try {
      this._validateSecrets();
      
      if (!token) {
        throw new Error('Token is required');
      }

      return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (error) {
      if (error.message.includes('environment variable')) {
        throw error;
      }
      if (error.name === 'TokenExpiredError') {
        throw new Error('Access token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid access token');
      }
      throw new Error('Invalid or expired access token');
    }
  }

  verifyRefreshToken(token) {
    try {
      this._validateSecrets();
      
      if (!token) {
        throw new Error('Token is required');
      }

      return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      if (error.message.includes('environment variable')) {
        throw error;
      }
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      }
      throw new Error('Invalid or expired refresh token');
    }
  }

  generateTokenPair(user) {
    const payload = {
      userId: user._id || user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
    };
  }

  extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      throw new Error('No authorization header provided');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new Error('Invalid authorization header format');
    }

    return parts[1];
  }

  decodeToken(token) {
    return jwt.decode(token);
  }

  isTokenExpired(token) {
    try {
      const decoded = this.decodeToken(token);
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }
}

module.exports = new JWTService();
