const bcrypt = require('bcryptjs');
const MatchUser = require('../models/MatchUser');
const jwtService = require('../utils/jwtService');

class AuthController {
  async signup(req, res) {
    try {
      const { email, password, display_name } = req.body;

      // Validation
      if (!email || !password || !display_name) {
        return res.status(400).json({
          success: false,
          message: 'Email, password, and display_name are required'
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
      const user = await MatchUser.create({
        email: email.toLowerCase(),
        password_hash,
        display_name
      });

      // Generate token
      const token = jwtService.generateAccessToken(user._id, user.email);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user._id,
            email: user.email,
            display_name: user.display_name,
            is_admin: user.is_admin,
            created_at: user.created_at
          },
          token
        }
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating user',
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

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Generate token
      const token = jwtService.generateAccessToken(user._id, user.email);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user._id,
            email: user.email,
            display_name: user.display_name,
            is_admin: user.is_admin,
            created_at: user.created_at
          },
          token
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

  async me(req, res) {
    try {
      // req.matchUser is set by authenticate middleware
      const user = req.matchUser;

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user._id,
            email: user.email,
            display_name: user.display_name,
            is_admin: user.is_admin,
            created_at: user.created_at,
            updated_at: user.updated_at
          }
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
}

module.exports = new AuthController();
