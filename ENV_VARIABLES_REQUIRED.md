# Environment Variables Configuration

## Required Environment Variables for Sports Platform Backend

Create a `.env` file in the root directory of `tf1-backend` with the following variables:

```env
# ==============================================
# APPLICATION CONFIGURATION
# ==============================================
NODE_ENV=development
PORT=4000
API_VERSION=v1

# ==============================================
# DATABASE CONFIGURATION
# ==============================================
MONGODB_URI=mongodb://localhost:27017/sportsplatform
DB_NAME=sportsplatform

# ==============================================
# JWT SECRETS & EXPIRATION
# ==============================================
# Main Platform JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-change-this
JWT_REFRESH_EXPIRES_IN=30d

# Matches System JWT (isolated)
MATCHES_JWT_SECRET=your-matches-system-secret-key-change-this
MATCHES_JWT_EXPIRES_IN=7d

# ==============================================
# EMAIL CONFIGURATION (SMTP)
# ==============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM_EMAIL=noreply@sportsplatform.com
SMTP_FROM_NAME=Sports Platform

# ==============================================
# FRONTEND URLs
# ==============================================
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000,http://localhost:5173

# ==============================================
# CLOUDINARY CONFIGURATION (for image uploads)
# ==============================================
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# ==============================================
# REDIS CONFIGURATION (for caching)
# ==============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# ==============================================
# RATE LIMITING
# ==============================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ==============================================
# OPENAI CONFIGURATION (for CV AI features)
# ==============================================
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=1000

# ==============================================
# ADMIN PANEL CONFIGURATION
# ==============================================
ADMIN_API_KEY=your-secure-admin-api-key-change-this
SUPER_ADMIN_EMAIL=admin@sportsplatform.com
SUPER_ADMIN_PASSWORD=change-this-secure-password
```

## Important Notes

1. **Never commit `.env` file to version control**
2. **Change all default passwords and secrets in production**
3. **Use strong, randomly generated secrets for JWT tokens**
4. **Configure SMTP properly for email functionality**
5. **Set up Redis for caching (optional but recommended)**

## Quick Setup

Copy the template above into a new file named `.env` in the `tf1-backend` directory:

```bash
cd tf1-backend
nano .env
# or
code .env
```

Then update all values marked with `your-` prefix with your actual credentials.


