const User = require('../../shared/models/User');
const OTP = require('../../shared/models/OTP');
const ClubProfile = require('../../club/models/ClubProfile');
const jwtService = require('../../../utils/jwt');
const emailService = require('../../../utils/email');
const authenticaService = require('../../../services/authenticaService');
const { getUserPermissions } = require('../../../middleware/rbac');
const { clearUserCSRFTokens } = require('../../../middleware/csrf');
const logger = require('../../../utils/logger');

const isProduction = process.env.NODE_ENV === 'production';
const ACCESS_TOKEN_MAX_AGE = parseInt(process.env.JWT_ACCESS_COOKIE_MS || `${15 * 60 * 1000}`, 10);
const REFRESH_TOKEN_MAX_AGE = parseInt(process.env.JWT_REFRESH_COOKIE_MS || `${7 * 24 * 60 * 60 * 1000}`, 10);
const REMEMBER_ME_REFRESH_MAX_AGE = parseInt(
  process.env.JWT_REFRESH_REMEMBER_MS || `${30 * 24 * 60 * 60 * 1000}`,
  10
);

const buildCookieOptions = maxAge => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'strict' : 'lax',
  path: '/',
  maxAge,
});

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
      
      console.log(`📧 [REGISTRATION] Generated verification token for ${user.email} (role: ${user.role})`);
      console.log(`📧 [REGISTRATION] Token length: ${verificationToken.length}, Token prefix: ${verificationToken.substring(0, 20)}...`);
      console.log(`📧 [REGISTRATION] Token expires at: ${user.emailVerificationTokenExpires ? new Date(user.emailVerificationTokenExpires).toISOString() : 'null'}`);
      
      try {
        await user.save();
        console.log(`✅ [REGISTRATION] User saved successfully: ${user.email} (role: ${user.role})`);
      } catch (saveError) {
        console.error('❌ [REGISTRATION] Error saving user:', saveError);
        console.error('Save error details:', {
          email: user.email,
          role: user.role,
          errorMessage: saveError.message,
          errorName: saveError.name,
          validationErrors: saveError.errors ? Object.keys(saveError.errors).map(key => ({
            field: key,
            message: saveError.errors[key].message
          })) : null
        });
        throw saveError;
      }
      
      // Verify token was saved correctly
      const savedUser = await User.findById(user._id);
      if (!savedUser) {
        console.error(`❌ [REGISTRATION] User not found after save: ${user._id}`);
        throw new Error('User not found after registration');
      }
      
      if (!savedUser.emailVerificationToken) {
        console.error(`❌ [REGISTRATION] Email verification token not saved on first attempt for ${user.email} (role: ${user.role})`);
        // Regenerate and save again using updateOne to ensure it's saved
        const newToken = savedUser.generateEmailVerificationToken();
        await User.updateOne(
          { _id: savedUser._id },
          {
            $set: {
              emailVerificationToken: savedUser.emailVerificationToken,
              emailVerificationTokenExpires: savedUser.emailVerificationTokenExpires
            }
          }
        );
        console.log(`✅ [REGISTRATION] Email verification token regenerated and saved using updateOne for ${user.email}`);
        
        // Verify again
        const recheckUser = await User.findById(savedUser._id);
        if (!recheckUser || !recheckUser.emailVerificationToken) {
          console.error(`❌ [REGISTRATION] Token still not saved after updateOne for ${user.email}`);
          throw new Error('Failed to save verification token');
        } else {
          console.log(`✅ [REGISTRATION] Token verified after updateOne for ${user.email}, token length: ${recheckUser.emailVerificationToken.length}, matches: ${recheckUser.emailVerificationToken === verificationToken}`);
        }
      } else {
        console.log(`✅ [REGISTRATION] Email verification token saved successfully for ${user.email}, token length: ${savedUser.emailVerificationToken.length}, matches: ${savedUser.emailVerificationToken === verificationToken}`);
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
          logger.info('Club profile created', { userId: user._id });
        } catch (profileError) {
          logger.error('Failed to create club profile', { userId: user._id, error: profileError.message });
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
        logger.warn('Email verification send failed', { userId: user._id, error: emailError.message });
        res.status(201).json({
          success: true,
          message: 'Registration successful. You can now log in to your account.',
          user: user.toSafeObject()
        });
      }

    } catch (error) {
      logger.error('Registration failed', { error: error.message, stack: error.stack });

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
      logger.debug('Password verification check:', {
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

      // Set signed tokens in secure cookies to reduce exposure surface
      const accessMaxAge = ACCESS_TOKEN_MAX_AGE;
      const refreshMaxAge = rememberMe ? REMEMBER_ME_REFRESH_MAX_AGE : REFRESH_TOKEN_MAX_AGE;

      res.cookie('accessToken', accessToken, buildCookieOptions(accessMaxAge));
      res.cookie('refreshToken', refreshToken, buildCookieOptions(refreshMaxAge));

      const userObject = user.toSafeObject(true); // Include email in response

      // Allow login even if email not verified, but include flag
      res.status(200).json({
        success: true,
        message: user.isVerified ? 'Login successful' : 'Login successful, please verify your email',
        user: {
          ...userObject,
          permissions: getUserPermissions(user.role)
        },
        // Keep tokens in body for backward compatibility while moving clients to cookies
        accessToken,
        refreshToken,
        requiresVerification: !user.isVerified
      });

    } catch (error) {
      logger.error('Login failed', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        message: 'Login failed. Please try again.',
        code: 'LOGIN_FAILED'
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

      if (!incomingRefreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required',
          code: 'REFRESH_TOKEN_MISSING'
        });
      }

      // Verify the refresh token
      let decoded;
      try {
        decoded = jwtService.verifyRefreshToken(incomingRefreshToken);
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

      // Generate new token pair and rotate cookies
      const tokens = jwtService.generateTokenPair(user);

      res.cookie('accessToken', tokens.accessToken, buildCookieOptions(ACCESS_TOKEN_MAX_AGE));
      res.cookie('refreshToken', tokens.refreshToken, buildCookieOptions(REFRESH_TOKEN_MAX_AGE));

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });

    } catch (error) {
      logger.error('Token refresh failed', { error: error.message });
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
      logger.error('Forgot password failed', { error: error.message });
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
      logger.error('Reset password failed', { error: error.message });
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

      logger.info('Email verification request received');

      // Validate token exists
      if (!token) {
        logger.warn('Email verification requested with no token');
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
      console.log(`📝 [DEBUG] Token length: ${token?.length}, Token type: ${typeof token}`);
      
      // Decode token if it's URL encoded
      let decodedToken = token;
      try {
        decodedToken = decodeURIComponent(token);
        if (decodedToken !== token) {
          console.log(`📝 [DEBUG] Token was URL encoded, decoded length: ${decodedToken.length}`);
        }
      } catch (e) {
        console.log(`📝 [DEBUG] Token is not URL encoded or decode failed: ${e.message}`);
        decodedToken = token;
      }
      
      let user = await User.findOne({
        emailVerificationToken: token
      });

      if (user) {
        console.log(`✅ [EMAIL VERIFICATION] User found with exact token match: ${user.email} (role: ${user.role})`);
      } else {
        // Try with decoded token
        if (decodedToken !== token) {
          console.log(`🔄 [EMAIL VERIFICATION] Trying with decoded token...`);
          user = await User.findOne({
            emailVerificationToken: decodedToken
          });
          if (user) {
            console.log(`✅ [EMAIL VERIFICATION] User found with decoded token: ${user.email} (role: ${user.role})`);
          }
        }
      }

      if (!user) {
        console.log(`⚠️ [EMAIL VERIFICATION] No exact match found, trying case-insensitive search...`);
        
        // If not found, try case-insensitive search (some email clients may modify URLs)
        const allUsers = await User.find({
          emailVerificationToken: { $exists: true, $ne: null }
        }).select('email emailVerificationToken emailVerificationTokenExpires isVerified role _id');
        
        console.log(`📝 [EMAIL VERIFICATION] Found ${allUsers.length} users with verification tokens`);
        
        // Log job-publisher users specifically for debugging
        const jobPublisherUsers = allUsers.filter(u => u.role === 'job-publisher');
        console.log(`📝 [DEBUG] Found ${jobPublisherUsers.length} job-publisher users with tokens`);
        if (jobPublisherUsers.length > 0) {
          console.log(`📝 [DEBUG] Job-publisher users:`, jobPublisherUsers.map(u => ({
            email: u.email,
            tokenPrefix: u.emailVerificationToken?.substring(0, 20) + '...',
            isVerified: u.isVerified,
            tokenExpires: u.emailVerificationTokenExpires ? new Date(u.emailVerificationTokenExpires).toISOString() : 'null'
          })));
        }
        
        // Try to find user with token that matches (case-insensitive or URL-encoded)
        user = allUsers.find(u => {
          if (!u.emailVerificationToken) return false;
          const uToken = u.emailVerificationToken;
          // Exact match
          if (uToken === token || uToken === decodedToken) return true;
          // Case-insensitive match
          if (uToken.toLowerCase() === token.toLowerCase() || uToken.toLowerCase() === decodedToken.toLowerCase()) return true;
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
                tokenPrefix: u.emailVerificationToken?.substring(0, 20) + '...',
                tokenLength: u.emailVerificationToken?.length
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
          messageAr: 'تم التحقق من بريدك الإلكتروني مسبقاً! يمكنك تسجيل الدخول الآن.',
          code: 'ALREADY_VERIFIED',
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
      console.log(`📝 [DEBUG] User before verification:`, {
        id: user._id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        hasToken: !!user.emailVerificationToken,
        tokenExpires: user.emailVerificationTokenExpires ? new Date(user.emailVerificationTokenExpires).toISOString() : 'null'
      });

      // CRITICAL: Validate role is in enum before proceeding
      const validRoles = ['player', 'coach', 'club', 'specialist', 'team', 'admin', 'administrator', 
                          'administrative-officer', 'age-group-supervisor', 'sports-director', 
                          'executive-director', 'secretary', 'sports-administrator', 'applicant', 'job-publisher'];
      if (!validRoles.includes(user.role)) {
        console.error(`❌ [EMAIL VERIFICATION] Invalid role: ${user.role}`);
        return res.status(400).json({
          success: false,
          message: 'Invalid user role',
          messageAr: 'دور المستخدم غير صالح',
          code: 'INVALID_ROLE'
        });
      }

      // Mark user as verified
      user.isVerified = true;
      // CRITICAL FIX: Do NOT clear the token immediately to prevent "Failed" on refresh
      // user.clearEmailVerificationToken(); 
      
      // Expire the token immediately so it can't be used again for verification
      // But keep it in DB so we can find the user and show "Already Verified"
      user.emailVerificationTokenExpires = Date.now();
      
      // Save user with error handling - use updateOne to avoid validation issues
      try {
        // CRITICAL FIX: Use updateOne with explicit role support for all roles including job-publisher and applicant
        const updateResult = await User.updateOne(
          { 
            _id: user._id,
            role: { $in: ['player', 'coach', 'club', 'specialist', 'team', 'admin', 'administrator', 
                          'administrative-officer', 'age-group-supervisor', 'sports-director', 
                          'executive-director', 'secretary', 'sports-administrator', 'applicant', 'job-publisher'] }
          },
          {
            $set: {
              isVerified: true,
              emailVerificationTokenExpires: Date.now()
            }
          }
        );
        
        console.log(`✅ [EMAIL VERIFICATION] User ${user.email} (role: ${user.role}) update attempted`, {
          matched: updateResult.matchedCount,
          modified: updateResult.modifiedCount
        });

        // If no document was matched, it means role might not be in enum or user doesn't exist
        if (updateResult.matchedCount === 0) {
          console.error(`❌ [EMAIL VERIFICATION] No user matched for update - role: ${user.role}, id: ${user._id}`);
          throw new Error(`User update failed: No document matched. Role: ${user.role}`);
        }
        
        if (updateResult.modifiedCount === 0 && user.isVerified === false) {
          console.warn(`⚠️ [EMAIL VERIFICATION] User ${user.email} was not modified - may already be verified or update failed`);
          // Still continue - might already be verified
        }
        
        // Refresh user object from database to ensure we have latest data
        user = await User.findById(user._id);
        if (!user) {
          throw new Error('User not found after update');
        }
        
        console.log(`✅ [EMAIL VERIFICATION] User refreshed from database, isVerified: ${user.isVerified}, role: ${user.role}`);
      } catch (saveError) {
        console.error('❌ [EMAIL VERIFICATION] Error saving user:', saveError);
        console.error('Save error details:', {
          email: user.email,
          role: user.role,
          userId: user._id,
          errorMessage: saveError.message,
          errorName: saveError.name,
          errorStack: saveError.stack,
          // If it's a validation error, log the validation errors
          validationErrors: saveError.errors ? Object.keys(saveError.errors).map(key => ({
            field: key,
            message: saveError.errors[key].message
          })) : null
        });
        
        // Try alternative save method if updateOne failed - use validateBeforeSave: false to skip validation
        try {
          console.log('🔄 [EMAIL VERIFICATION] Trying alternative save method with validateBeforeSave: false...');
          user.isVerified = true;
          user.emailVerificationTokenExpires = Date.now();
          // Skip validation and middleware hooks to ensure save succeeds
          await user.save({ validateBeforeSave: false, runValidators: false });
          console.log(`✅ [EMAIL VERIFICATION] User saved using alternative method (skip validation)`);
          
          // Refresh user after save
          user = await User.findById(user._id);
          if (!user) {
            throw new Error('User not found after alternative save');
          }
        } catch (altSaveError) {
          console.error('❌ [EMAIL VERIFICATION] Alternative save also failed:', altSaveError);
          console.error('Alternative save error details:', {
            email: user.email,
            role: user.role,
            userId: user._id,
            errorMessage: altSaveError.message,
            errorName: altSaveError.name
          });
          throw new Error(`Failed to save user: ${saveError.message}. Alternative method also failed: ${altSaveError.message}`);
        }
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
        // Ensure role is valid before getting permissions
        if (user.role && typeof user.role === 'string') {
          permissions = getUserPermissions(user.role);
          console.log(`✅ [EMAIL VERIFICATION] Permissions retrieved for role ${user.role}:`, (permissions?.length || 0), 'permissions');
        } else {
          console.warn(`⚠️ [EMAIL VERIFICATION] Invalid role type: ${typeof user.role}, value: ${user.role}`);
          permissions = [];
        }
      } catch (permissionsError) {
        console.error('⚠️ [EMAIL VERIFICATION] Error getting permissions (non-critical):', permissionsError);
        console.error('Permissions error details:', {
          role: user.role,
          roleType: typeof user.role,
          errorMessage: permissionsError.message,
          errorStack: permissionsError.stack
        });
        // Don't throw - just use empty permissions array to not break verification
        permissions = [];
      }

      const successResponse = {
        success: true,
        message: '✅ Your email has been verified successfully! You can now login.',
        messageAr: '✅ تم التحقق من بريدك الإلكتروني بنجاح! يمكنك تسجيل الدخول الآن.',
        code: 'VERIFICATION_SUCCESS',
        verified: true,
        isVerified: true,
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
      console.log('📤 [EMAIL VERIFICATION] Response:', JSON.stringify({ success: successResponse.success, message: successResponse.message, code: successResponse.code }));

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

      // CRITICAL FIX: Check if verification actually succeeded in DB despite the error
      // This can happen if token generation fails but isVerified was already set to true
      try {
        const { token } = req.query;
        if (token) {
          // Try to find user and check if they're verified
          let checkUser = await User.findOne({ emailVerificationToken: token });
          if (!checkUser) {
            try {
              const decodedToken = decodeURIComponent(token);
              checkUser = await User.findOne({ emailVerificationToken: decodedToken });
            } catch (e) {
              // Ignore decode error
            }
          }
          
          // If user is verified, return success even though error occurred
          if (checkUser && checkUser.isVerified) {
            console.log('✅ [EMAIL VERIFICATION] Account was verified despite error - returning success response');
            
            // Generate token and return success
            try {
              const tokenPair = jwtService.generateTokenPair(checkUser);
              const userObject = checkUser.toSafeObject(true);
              const permissions = getUserPermissions(checkUser.role);
              
              return res.status(200).json({
                success: true,
                message: '✅ Your email has been verified successfully! You can now login.',
                messageAr: '✅ تم التحقق من بريدك الإلكتروني بنجاح! يمكنك تسجيل الدخول الآن.',
                code: 'VERIFICATION_SUCCESS',
                verified: true,
                isVerified: true,
                user: {
                  ...userObject,
                  permissions: permissions
                },
                accessToken: tokenPair.accessToken
              });
            } catch (tokenError) {
              // Even if token generation fails, account is verified - return success without token
              console.warn('⚠️ [EMAIL VERIFICATION] Token generation failed but account is verified');
              return res.status(200).json({
                success: true,
                message: '✅ Your email has been verified successfully! You can now login.',
                messageAr: '✅ تم التحقق من بريدك الإلكتروني بنجاح! يمكنك تسجيل الدخول الآن.',
                code: 'VERIFICATION_SUCCESS',
                verified: true,
                isVerified: true,
                note: 'Please login to get your access token'
              });
            }
          }
        }
      } catch (checkError) {
        console.error('❌ [EMAIL VERIFICATION] Error checking verification status:', checkError);
        // Continue to return error if check fails
      }

      // Return error only if verification didn't succeed in DB
      return res.status(500).json({
        success: false,
        message: 'Email verification failed. Please try again later. If your account is verified, please try logging in.',
        messageAr: 'فشل التحقق من البريد الإلكتروني. يرجى المحاولة مرة أخرى لاحقاً. إذا كان حسابك مفعّل، جرب تسجيل الدخول.',
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
      logger.error('Resend verification failed', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to resend verification email. Please try again.',
        messageAr: 'فشل إعادة إرسال بريد التحقق. يرجى المحاولة مرة أخرى.',
        code: 'RESEND_VERIFICATION_FAILED'
      });
    }
  }

  async resendVerificationByToken(req, res) {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Verification token is required',
          messageAr: 'رمز التحقق مطلوب',
          code: 'TOKEN_MISSING'
        });
      }
      let user = await User.findOne({ emailVerificationToken: token });
      if (!user) {
        // Try decoded token
        let decodedToken = token;
        try {
          decodedToken = decodeURIComponent(token);
        } catch (e) {}
        user = await User.findOne({ emailVerificationToken: decodedToken });
      }
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Invalid verification token',
          messageAr: 'رابط التحقق غير صالح',
          code: 'INVALID_TOKEN'
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
      const newToken = user.generateEmailVerificationToken();
      
      // CRITICAL FIX: Use updateOne to ensure token is saved even if there are validation errors
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            emailVerificationToken: user.emailVerificationToken,
            emailVerificationTokenExpires: user.emailVerificationTokenExpires
          }
        }
      );
      
      const emailSent = await emailService.sendVerificationEmail(user, newToken);
      if (!emailSent) {
        return res.status(500).json({
          success: false,
          message: 'Failed to send verification email. Please try again.',
          messageAr: 'فشل إرسال بريد التحقق. يرجى المحاولة مرة أخرى.',
          code: 'EMAIL_SEND_FAILED'
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Verification email sent. Please check your email.',
        messageAr: 'تم إرسال بريد التحقق. يرجى التحقق من بريدك الإلكتروني.',
        email: user.email
      });
    } catch (error) {
      logger.error('Resend verification by token failed', { error: error.message });
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
      // Clear CSRF tokens for this user
      if (req.user?._id) {
        clearUserCSRFTokens(req.user._id);
      }

      // Clear authentication cookies for both main auth and matches system
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/'
      };

      // Clear main auth cookies
      res.clearCookie('accessToken', cookieOptions);
      res.clearCookie('refreshToken', cookieOptions);
      
      // Clear matches module cookie
      res.clearCookie('matches_token', cookieOptions);
      
      // Clear admin auth cookie if exists
      res.clearCookie('admin_session', cookieOptions);

      // Set cache prevention headers for logout response
      res.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate, no-cache');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
        messageAr: 'تم تسجيل الخروج بنجاح'
      });
    } catch (error) {
      logger.error('Logout error', {
        error: error.message,
        stack: error.stack,
        userId: req.user?._id,
        ip: req.ip
      });
      
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        messageAr: 'فشل تسجيل الخروج',
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

  // ==================== OTP VERIFICATION METHODS ====================

  /**
   * Send OTP for phone verification
   * @route POST /auth/send-otp
   */
  async sendOTP(req, res) {
    try {
      const { phone, email, type = 'registration', channel = 'sms' } = req.body;

      // Validate inputs
      if (!phone && !email) {
        return res.status(400).json({
          success: false,
          message: 'Phone number or email is required',
          messageAr: 'رقم الهاتف أو البريد الإلكتروني مطلوب',
          code: 'MISSING_CONTACT_INFO'
        });
      }

      if (phone && !phone.startsWith('+')) {
        return res.status(400).json({
          success: false,
          message: 'Phone number must be in international format (e.g., +966XXXXXXXXX)',
          messageAr: 'يجب أن يكون رقم الهاتف بالصيغة الدولية (مثال: +966XXXXXXXXX)',
          code: 'INVALID_PHONE_FORMAT'
        });
      }

      const validTypes = ['registration', 'password-reset', 'phone-verification', 'login'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP type',
          messageAr: 'نوع رمز التحقق غير صالح',
          code: 'INVALID_OTP_TYPE'
        });
      }

      const validChannels = ['sms', 'whatsapp', 'email'];
      if (!validChannels.includes(channel)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid channel. Must be sms, whatsapp, or email',
          messageAr: 'القناة غير صالحة. يجب أن تكون sms أو whatsapp أو email',
          code: 'INVALID_CHANNEL'
        });
      }

      const identifier = phone || email;
      const cooldownSeconds = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60;

      // Check cooldown
      const lastOTP = await OTP.getLastOTP(identifier, type);
      if (lastOTP && !lastOTP.canResend(cooldownSeconds)) {
        const waitTime = Math.ceil((cooldownSeconds * 1000 - (Date.now() - lastOTP.createdAt.getTime())) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitTime} seconds before requesting a new OTP`,
          messageAr: `يرجى الانتظار ${waitTime} ثانية قبل طلب رمز تحقق جديد`,
          code: 'OTP_COOLDOWN',
          waitTime
        });
      }

      // For registration type, check if phone is already registered
      if (type === 'registration' && phone) {
        const existingUser = await User.findOne({ phone, phoneVerified: true });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'This phone number is already registered and verified',
            messageAr: 'رقم الهاتف هذا مسجل ومفعّل مسبقاً',
            code: 'PHONE_ALREADY_REGISTERED'
          });
        }
      }

      // For password reset, check if phone exists
      if (type === 'password-reset' && phone) {
        const user = await User.findOne({ phone });
        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'No account found with this phone number',
            messageAr: 'لا يوجد حساب مرتبط بهذا الرقم',
            code: 'PHONE_NOT_FOUND'
          });
        }
      }

      // Generate OTP
      const otpCode = authenticaService.generateOTP(6);
      const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;

      // Send OTP via Authentica
      let sendResult;
      if (channel === 'email') {
        sendResult = await authenticaService.sendEmailOTP(email, { customOtp: otpCode });
      } else {
        sendResult = await authenticaService.sendOTP(phone, channel, { customOtp: otpCode });
      }

      if (!sendResult.success) {
        console.error('❌ [OTP] Failed to send OTP via Authentica:', sendResult.error);
        return res.status(500).json({
          success: false,
          message: sendResult.message || 'Failed to send OTP',
          messageAr: sendResult.messageAr || 'فشل في إرسال رمز التحقق',
          code: 'OTP_SEND_FAILED'
        });
      }

      // Save OTP record
      await OTP.createOTP({
        phone,
        email,
        otp: otpCode,
        type,
        channel,
        expiryMinutes,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      console.log(`📤 [OTP] OTP sent successfully via ${channel} to ${identifier.substring(0, 6)}****`);

      res.status(200).json({
        success: true,
        message: `OTP sent successfully via ${channel}`,
        messageAr: `تم إرسال رمز التحقق بنجاح عبر ${channel === 'sms' ? 'الرسائل القصيرة' : channel === 'whatsapp' ? 'واتساب' : 'البريد الإلكتروني'}`,
        expiresIn: expiryMinutes * 60, // in seconds
        channel
      });

    } catch (error) {
      console.error('❌ [OTP] Send OTP error:', error);
      logger.error('Send OTP failed', { error: error.message, stack: error.stack });

      res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.',
        messageAr: 'فشل في إرسال رمز التحقق. يرجى المحاولة مرة أخرى.',
        code: 'OTP_ERROR'
      });
    }
  }

  /**
   * Verify OTP code
   * @route POST /auth/verify-otp
   */
  async verifyOTP(req, res) {
    try {
      const { phone, email, otp, type = 'registration' } = req.body;

      // Validate inputs
      if (!phone && !email) {
        return res.status(400).json({
          success: false,
          message: 'Phone number or email is required',
          messageAr: 'رقم الهاتف أو البريد الإلكتروني مطلوب',
          code: 'MISSING_CONTACT_INFO'
        });
      }

      if (!otp) {
        return res.status(400).json({
          success: false,
          message: 'OTP code is required',
          messageAr: 'رمز التحقق مطلوب',
          code: 'MISSING_OTP'
        });
      }

      const identifier = phone || email;

      // Find valid OTP record
      const otpResult = await OTP.findValidOTP(identifier, otp, type);

      if (!otpResult) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP code',
          messageAr: 'رمز التحقق غير صالح أو منتهي الصلاحية',
          code: 'INVALID_OTP'
        });
      }

      if (otpResult.locked) {
        return res.status(429).json({
          success: false,
          message: 'Too many failed attempts. Please request a new OTP.',
          messageAr: 'تم تجاوز عدد المحاولات المسموح. يرجى طلب رمز تحقق جديد.',
          code: 'OTP_LOCKED'
        });
      }

      const otpRecord = otpResult.record;

      // Verify with Authentica API as well (double verification)
      const authenticaResult = await authenticaService.verifyOTP(phone, otp, email);
      
      if (!authenticaResult.success && !authenticaResult.verified) {
        // Increment attempt on failure
        await otpRecord.incrementAttempt();
        
        return res.status(400).json({
          success: false,
          message: authenticaResult.message || 'OTP verification failed',
          messageAr: authenticaResult.messageAr || 'فشل التحقق من الرمز',
          code: 'OTP_VERIFICATION_FAILED',
          attemptsRemaining: otpRecord.maxAttempts - otpRecord.attempts
        });
      }

      // Mark OTP as verified
      await otpRecord.markVerified();

      // Update user if this is for phone verification or registration
      if (phone && (type === 'phone-verification' || type === 'registration')) {
        const user = await User.findOne({ phone });
        if (user) {
          user.phoneVerified = true;
          await user.save();
          console.log(`✅ [OTP] Phone verified for user: ${user.email}`);
        }
      }

      console.log(`✅ [OTP] OTP verified successfully for ${identifier.substring(0, 6)}****`);

      res.status(200).json({
        success: true,
        verified: true,
        message: 'OTP verified successfully',
        messageAr: 'تم التحقق من الرمز بنجاح',
        type
      });

    } catch (error) {
      console.error('❌ [OTP] Verify OTP error:', error);
      logger.error('Verify OTP failed', { error: error.message, stack: error.stack });

      res.status(500).json({
        success: false,
        message: 'OTP verification failed. Please try again.',
        messageAr: 'فشل التحقق من الرمز. يرجى المحاولة مرة أخرى.',
        code: 'OTP_ERROR'
      });
    }
  }

  /**
   * Request password reset via OTP (phone-based)
   * @route POST /auth/forgot-password-otp
   */
  async forgotPasswordOTP(req, res) {
    try {
      const { phone, channel = 'sms' } = req.body;

      if (!phone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required',
          messageAr: 'رقم الهاتف مطلوب',
          code: 'MISSING_PHONE'
        });
      }

      if (!phone.startsWith('+')) {
        return res.status(400).json({
          success: false,
          message: 'Phone number must be in international format (e.g., +966XXXXXXXXX)',
          messageAr: 'يجب أن يكون رقم الهاتف بالصيغة الدولية (مثال: +966XXXXXXXXX)',
          code: 'INVALID_PHONE_FORMAT'
        });
      }

      // Find user by phone
      const user = await User.findOne({ phone });
      if (!user) {
        // Don't reveal if phone exists or not for security
        return res.status(200).json({
          success: true,
          message: 'If this phone number is registered, you will receive an OTP',
          messageAr: 'إذا كان هذا الرقم مسجلاً، ستصلك رسالة تحتوي على رمز التحقق'
        });
      }

      // Check cooldown
      const cooldownSeconds = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60;
      const lastOTP = await OTP.getLastOTP(phone, 'password-reset');
      if (lastOTP && !lastOTP.canResend(cooldownSeconds)) {
        const waitTime = Math.ceil((cooldownSeconds * 1000 - (Date.now() - lastOTP.createdAt.getTime())) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitTime} seconds before requesting a new OTP`,
          messageAr: `يرجى الانتظار ${waitTime} ثانية قبل طلب رمز تحقق جديد`,
          code: 'OTP_COOLDOWN',
          waitTime
        });
      }

      // Generate and send OTP
      const otpCode = authenticaService.generateOTP(6);
      const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;

      const sendResult = await authenticaService.sendOTP(phone, channel, { customOtp: otpCode });

      if (!sendResult.success) {
        console.error('❌ [OTP] Failed to send password reset OTP:', sendResult.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP. Please try again.',
          messageAr: 'فشل في إرسال رمز التحقق. يرجى المحاولة مرة أخرى.',
          code: 'OTP_SEND_FAILED'
        });
      }

      // Save OTP record
      await OTP.createOTP({
        userId: user._id,
        phone,
        otp: otpCode,
        type: 'password-reset',
        channel,
        expiryMinutes,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      console.log(`📤 [OTP] Password reset OTP sent to ${phone.substring(0, 6)}****`);

      res.status(200).json({
        success: true,
        message: `Password reset OTP sent via ${channel}`,
        messageAr: `تم إرسال رمز استعادة كلمة المرور عبر ${channel === 'sms' ? 'الرسائل القصيرة' : 'واتساب'}`,
        expiresIn: expiryMinutes * 60
      });

    } catch (error) {
      console.error('❌ [OTP] Forgot password OTP error:', error);
      logger.error('Forgot password OTP failed', { error: error.message, stack: error.stack });

      res.status(500).json({
        success: false,
        message: 'Failed to process request. Please try again.',
        messageAr: 'فشل في معالجة الطلب. يرجى المحاولة مرة أخرى.',
        code: 'REQUEST_FAILED'
      });
    }
  }

  /**
   * Reset password using OTP (phone-based)
   * @route POST /auth/reset-password-otp
   */
  async resetPasswordOTP(req, res) {
    try {
      const { phone, otp, newPassword } = req.body;

      if (!phone || !otp || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Phone, OTP, and new password are required',
          messageAr: 'رقم الهاتف ورمز التحقق وكلمة المرور الجديدة مطلوبة',
          code: 'MISSING_FIELDS'
        });
      }

      // Validate password strength
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long',
          messageAr: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل',
          code: 'WEAK_PASSWORD'
        });
      }

      // Verify OTP
      const otpResult = await OTP.findValidOTP(phone, otp, 'password-reset');

      if (!otpResult) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP code',
          messageAr: 'رمز التحقق غير صالح أو منتهي الصلاحية',
          code: 'INVALID_OTP'
        });
      }

      if (otpResult.locked) {
        return res.status(429).json({
          success: false,
          message: 'Too many failed attempts. Please request a new OTP.',
          messageAr: 'تم تجاوز عدد المحاولات المسموح. يرجى طلب رمز تحقق جديد.',
          code: 'OTP_LOCKED'
        });
      }

      const otpRecord = otpResult.record;

      // Verify with Authentica
      const authenticaResult = await authenticaService.verifyOTP(phone, otp);
      
      if (!authenticaResult.success && !authenticaResult.verified) {
        await otpRecord.incrementAttempt();
        
        return res.status(400).json({
          success: false,
          message: 'OTP verification failed',
          messageAr: 'فشل التحقق من الرمز',
          code: 'OTP_VERIFICATION_FAILED',
          attemptsRemaining: otpRecord.maxAttempts - otpRecord.attempts
        });
      }

      // Find user and update password
      const user = await User.findOne({ phone });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          messageAr: 'المستخدم غير موجود',
          code: 'USER_NOT_FOUND'
        });
      }

      // Update password
      user.password = newPassword;
      user.phoneVerified = true; // Also verify phone since they just proved ownership
      await user.save();

      // Mark OTP as verified/used
      await otpRecord.markVerified();

      // Clear any existing sessions
      await clearUserCSRFTokens(user._id.toString());

      console.log(`✅ [OTP] Password reset successful for ${user.email}`);

      res.status(200).json({
        success: true,
        message: 'Password reset successfully. You can now login with your new password.',
        messageAr: 'تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.'
      });

    } catch (error) {
      console.error('❌ [OTP] Reset password OTP error:', error);
      logger.error('Reset password OTP failed', { error: error.message, stack: error.stack });

      res.status(500).json({
        success: false,
        message: 'Failed to reset password. Please try again.',
        messageAr: 'فشل في تغيير كلمة المرور. يرجى المحاولة مرة أخرى.',
        code: 'RESET_FAILED'
      });
    }
  }

  /**
   * Get Authentica balance (admin only)
   * @route GET /auth/otp-balance
   */
  async getOTPBalance(req, res) {
    try {
      const result = await authenticaService.getBalance();
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch OTP balance',
          messageAr: 'فشل في جلب رصيد OTP',
          error: result.error
        });
      }

      res.status(200).json({
        success: true,
        balance: result.balance,
        data: result.data
      });

    } catch (error) {
      console.error('❌ [OTP] Get balance error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch balance',
        messageAr: 'فشل في جلب الرصيد'
      });
    }
  }
}

module.exports = new AuthController();
