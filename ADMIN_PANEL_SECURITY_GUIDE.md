# 🔐 Admin Panel Security Guide - Banking-Level Security

## Overview
This guide documents all security measures implemented in the System Admin Panel to achieve banking-level security.

## 🔑 Admin Key Management

### Test Key (Development Only)
```
sk_admin_2a2097d2dbf949c50e3a5f2eaa231e81c4f5d2fb1128443165a6198201b758eb
```

**⚠️ WARNING:** This key is for development only. Never use in production!

### Creating Production Admin Keys
1. Use the admin key generation endpoint
2. Store keys securely (environment variables, secret manager)
3. Never commit keys to version control
4. Rotate keys regularly

## 🛡️ Security Features Implemented

### 1. Authentication & Authorization
- ✅ Admin Key Authentication (SHA-256 hashed)
- ✅ Permission-based access control
- ✅ IP Whitelisting (optional, configurable)
- ✅ Session management with secure cookies

### 2. Rate Limiting
- ✅ **Brute Force Protection**: 5 attempts per 15 minutes
- ✅ **API Rate Limiting**: 100 requests per minute
- ✅ **Strict Rate Limiting**: 10 requests per minute for sensitive operations

### 3. Security Headers
- ✅ Content Security Policy (CSP)
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ X-XSS-Protection: 1; mode=block
- ✅ Referrer-Policy: strict-origin-when-cross-origin
- ✅ HSTS (in production with HTTPS)

### 4. Input Validation
- ✅ NoSQL Injection prevention
- ✅ XSS prevention
- ✅ MongoDB operator filtering
- ✅ Input sanitization

### 5. Audit Logging
- ✅ All admin actions logged
- ✅ IP address tracking
- ✅ User agent tracking
- ✅ Timestamp for all operations
- ✅ Before/after state tracking

### 6. Network Security
- ✅ CORS configuration
- ✅ HTTPS enforcement (production)
- ✅ Secure cookie flags (HttpOnly, Secure, SameSite)

## 🔧 Configuration

### Environment Variables

```bash
# IP Whitelisting (optional)
ENABLE_IP_WHITELIST=true
ADMIN_ALLOWED_IPS=192.168.1.100,10.0.0.0/24

# CORS Origins
ALLOWED_ORIGINS=https://www.tf1one.com,https://tf1one.com

# Node Environment
NODE_ENV=production
```

### IP Whitelisting
To enable IP whitelisting:
1. Set `ENABLE_IP_WHITELIST=true`
2. Add allowed IPs to `ADMIN_ALLOWED_IPS` (comma-separated)
3. Supports CIDR notation (e.g., `192.168.1.0/24`)

## 📊 Monitoring & Alerts

### What's Logged
- All login attempts (successful and failed)
- All admin actions
- IP addresses
- User agents
- Timestamps
- Request paths
- Response status codes

### Security Events to Monitor
- Failed login attempts
- Rate limit violations
- IP whitelist violations
- Unauthorized access attempts
- Sensitive operation access

## 🚨 Incident Response

### If Admin Key is Compromised
1. Immediately revoke the compromised key
2. Generate a new admin key
3. Review audit logs for unauthorized access
4. Change all related credentials
5. Notify security team

### If Brute Force Attack Detected
1. System automatically locks account after 5 failed attempts
2. Review IP addresses in logs
3. Consider adding attacker IPs to firewall blocklist
4. Monitor for continued attacks

## ✅ Security Checklist

- [ ] Admin keys stored securely (not in code)
- [ ] IP whitelisting enabled (if applicable)
- [ ] Rate limiting configured
- [ ] Security headers enabled
- [ ] HTTPS enforced in production
- [ ] Audit logging active
- [ ] Regular security audits scheduled
- [ ] Backup and recovery plan in place
- [ ] Incident response plan documented

## 🔄 Best Practices

1. **Regular Key Rotation**: Rotate admin keys every 90 days
2. **Least Privilege**: Grant minimum required permissions
3. **Monitor Logs**: Review audit logs daily
4. **Update Dependencies**: Keep all packages updated
5. **Penetration Testing**: Conduct regular security audits
6. **Backup Strategy**: Maintain encrypted backups

## 📞 Support

For security issues, contact the security team immediately.

