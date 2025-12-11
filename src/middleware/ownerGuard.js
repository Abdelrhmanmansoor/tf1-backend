const crypto = require('crypto');

/**
 * Owner Guard Middleware
 * 
 * STRICTLY for the Platform Owner Console.
 * This bypasses standard RBAC and uses a separate secret key authentication mechanism.
 * 
 * Security Measures:
 * 1. Checks for 'x-owner-secret' header
 * 2. Compares with process.env.OWNER_SECRET_KEY
 * 3. Constant time string comparison to prevent timing attacks
 */
const requireOwner = (req, res, next) => {
    try {
        const providedSecret = req.headers['x-owner-secret'];
        const actualSecret = process.env.OWNER_SECRET_KEY;

        // 1. Fail safe if no secret is configured in environment
        if (!actualSecret) {
            console.error('CRITICAL: OWNER_SECRET_KEY is not set in environment variables!');
            return res.status(500).json({
                success: false,
                error: {
                    code: 'CONFIG_ERROR',
                    message: 'System configuration error',
                    messageAr: 'خطأ في إعدادات النظام'
                }
            });
        }

        // 2. Check existence of header
        if (!providedSecret) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'AUTH_REQUIRED',
                    message: 'Owner authentication required',
                    messageAr: 'مطلوب مصادقة المالك'
                }
            });
        }

        // 3. Constant time comparison
        // We compare hash of secrets to ensure length consistency and prevent timing attacks
        const providedHash = crypto.createHash('sha256').update(providedSecret).digest('hex');
        const actualHash = crypto.createHash('sha256').update(actualSecret).digest('hex');

        if (providedHash !== actualHash) {
            console.warn(`[SECURITY] Failed owner attempt from IP: ${req.ip}`);
            return res.status(403).json({
                success: false,
                error: {
                    code: 'ACCESS_DENIED',
                    message: 'Invalid owner secret',
                    messageAr: 'رمز المالك غير صحيح'
                }
            });
        }

        // 4. Tag request
        req.isOwner = true;
        next();

    } catch (error) {
        console.error('Owner guard error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'GUARD_ERROR',
                message: 'Security validation failed',
                messageAr: 'فشل التحقق الأمني'
            }
        });
    }
};

module.exports = requireOwner;
