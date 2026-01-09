# CV Builder Configuration for tf1one.com

## Environment Variables

### Frontend Configuration (.env.local)

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://api.tf1one.com/api/v1
NEXT_PUBLIC_FRONTEND_URL=https://www.tf1one.com

# CV Builder Configuration
NEXT_PUBLIC_CV_BUILDER_ENABLED=true
NEXT_PUBLIC_CV_BUILDER_PATH=/jobs/cv-builder
NEXT_PUBLIC_CV_MAX_FILE_SIZE=10485760  # 10MB

# Features
NEXT_PUBLIC_ENABLE_CV_IMPORT=true
NEXT_PUBLIC_ENABLE_CV_EXPORT=true
NEXT_PUBLIC_ENABLE_CV_SHARING=true
NEXT_PUBLIC_ENABLE_CV_TEMPLATES=true
NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCH=true

# Authentication
NEXT_PUBLIC_AUTH_PROVIDER=jwt
NEXT_PUBLIC_AUTH_TOKEN_NAME=authToken

# Analytics
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

### Backend Configuration (.env.cv-local)

```env
# Database
DATABASE_URL=postgresql://user:password@db.tf1one.com:5432/cv_system_prod

# Server
PORT=3001
NODE_ENV=production

# JWT
JWT_SECRET=your-very-secure-secret-key-min-32-chars
JWT_EXPIRATION=7d

# API
API_URL=https://api.tf1one.com
FRONTEND_URL=https://www.tf1one.com

# CORS
CORS_ORIGIN=https://www.tf1one.com,https://api.tf1one.com

# File Upload
UPLOAD_DIR=/data/uploads
MAX_FILE_SIZE=10485760  # 10MB

# Email (if enabled)
SMTP_HOST=mail.tf1one.com
SMTP_PORT=587
SMTP_USER=noreply@tf1one.com
SMTP_PASSWORD=password
SMTP_FROM=CV Builder <noreply@tf1one.com>

# Logging
LOG_LEVEL=info
LOG_DIR=/logs

# Redis (for caching)
REDIS_URL=redis://localhost:6379

# PDF Generation
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

---

## Nginx Configuration

### Reverse Proxy Setup

```nginx
upstream cv_api {
    server api-backend:3001;
}

server {
    listen 443 ssl http2;
    server_name www.tf1one.com;

    ssl_certificate /etc/letsencrypt/live/tf1one.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tf1one.com/privkey.pem;

    # API routing
    location /api/v1/cv/ {
        proxy_pass http://cv_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_request_buffering off;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        
        # Timeouts for long-running operations like PDF generation
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Frontend routing
    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://frontend:3000;
        proxy_cache_valid 200 30d;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # File uploads
    location /uploads/ {
        alias /data/uploads/;
        expires 30d;
        add_header Cache-Control "public";
    }
}

# HTTP redirect to HTTPS
server {
    listen 80;
    server_name www.tf1one.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Docker Compose Setup

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: cv_user
      POSTGRES_PASSWORD: secure_password
      POSTGRES_DB: cv_system_prod
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cv_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./tf1-backend
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://cv_user:secure_password@postgres:5432/cv_system_prod
      REDIS_URL: redis://redis:6379
      NODE_ENV: production
      JWT_SECRET: ${JWT_SECRET}
      API_URL: https://api.tf1one.com
      FRONTEND_URL: https://www.tf1one.com
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    restart: always

  frontend:
    build: ./tf1-frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: https://api.tf1one.com/api/v1
      NEXT_PUBLIC_FRONTEND_URL: https://www.tf1one.com
    depends_on:
      - backend
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - /etc/letsencrypt:/etc/letsencrypt
    depends_on:
      - backend
      - frontend
    restart: always

volumes:
  postgres_data:
  redis_data:
```

---

## Database Backup

### Automated Backup Script

```bash
#!/bin/bash

# Backup PostgreSQL database
BACKUP_DIR="/data/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="cv_system_db_$DATE.sql.gz"

mkdir -p $BACKUP_DIR

pg_dump postgresql://cv_user:password@localhost:5432/cv_system_prod | \
  gzip > $BACKUP_DIR/$FILENAME

# Keep only last 30 days of backups
find $BACKUP_DIR -name "cv_system_db_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $FILENAME"
```

---

## Monitoring

### Health Check Endpoint

```
GET /api/health

Response:
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "uptime": 3600,
  "timestamp": "2024-01-09T12:00:00Z"
}
```

### Logging

All logs are written to `/logs` directory:
- `backend.log` - Backend application logs
- `access.log` - API access logs
- `error.log` - Error logs
- `cv_builder.log` - CV Builder specific logs

---

## Performance Tuning

### Database Optimization

```sql
-- Create indexes
CREATE INDEX idx_cv_user_id ON cv(user_id);
CREATE INDEX idx_cv_created_at ON cv(created_at);
CREATE INDEX idx_cv_template_id ON cv(template_id);
CREATE INDEX idx_personal_info_cv_id ON personal_info(cv_id);

-- Enable query analysis
ANALYZE;

-- Vacuum tables
VACUUM ANALYZE;
```

### Cache Configuration

```typescript
// Redis cache settings
const cacheSettings = {
  templateCache: 3600,      // 1 hour
  parserCache: 1800,         // 30 minutes
  userCVsCache: 300,        // 5 minutes
  publicProfileCache: 7200  // 2 hours
};
```

---

## Security

### SSL/TLS Certificate

```bash
# Using Let's Encrypt
certbot certonly --nginx -d tf1one.com -d www.tf1one.com

# Renewal (automatic with Certbot)
certbot renew --quiet
```

### Firewall Rules

```bash
# Allow necessary ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 5432/tcp  # PostgreSQL (internal only)
ufw allow 6379/tcp  # Redis (internal only)

# Enable firewall
ufw enable
```

### API Rate Limiting

```typescript
// Rate limit configuration
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // 100 requests per window
  message: 'Too many requests, please try again later'
};
```

---

## Maintenance

### Regular Tasks

```bash
# Weekly
- Review error logs
- Check database size
- Monitor disk space
- Update packages

# Monthly
- Run security scans
- Optimize database
- Review backups
- Update SSL certificate

# Quarterly
- Performance audit
- Security audit
- Database maintenance
- Update dependencies
```

---

## Troubleshooting

### Common Issues

1. **API not responding**
   - Check backend service: `docker-compose logs backend`
   - Check database connection: `docker exec postgres pg_isready`
   - Check network: `curl http://localhost:3001/api/health`

2. **Frontend errors**
   - Check environment variables: `env | grep NEXT_PUBLIC`
   - Check logs: `docker-compose logs frontend`
   - Clear cache: `rm -rf .next`

3. **Database issues**
   - Check disk space: `df -h`
   - Check connections: `psql -c "SELECT * FROM pg_stat_activity;"`
   - Run backups: `./backup.sh`

---

**Configuration Version**: 1.0  
**Last Updated**: January 9, 2026  
**Status**: Production Ready ✅
