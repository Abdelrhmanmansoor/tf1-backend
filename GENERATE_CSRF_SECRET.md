# Generate CSRF_SECRET

## Quick Command

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Or using OpenSSL

```bash
openssl rand -hex 32
```

## Generated Secret (Example - CHANGE THIS!)

```
CSRF_SECRET=8dee2e32365bb6905f89cc2debaedad9f4a5e61400957ddc048d5a15d6f08a4e
```

## Add to .env file

1. Copy the generated secret
2. Open `tf1-backend/.env` file
3. Add this line:

```bash
CSRF_SECRET=8dee2e32365bb6905f89cc2debaedad9f4a5e61400957ddc048d5a15d6f08a4e
```

4. Save the file
5. Restart the server

## Important Notes

- ⚠️ **CRITICAL:** This secret must be the SAME across all server instances
- 🔒 **Never commit** the actual `.env` file to git (only `.env.example`)
- 📝 Use a different secret for production than development
- ✅ Minimum 64 characters (32 bytes = 64 hex characters)
