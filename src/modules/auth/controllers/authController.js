const User = require('../../shared/models/User');
const ClubProfile = require('../../club/models/ClubProfile');
const jwtService = require('../../../utils/jwt');
const emailService = require('../../../utils/email');
const { getUserPermissions } = require('../../../middleware/rbac');

// Global cache to prevent duplicate verification requests
const verificationCache = new Map();

// Clean cache every minute
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [token, data] of verificationCache.entries()) {
    if (data.timestamp < fiveMinutesAgo) {
      verificationCache.delete(token);
    }
  }
}, 60000);

class AuthController {

  async register(req, res) {
    try {
      const {
        email,
        password,
        registrationCode,
        role,
        phone,
        location,
        // Individual user fields
        firstName,
        lastName,
        birthDate,
        // Club organization fields
        organizationName,
        establishedDate,
        businessRegistrationNumber,
        licenseNumber,
        organizationType,
        facilitySize,
        capacity,
        description,
        website,
        socialMedia
      } = req.body;

      // Verify registration code (only required for certain roles)
      const codesRequiredRoles = ['admin', 'administrator', 'sports-administrator', 'sports-director', 'executive-director'];

      if (codesRequiredRoles.includes(role)) {
        if (!registrationCode) {
          return res.status(400).json({
            success: false,
            message: 'Registration code is required',
            code: 'REGISTRATION_CODE_REQUIRED'
          });
        }

        const RegistrationCode = require('../../../models/RegistrationCode');
        const regCode = await RegistrationCode.findOne({
          code: registrationCode.toUpperCase().trim()
        });

        if (!regCode || !regCode.isValid()) {
          return res.status(400).json({
            success: false,
            message: 'Invalid or expired registration code',
            code: 'INVALID_REGISTRATION_CODE'
          });
        }

        // Mark code as used
        await regCode.use(email.toLowerCase());
      }

      // Validate role-specific required fields
      if (role === 'club') {
        if (!organizationName || !establishedDate || !businessRegistrationNumber || !organizationType) {
          return res.status(400).json({
            success: false,
            message: 'Missing required club organization fields',
            code: 'MISSING_CLUB_FIELDS',
            requiredFields: ['organizationName', 'establishedDate', 'businessRegistrationNumber', 'organizationType']
          });
        }
      } else {
        if (!firstName || !lastName) {
          return res.status(400).json({
            success: false,
            message: 'Missing required individual user fields',
            code: 'MISSING_INDIVIDUAL_FIELDS',
            requiredFields: ['firstName', 'lastName']
          });
        }
      }

      // Check for existing email
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email address is already registered',
          code: 'EMAIL_EXISTS'
        });
      }

      // Check for existing business registration number (clubs only)
      if (role === 'club' && businessRegistrationNumber) {
        const existingBusiness = await User.findOne({ businessRegistrationNumber });
        if (existingBusiness) {
          return res.status(400).json({
            success: false,
            message: 'Business registration number is already registered',
            code: 'BUSINESS_REGISTRATION_EXISTS'
          });
        }
      }

      // Create user data object based on role
      const userData = {
        email: email.toLowerCase(),
        password,
        role,
        phone: phone || undefined,
        location: location || undefined
      };

      // Add role-specific fields
      if (role === 'club') {
        Object.assign(userData, {
          organizationName,
          establishedDate: new Date(establishedDate),
          businessRegistrationNumber,
          licenseNumber: licenseNumber || undefined,
          organizationType,
          facilitySize: facilitySize || undefined,
          capacity: capacity || undefined,
          description: description || undefined,
          website: website || undefined,
          socialMedia: socialMedia || undefined
        });
      } else {
        Object.assign(userData, {
          firstName,
          lastName,
          birthDate: birthDate ? new Date(birthDate) : undefined
        });
      }

      const user = new User(userData);
      const verificationToken = user.generateEmailVerificationToken();
      
      // Log token generation for debugging
      console.log(`📧 [REGISTRATION] Generated verification token for ${user.email} (role: ${user.role})`);
      console.log(`📧 [REGISTRATION] Token (first 20 chars): ${verificationToken.substring(0, 20)}...`);
      console.log(`📧 [REGISTRATION] Token expires at: ${new Date(user.emailVerificationTokenExpires).toISOString()}`);
      
      await user.save();
      
      // Verify token was saved correctly
      const savedUser = await User.findById(user._id);
      if (!savedUser.emailVerificationToken) {
        console.error('❌ [REGISTRATION] Token was not saved!');
        // Regenerate and save again
        savedUser.generateEmailVerificationToken();
        await savedUser.save();
        console.log('✅ [REGISTRATION] Token regenerated and saved');
      } else {
        console.log('✅ [REGISTRATION] Token saved successfully');
      }

      // Create Club Profile if role is club
      if (role === 'club') {
        try {
          // Extract national address from request body or construct it
          const nationalAddressData = req.body.nationalAddress || {
            buildingNumber: req.body.buildingNumber,
            additionalNumber: req.body.additionalNumber,
            zipCode: req.body.zipCode,
            verificationAttempted: false
          };

          const clubProfile = new ClubProfile({
            userId: user._id,
            clubName: organizationName,
            organizationType,
            establishedDate: new Date(establishedDate),
            businessRegistrationNumber,
            sportsLicenseNumber: licenseNumber,
            description,
            facilityDetails: {
              facilitySizeSqm: facilitySize,
              capacity: capacity
            },
            contactInfo: {
              website,
              socialMedia
            },
            location: {
              nationalAddress: nationalAddressData
            },
            status: 'active'
          });

          await clubProfile.save();
          console.log(`✅ Club profile created for user ${user._id} with address verification status: ${nationalAddressData.isVerified}`);
        } catch (profileError) {
          console.error('❌ Failed to create club profile:', profileError);
          // We don't fail the registration, but this should be investigated
        }
      }

      // Try to send verification email, but don't fail registration if it fails
      try {
        const emailSent = await emailService.sendVerificationEmail(user, verificationToken);
        res.status(201).json({
          success: true,
          message: emailSent
            ? 'Registration successful. Please check your email to verify your account.'
            : 'Registration successful. You can now log in to your account.',
          user: user.toSafeObject()
        });
      } catch (emailError) {
        console.error('Email service error (non-critical):', emailError);
        res.status(201).json({
          success: true,
          message: 'Registration successful. You can now log in to your account.',
          user: user.toSafeObject()
        });
      }

    } catch (error) {
      console.error('Registration error:', error);

      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors,
          code: 'VALIDATION_ERROR'
        });
      }

      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Email address is already registered',
          code: 'EMAIL_EXISTS'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Registration failed. Please try again.',
        code: 'REGISTRATION_FAILED'
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password, rememberMe } = req.body;

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        });
      }

      const isPasswordValid = await user.comparePassword(password);
      console.log('🔐 Password check:', {
        email: user.email,
        passwordProvided: password.substring(0, 5) + '...',
        passwordHash: user.password.substring(0, 10) + '...',
        isValid: isPasswordValid
      });

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        });
      }

      user.lastLogin = new Date();
      await user.save();

      const { accessToken, refreshToken } = jwtService.generateTokenPair(user);

      const userObject = user.toSafeObject(true); // Include email in response

      // Allow login even if email not verified, but include flag
      res.status(200).json({
        success: true,
        message: user.isVerified ? 'Login successful' : 'Login successful, please verify your email',
        user: {
          ...userObject,
          permissions: getUserPermissions(user.role)
        },
        accessToken,
        refreshToken,
        requiresVerification: !user.isVerified
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed. Please try again.',
        code: 'LOGIN_FAILED'
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required',
          code: 'REFRESH_TOKEN_MISSING'
        });
      }

      // Verify the refresh token
      let decoded;
      try {
        decoded = jwtService.verifyRefreshToken(refreshToken);
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token',
          code: 'INVALID_REFRESH_TOKEN'
        });
      }

      // Find the user
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Check if user is active (allow unverified emails to refresh tokens)
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated',
          code: 'ACCOUNT_DEACTIVATED'
        });
      }

      // Generate new token pair
      const tokens = jwtService.generateTokenPair(user);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });

    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh token. Please try again.',
        code: 'REFRESH_TOKEN_FAILED'
      });
    }
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No account found with that email address',
          code: 'USER_NOT_FOUND'
        });
      }

      const resetToken = user.generatePasswordResetToken();
      await user.save();

      const emailSent = await emailService.sendPasswordResetEmail(user, resetToken);

      if (!emailSent) {
        return res.status(500).json({
          success: false,
          message: 'Failed to send password reset email. Please try again.',
          code: 'EMAIL_SEND_FAILED'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Password reset email sent. Please check your email for instructions.'
      });

    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process password reset request. Please try again.',
        code: 'FORGOT_PASSWORD_FAILED'
      });
    }
  }

  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;

      const user = await User.findOne({
        passwordResetToken: token,
        passwordResetTokenExpires: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token',
          code: 'INVALID_TOKEN'
        });
      }

      user.password = password;
      user.clearPasswordResetToken();
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Password has been reset successfully. You can now log in with your new password.'
      });

    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset password. Please try again.',
        code: 'RESET_PASSWORD_FAILED'
      });
    }
  }

  async verifyEmail(req, res) {
    try {
      // Disable ALL caching - force fresh response every time
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.set('ETag', ''); // Prevent ETag generation

      const { token } = req.query;

      console.log(`📧 [EMAIL VERIFICATION] Request received for token: ${token?.substring(0, 10)}...`);

      // Validate token exists
      if (!token) {
        console.log('❌ [EMAIL VERIFICATION] No token provided');
        return res.status(400).json({
          success: false,
          message: 'Verification token is required',
          code: 'TOKEN_MISSING'
        });
      }

      // SPAM PROTECTION: Check if this exact token was processed in last 30 seconds
      const cachedResult = verificationCache.get(token);
      if (cachedResult) {
        const timeSinceLastRequest = Date.now() - cachedResult.timestamp;

        // Return cached response for requests within 30 seconds
        if (timeSinceLastRequest < 30000) {
          console.log(`🛡️ [SPAM PROTECTION] Returning cached result (${timeSinceLastRequest}ms ago)`);
          return res.status(200).json(cachedResult.response);
        } else {
          // Clear old cache
          verificationCache.delete(token);
        }
      }

      // Find user with this verification token
      // Try exact match first
      console.log(`🔍 [EMAIL VERIFICATION] Searching for user with token: ${token?.substring(0, 20)}...`);
      
      let user = await User.findOne({
        emailVerificationToken: token
      });

      if (user) {
        console.log(`✅ [EMAIL VERIFICATION] User found with exact token match: ${user.email} (role: ${user.role})`);
      } else {
        console.log(`⚠️ [EMAIL VERIFICATION] No exact match found, trying case-insensitive search...`);
        
        // If not found, try case-insensitive search (some email clients may modify URLs)
        const allUsers = await User.find({
          emailVerificationToken: { $exists: true, $ne: null }
        }).select('email emailVerificationToken emailVerificationTokenExpires isVerified role');
        
        console.log(`📝 [EMAIL VERIFICATION] Found ${allUsers.length} users with verification tokens`);
        
        // Try to find user with token that matches (case-insensitive or URL-encoded)
        user = allUsers.find(u => {
          if (!u.emailVerificationToken) return false;
          // Exact match
          if (u.emailVerificationToken === token) return true;
          // Case-insensitive match
          if (u.emailVerificationToken.toLowerCase() === token.toLowerCase()) return true;
          // URL decoded match
          try {
            const decodedToken = decodeURIComponent(token);
            if (u.emailVerificationToken === decodedToken) return true;
          } catch (e) {
            // Ignore decode errors
          }
          return false;
        });
        
        if (user) {
          const foundUserId = user._id;
          console.log(`✅ [EMAIL VERIFICATION] User found with case-insensitive match: ${user.email} (role: ${user.role})`);
          // Found user, but need to fetch full document
          user = await User.findById(foundUserId);
          if (!user) {
            console.error(`❌ [EMAIL VERIFICATION] Failed to fetch full user document for ID: ${foundUserId}`);
          } else {
            console.log(`✅ [EMAIL VERIFICATION] Full user document fetched successfully`);
          }
        } else {
          console.log(`❌ [EMAIL VERIFICATION] No user found with matching token (case-insensitive search also failed)`);
          // Log first few tokens for debugging (without exposing full tokens)
          if (allUsers.length > 0) {
            console.log(`📝 [DEBUG] Sample tokens in database (first 20 chars):`, 
              allUsers.slice(0, 5).map(u => ({
                email: u.email,
                role: u.role,
                tokenPrefix: u.emailVerificationToken?.substring(0, 20) + '...'
              }))
            );
          }
        }
      }

      // Invalid token (not found)
      if (!user) {
        console.log('❌ [EMAIL VERIFICATION] Invalid token (not found)');
        console.log('📝 [DEBUG] Token searched:', token?.substring(0, 20) + '...');
        console.log('📝 [DEBUG] Total users with tokens:', await User.countDocuments({ emailVerificationToken: { $exists: true, $ne: null } }));

        const errorResponse = {
          success: false,
          message: 'This verification link is invalid. If you have already verified your email, please try logging in.',
          messageAr: 'رابط التحقق هذا غير صالح. إذا كنت قد قمت بتفعيل بريدك الإلكتروني بالفعل، يرجى محاولة تسجيل الدخول.',
          code: 'INVALID_TOKEN'
        };

        return res.status(400).json(errorResponse);
      }

      // Check if already verified
      if (user.isVerified) {
        console.log(`✅ [EMAIL VERIFICATION] User ${user.email} already verified`);

        const alreadyVerifiedResponse = {
          success: true,
          message: 'Your email is already verified! You can now login.',
          alreadyVerified: true
        };

        // Cache this response
        verificationCache.set(token, {
          timestamp: Date.now(),
          response: alreadyVerifiedResponse
        });

        return res.status(200).json(alreadyVerifiedResponse);
      }

      // Check expiry ONLY if not verified
      if (!user.emailVerificationTokenExpires || user.emailVerificationTokenExpires < Date.now()) {
         console.log('❌ [EMAIL VERIFICATION] Token expired');
         console.log('📝 [DEBUG] Token expires:', user.emailVerificationTokenExpires ? new Date(user.emailVerificationTokenExpires).toISOString() : 'null');
         console.log('📝 [DEBUG] Current time:', new Date().toISOString());
         console.log('📝 [DEBUG] User email:', user.email);
         console.log('📝 [DEBUG] User role:', user.role);
         
         // For expired tokens, offer to resend verification email
         const errorResponse = {
           success: false,
           message: 'This verification link has expired. Please request a new one.',
           messageAr: 'انتهت صلاحية رابط التحقق. يرجى طلب رابط جديد.',
           code: 'TOKEN_EXPIRED',
           canResend: true
         };
         
        return res.status(400).json(errorResponse);
      }

      // VERIFY THE USER - This is the first time verification
      console.log(`🎉 [EMAIL VERIFICATION] Verifying user ${user.email} (role: ${user.role})`);

      // Mark user as verified
      user.isVerified = true;
      // CRITICAL FIX: Do NOT clear the token immediately to prevent "Failed" on refresh
      // user.clearEmailVerificationToken(); 
      
      // Expire the token immediately so it can't be used again for verification
      // But keep it in DB so we can find the user and show "Already Verified"
      user.emailVerificationTokenExpires = Date.now();
      
      // Save user with error handling
      try {
        await user.save();
        console.log(`✅ [EMAIL VERIFICATION] User ${user.email} saved successfully`);
      } catch (saveError) {
        console.error('❌ [EMAIL VERIFICATION] Error saving user:', saveError);
        console.error('Save error details:', {
          email: user.email,
          role: user.role,
          errorMessage: saveError.message,
          errorStack: saveError.stack
        });
        throw new Error(`Failed to save user: ${saveError.message}`);
      }

      // Generate JWT token with error handling
      let accessToken;
      try {
        const tokenPair = jwtService.generateTokenPair(user);
        accessToken = tokenPair.accessToken;
        console.log(`✅ [EMAIL VERIFICATION] JWT token generated successfully for ${user.email}`);
      } catch (tokenError) {
        console.error('❌ [EMAIL VERIFICATION] Error generating JWT token:', tokenError);
        console.error('Token error details:', {
          email: user.email,
          role: user.role,
          userId: user._id,
          errorMessage: tokenError.message
        });
        throw new Error(`Failed to generate access token: ${tokenError.message}`);
      }

      // Get user object with error handling
      let userObject;
      try {
        userObject = user.toSafeObject(true); // Include email
        console.log(`✅ [EMAIL VERIFICATION] User object created successfully`);
      } catch (userObjectError) {
        console.error('❌ [EMAIL VERIFICATION] Error creating user object:', userObjectError);
        throw new Error(`Failed to create user object: ${userObjectError.message}`);
      }

      // Get permissions with error handling - wrap in try-catch to prevent breaking verification
      let permissions = [];
      try {
        permissions = getUserPermissions(user.role);
        console.log(`✅ [EMAIL VERIFICATION] Permissions retrieved for role ${user.role}:`, permissions);
      } catch (permissionsError) {
        console.error('⚠️ [EMAIL VERIFICATION] Error getting permissions (non-critical):', permissionsError);
        console.error('Permissions error details:', {
          role: user.role,
          errorMessage: permissionsError.message
        });
        // Don't throw - just use empty permissions array
        permissions = [];
      }

      const successResponse = {
        success: true,
        message: 'Email verified successfully! Welcome to SportX Platform.',
        messageAr: 'تم التحقق من البريد الإلكتروني بنجاح! مرحباً بك في منصة SportX.',
        user: {
          ...userObject,
          permissions: permissions
        },
        accessToken
      };

      // Cache successful response
      verificationCache.set(token, {
        timestamp: Date.now(),
        response: successResponse
      });

      console.log(`✅ [EMAIL VERIFICATION] User ${user.email} (role: ${user.role}) verified successfully`);

      return res.status(200).json(successResponse);

    } catch (error) {
      console.error('❌ [EMAIL VERIFICATION ERROR]');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        token: req.query.token ? req.query.token.substring(0, 10) + '...' : 'missing',
        path: req.path,
        method: req.method
      });

      // Return more specific error message with Arabic translation
      return res.status(500).json({
        success: false,
        message: 'Email verification failed. Please try again later.',
        messageAr: 'فشل التحقق من البريد الإلكتروني. يرجى المحاولة مرة أخرى لاحقاً.',
        code: 'VERIFICATION_FAILED',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async resendVerification(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email address is required',
          messageAr: 'البريد الإلكتروني مطلوب',
          code: 'EMAIL_REQUIRED'
        });
      }

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No account found with that email address',
          messageAr: 'لم يتم العثور على حساب بهذا البريد الإلكتروني',
          code: 'USER_NOT_FOUND'
        });
      }

      if (user.isVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email address is already verified',
          messageAr: 'البريد الإلكتروني مفعّل بالفعل',
          code: 'ALREADY_VERIFIED'
        });
      }

      // Generate new verification token
      const verificationToken = user.generateEmailVerificationToken();
      
      console.log(`📧 [RESEND VERIFICATION] Generated new token for ${user.email} (role: ${user.role})`);
      console.log(`📧 [RESEND VERIFICATION] Token (first 20 chars): ${verificationToken.substring(0, 20)}...`);
      console.log(`📧 [RESEND VERIFICATION] Token expires at: ${new Date(user.emailVerificationTokenExpires).toISOString()}`);
      
      await user.save();

      // Verify token was saved
      const savedUser = await User.findById(user._id);
      if (!savedUser.emailVerificationToken) {
        console.error('❌ [RESEND VERIFICATION] Token was not saved!');
        savedUser.generateEmailVerificationToken();
        await savedUser.save();
        console.log('✅ [RESEND VERIFICATION] Token regenerated and saved');
      } else {
        console.log('✅ [RESEND VERIFICATION] Token saved successfully');
      }

      const emailSent = await emailService.sendVerificationEmail(user, verificationToken);

      if (!emailSent) {
        return res.status(500).json({
          success: false,
          message: 'Failed to send verification email. Please try again.',
          messageAr: 'فشل إرسال بريد التحقق. يرجى المحاولة مرة أخرى.',
          code: 'EMAIL_SEND_FAILED'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Verification email sent. Please check your email.',
        messageAr: 'تم إرسال بريد التحقق. يرجى التحقق من بريدك الإلكتروني.'
      });

    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resend verification email. Please try again.',
        messageAr: 'فشل إعادة إرسال بريد التحقق. يرجى المحاولة مرة أخرى.',
        code: 'RESEND_VERIFICATION_FAILED'
      });
    }
  }

  async logout(req, res) {
    try {
      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        code: 'LOGOUT_FAILED'
      });
    }
  }

  async getProfile(req, res) {
    try {
      const user = req.user;
      const userObject = user.toSafeObject();

      res.status(200).json({
        success: true,
        user: {
          ...userObject,
          permissions: getUserPermissions(user.role)
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch profile',
        code: 'PROFILE_FETCH_FAILED'
      });
    }
  }

  async getRoleInfo(req, res) {
    try {
      const { rolePermissions, getRoleHierarchy } = require('../middleware/rbac');

      res.status(200).json({
        success: true,
        data: {
          roles: Object.keys(rolePermissions),
          permissions: rolePermissions,
          hierarchy: getRoleHierarchy(),
          userRole: req.user ? req.user.role : null,
          userPermissions: req.user ? getUserPermissions(req.user.role) : null
        }
      });
    } catch (error) {
      console.error('Get role info error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch role information',
        code: 'ROLE_INFO_FETCH_FAILED'
      });
    }
  }

  async testAccount(req, res) {
    try {
      const testUser = await User.findOne({ email: 'test@example.com' });

      if (!testUser) {
        const newTestUser = new User({
          email: 'test@example.com',
          password: 'password',
          firstName: 'Test',
          lastName: 'User',
          birthDate: new Date('1990-01-01'),
          role: 'player',
          isVerified: true
        });

        await newTestUser.save();
        console.log('✅ Test account created');
      }

      res.status(200).json({
        success: true,
        message: 'Test account available: test@example.com / password'
      });
    } catch (error) {
      console.error('Test account setup error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to setup test account'
      });
    }
  }
}

module.exports = new AuthController();