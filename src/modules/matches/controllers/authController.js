const MatchUser = require('../models/MatchUser');
const SharedUser = require('../../shared/models/User');
const jwtService = require('../utils/jwtService');
const emailService = require('../../../utils/email');
const { validateEmail, validatePassword } = require('../middleware/security');
const { ValidationError, asyncHandler } = require('../utils/errorHandler');

class AuthController {
  register = asyncHandler(async (req, res) => {
    const { email, password, name, firstName, lastName, phone } = req.body;

    // Support both name and firstName/lastName
    const finalName = name || (firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName);

    // Validation
    if (!email || !password || !finalName) {
      throw new ValidationError('Email, password, and name are required');
    }

    // Validate email format
    if (!validateEmail(email)) {
      throw new ValidationError('Invalid email format');
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new ValidationError(passwordValidation.message);
    }

    // Check if user already exists
    const existingUser = await MatchUser.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ValidationError('Email already registered');
    }

    // Create user (password will be hashed by pre-save hook)
    const user = new MatchUser({
      email: email.toLowerCase(),
      password_hash: password,  // Will be hashed by model's pre-save hook
      name: finalName,
      phone: phone || null,
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
  });

  async verify(req, res) {
    try {
      // Support token from query params or body
      const token = req.query.token || req.body.token;

      console.log('Verify email request received, token:', token ? token.substring(0, 10) + '...' : 'missing');

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Verification token is required',
          code: 'TOKEN_MISSING'
        });
      }

      // First check if token exists (without expiry check)
      const userWithToken = await MatchUser.findOne({
        emailVerificationToken: token
      });

      if (!userWithToken) {
        console.log('Token not found in database');
        return res.status(400).json({
          success: false,
          message: 'This verification link is invalid or has expired',
          code: 'INVALID_TOKEN'
        });
      }

      // Check if token is expired
      if (userWithToken.emailVerificationTokenExpires < Date.now()) {
        console.log('Token expired at:', userWithToken.emailVerificationTokenExpires);
        return res.status(400).json({
          success: false,
          message: 'This verification link has expired. Please request a new one.',
          code: 'TOKEN_EXPIRED'
        });
      }

      const user = userWithToken;

      // Check if already verified
      if (user.verified) {
        // Generate token and set cookie for auto-login
        const accessToken = jwtService.generateAccessToken(user._id, user.email);
        const cookieOptions = jwtService.getCookieOptions();
        res.cookie('matches_token', accessToken, cookieOptions);

        return res.status(200).json({
          success: true,
          message: 'Email already verified',
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            verified: user.verified,
            role: user.role
          },
          accessToken
        });
      }

      // Verify the user
      user.verified = true;
      user.clearEmailVerificationToken();
      await user.save();

      // Generate token and set cookie for auto-login after verification
      const accessToken = jwtService.generateAccessToken(user._id, user.email);
      const cookieOptions = jwtService.getCookieOptions();
      res.cookie('matches_token', accessToken, cookieOptions);

      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          verified: user.verified,
          role: user.role
        },
        accessToken
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

      // Find user (explicitly select password_hash for authentication)
      const user = await MatchUser.findOne({ email: email.toLowerCase() }).select('+password_hash');
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
        token, // Required for localStorage
        accessToken: token, // Alias
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
          firstName: user.firstName || user.name?.split(' ')[0] || '',
          lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
          phone: user.phone || null,
          profilePicture: user.profilePicture || null,
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

  // Upload profile picture
  async uploadProfilePicture(req, res) {
    try {
      const user = req.matchUser;
      const { uploadAvatar, cleanupOldImage } = require('../../../config/cloudinary');

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided',
          code: 'NO_FILE'
        });
      }

      // Upload to Cloudinary
      const result = await uploadAvatar(req.file.buffer, user._id.toString(), 'matches');

      // Clean up old profile picture if exists
      if (user.profilePicture) {
        await cleanupOldImage(user.profilePicture);
      }

      // Update user with new profile picture
      user.profilePicture = result.url;
      await user.save();

      try {
        const platformUser = await SharedUser.findOne({ email: user.email.toLowerCase() });
        if (platformUser) {
          platformUser.avatar = result.url;
          await platformUser.save();
        }
      } catch (e) {}

      res.status(200).json({
        success: true,
        message: 'Profile picture uploaded successfully',
        profilePicture: result.url
      });
    } catch (error) {
      console.error('Upload profile picture error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload profile picture',
        code: 'UPLOAD_FAILED',
        error: error.message
      });
    }
  }

  // Update profile
  async updateProfile(req, res) {
    try {
      const user = req.matchUser;
      const { firstName, lastName, phone } = req.body;

      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (phone !== undefined) user.phone = phone;

      // Update name if firstName or lastName changed
      if (firstName || lastName) {
        user.name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
      }

      await user.save();

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          profilePicture: user.profilePicture,
          verified: user.verified,
          role: user.role,
          is_admin: user.is_admin
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        code: 'UPDATE_FAILED',
        error: error.message
      });
    }
  }

  // Resend verification email
  async resendVerification(req, res) {
    try {
      const { email } = req.body;

      console.log('Resend verification request for email:', email);

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      // Find user by email
      const user = await MatchUser.findOne({ email: email.toLowerCase() });

      if (!user) {
        // Don't reveal if email exists for security
        return res.status(200).json({
          success: true,
          message: 'If your email is registered, you will receive a verification link shortly.'
        });
      }

      // Check if already verified
      if (user.verified) {
        return res.status(400).json({
          success: false,
          message: 'Email is already verified'
        });
      }

      // Generate new verification token
      const verificationToken = user.generateEmailVerificationToken();
      await user.save();

      // Send verification email
      try {
        const emailSent = await emailService.sendVerificationEmail(
          {
            email: user.email,
            firstName: user.name,
            role: 'MatchUser'
          },
          verificationToken
        );

        res.status(200).json({
          success: true,
          message: emailSent
            ? 'Verification email sent successfully. Please check your inbox.'
            : 'Unable to send verification email. Please try again later.'
        });
      } catch (emailError) {
        console.error('Email service error:', emailError);
        res.status(500).json({
          success: false,
          message: 'Failed to send verification email. Please try again later.'
        });
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Error sending verification email',
        error: error.message
      });
    }
  }

  // Verify email endpoint (alias for verify with better naming)
  verifyEmail = async (req, res) => {
    return this.verify(req, res);
  }
}

module.exports = new AuthController();
