# Matches System Environment Variables

## Required Environment Variables

Add these to your `.env` file in the root directory:

### Matches System JWT Authentication
```env
# Secret key for JWT token signing (CHANGE IN PRODUCTION!)
MATCHES_JWT_SECRET=your-secret-key-change-in-production-very-secure-string

# JWT token expiration (default: 7d)
# Examples: 1h, 24h, 7d, 30d
MATCHES_JWT_EXPIRES_IN=7d
```

### MongoDB Connection
The matches system uses the same MongoDB instance as the main platform:
```env
# MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/sportsplatform

# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sportsplatform
```

## Optional Environment Variables

### Rate Limiting
```env
# Rate limit window in milliseconds (default: 900000 = 15 minutes)
RATE_LIMIT_WINDOW_MS=900000

# Maximum requests per window (default: 100)
RATE_LIMIT_MAX_REQUESTS=100
```

### Server Configuration
```env
# Server port (default: 4000)
PORT=4000

# Node environment
NODE_ENV=development

# API version (default: v1)
API_VERSION=v1
```

### CORS Configuration
```env
# Allowed origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend-domain.com
```

## Complete Example .env File

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/sportsplatform

# Matches System
MATCHES_JWT_SECRET=super-secret-key-change-this-in-production
MATCHES_JWT_EXPIRES_IN=7d

# Server
PORT=4000
NODE_ENV=development
API_VERSION=v1

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Security Notes

1. **MATCHES_JWT_SECRET**: 
   - MUST be changed in production
   - Should be at least 32 characters long
   - Use a random string generator: `openssl rand -base64 32`
   - Never commit the secret to version control

2. **MONGODB_URI**: 
   - Protect your MongoDB credentials
   - Use environment-specific connection strings
   - Enable MongoDB authentication in production

3. **CORS**: 
   - Configure ALLOWED_ORIGINS to match your frontend domains
   - Never use `*` in production

## Testing Configuration

For local development and testing:

```env
MONGODB_URI=mongodb://localhost:27017/sportsplatform_test
MATCHES_JWT_SECRET=test-secret-not-for-production
MATCHES_JWT_EXPIRES_IN=1h
NODE_ENV=development
```

## Production Configuration

For production deployment:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sportsplatform
MATCHES_JWT_SECRET=<generated-secure-random-string>
MATCHES_JWT_EXPIRES_IN=7d
NODE_ENV=production
PORT=4000
ALLOWED_ORIGINS=https://your-production-domain.com
RATE_LIMIT_MAX_REQUESTS=50
```

## Verifying Configuration

To verify your environment is properly configured:

1. Start the server:
   ```bash
   npm start
   ```

2. Check the server logs for:
   - ✅ MongoDB Connected Successfully
   - ✅ SERVER RUNNING

3. Test the health endpoint:
   ```bash
   curl http://localhost:4000/health
   ```

4. Test matches authentication:
   ```bash
   curl -X POST http://localhost:4000/matches/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123","display_name":"Test User"}'
   ```

## Troubleshooting

### MongoDB Connection Failed
- Ensure MongoDB is running: `mongod --version`
- Check MONGODB_URI is correct
- Verify MongoDB authentication credentials
- Check firewall/network settings

### JWT Token Errors
- Verify MATCHES_JWT_SECRET is set
- Check token expiration settings
- Ensure tokens are properly formatted in Authorization header

### CORS Errors
- Add your frontend URL to ALLOWED_ORIGINS
- Ensure credentials are properly configured
- Check browser console for specific CORS errors
