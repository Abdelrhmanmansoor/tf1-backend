# Environment Variables Guide

This document lists all environment variables used in the Sports Platform Backend.

## Quick Start

1. Copy the template below to create your `.env` file
2. Fill in your actual values
3. **NEVER commit `.env` file to version control!**

## Required Environment Variables

### Server Configuration
```env
NODE_ENV=development
PORT=4000
API_VERSION=v1
FRONTEND_URL=http://localhost:3000
```

### Database
```env
MONGODB_URI=mongodb://localhost:27017/sportsplatform
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sportsplatform
```

### JWT Authentication (CRITICAL - Generate new secrets!)
```env
# Generate secrets using:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_ACCESS_SECRET=your_access_secret_here_minimum_32_characters
JWT_REFRESH_SECRET=your_refresh_secret_here_minimum_32_characters
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
```

## Optional Environment Variables

### Email Configuration
```env
# Option 1: SendGrid (Recommended)
SENDGRID_API_KEY=your_sendgrid_api_key

# Option 2: SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM_EMAIL=noreply@sportsplatform.com
SMTP_FROM_NAME=Sports Platform
```

### CORS
```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000
```

### Rate Limiting
```env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Logging
```env
LOG_LEVEL=info
```

### Matches System
```env
MATCHES_JWT_SECRET=your_matches_secret
MATCHES_JWT_EXPIRES_IN=7d
```

### Cloudinary (File Storage)
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### AI Services
```env
AI_API_KEY=your_openai_api_key
AI_PROVIDER=openai
```

### Redis (Optional)
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### AWS S3 (Optional)
```env
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your_bucket_name
```

## Security Notes

1. **JWT secrets MUST be at least 32 characters long**
2. Use strong, random secrets in production
3. Never commit `.env` file to version control
4. Rotate all secrets if they were ever exposed
5. Use environment-specific values for production
6. Consider using secret management services (AWS Secrets Manager, HashiCorp Vault)

## Generating Secrets

```bash
# Generate JWT secrets
node -e "console.log('JWT_ACCESS_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

## Complete Example

```env
# Server
NODE_ENV=development
PORT=4000
API_VERSION=v1
FRONTEND_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/sportsplatform

# JWT
JWT_ACCESS_SECRET=your_generated_secret_here
JWT_REFRESH_SECRET=your_generated_secret_here
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

