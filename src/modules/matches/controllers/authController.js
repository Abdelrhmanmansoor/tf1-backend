const bcrypt = require('bcryptjs');
const MatchUser = require('../models/MatchUser');
const jwtService = require('../utils/jwtService');
const emailService = require('../../../utils/email');

class AuthController {
  async register(req, res) {
    try {
      const { email, password, name } = req.body;

      // Validation
      if (!email || !password || !name) {
        return res.status(400).json({
          success: false,
          message: 'Email, password, and name are required'
        });
      }

      // Check if user already exists
      const existingUser = await MatchUser.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 10);

      // Create user
      const user = new MatchUser({
        email: email.toLowerCase(),
        password_hash,
        name,
        verified: false,
        role: 'MatchUser'
      });

      // Generate verification token
      const verificationToken = user.generateEmailVerificationToken();
      await user.save();

      // Send verification email (reusing existing service)
      try {
        const emailSent = await emailService.sendVerificationEmail(
          { 
            email: user.email, 
            firstName: user.name,
            role: 'MatchUser'
          }, 
          verificationToken
        );
        
        res.status(201).json({
          success: true,
          message: emailSent
            ? 'Registration successful. Please check your email to verify your account.'
            : 'Registration successful. Please verify your email to login.',
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            verified: user.verified,
            role: user.role
          }
        });
      } catch (emailError) {
        console.error('Email service error (non-critical):', emailError);
        res.status(201).json({
          success: true,
          message: 'Registration successful. Please verify your email to login.',
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            verified: user.verified,
            role: user.role
          }
        });
      }
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating user',
        error: error.message
      });
    }
  }

  async verify(req, res) {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Verification token is required',
          code: 'TOKEN_MISSING'
        });
      }

      // Find user with this verification token
      const user = await MatchUser.findOne({
        emailVerificationToken: token,
        emailVerificationTokenExpires: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired verification token',
          code: 'INVALID_TOKEN'
        });
      }

      // Check if already verified
      if (user.verified) {
        return res.status(200).json({
          success: true,
          message: 'Email already verified',
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            verified: user.verified,
            role: user.role
          }
        });
      }

      // Verify the user
      user.verified = true;
      user.clearEmailVerificationToken();
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          verified: user.verified,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Verify error:', error);
      res.status(500).json({
        success: false,
        message: 'Error verifying email',
        error: error.message
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Find user
      const user = await MatchUser.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check if email is verified
      if (!user.verified) {
        return res.status(403).json({
          success: false,
          message: 'Please verify your email before logging in',
          code: 'EMAIL_NOT_VERIFIED'
        });
      }

      // Verify password
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Generate token
      const token = jwtService.generateAccessToken(user._id, user.email);

      // Set httpOnly cookie
      const cookieOptions = jwtService.getCookieOptions();
      res.cookie('matches_token', token, cookieOptions);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          verified: user.verified,
          role: user.role,
          is_admin: user.is_admin
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Error during login',
        error: error.message
      });
    }
  }

  async logout(req, res) {
    try {
      // Clear the cookie
      res.clearCookie('matches_token', {
        httpOnly: true,
        path: '/'
      });

      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Error during logout',
        error: error.message
      });
    }
  }

  async me(req, res) {
    try {
      // req.matchUser is set by authenticate middleware
      const user = req.matchUser;

      res.status(200).json({
        success: true,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          verified: user.verified,
          role: user.role,
          is_admin: user.is_admin,
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      });
    } catch (error) {
      console.error('Get me error:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving user information',
        error: error.message
      });
    }
  }

  // Legacy signup endpoint for backward compatibility
  async signup(req, res) {
    return this.register(req, res);
  }
}

module.exports = new AuthController();
