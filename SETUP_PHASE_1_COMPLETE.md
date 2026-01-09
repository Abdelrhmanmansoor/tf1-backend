# Phase 1: Environment & Database Setup - Complete Guide

## ✅ What We've Completed So Far:

1. ✅ Installed all required dependencies:
   - Prisma 5.17.0 (ORM)
   - @prisma/client (Prisma client library)
   - NestJS JWT & Passport
   - Zod (validation)
   - Puppeteer (PDF generation)
   - Handlebars (templating)

2. ✅ Created project structure:
   - `prisma/schema.prisma` - Database schema
   - `src/cv/` - CV module directory
   - `src/cv/templates/` - Template services
   - `src/cv/parsers/` - Parser implementations
   - `src/cv/services/` - Business logic services

3. ✅ Created configuration files:
   - `.env.cv-local` - CV system environment variables
   - `.env.postgres` - PostgreSQL setup instructions
   - `docker-compose.cv.yml` - Docker setup for PostgreSQL
   - `prisma/.env` - Prisma configuration
   - `init.sql` - Database initialization script
   - Prisma Client generated successfully

## 🔧 Next Steps: Setting Up PostgreSQL

### Option 1: Using Docker (Recommended)

```bash
# 1. Start PostgreSQL and PgAdmin with Docker
docker-compose -f docker-compose.cv.yml up -d

# 2. Verify containers are running
docker ps | grep sportsplatform_cv

# 3. Access PgAdmin
# URL: http://localhost:5050
# Email: admin@sportsplatform.local
# Password: admin

# 4. Create database connection in PgAdmin:
# Host: postgres
# Port: 5432
# Username: postgres
# Password: postgres
# Database: sportsplatform_cv
```

### Option 2: Local PostgreSQL Installation

#### Windows:
```bash
# 1. Install PostgreSQL from https://www.postgresql.org/download/windows/

# 2. After installation, open pgAdmin or command prompt

# 3. Create database:
createdb -U postgres sportsplatform_cv

# 4. Create user (optional):
psql -U postgres -c "CREATE USER sportuser WITH PASSWORD 'your_password';"

# 5. Grant privileges:
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE sportsplatform_cv TO sportuser;"
```

#### macOS:
```bash
# 1. Install PostgreSQL
brew install postgresql

# 2. Start PostgreSQL service
brew services start postgresql

# 3. Create database
createdb sportsplatform_cv

# 4. Verify connection
psql -d sportsplatform_cv
```

#### Linux:
```bash
# 1. Install PostgreSQL
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# 2. Start PostgreSQL
sudo systemctl start postgresql

# 3. Create database
sudo -u postgres createdb sportsplatform_cv

# 4. Create user
sudo -u postgres psql -c "CREATE USER sportuser WITH PASSWORD 'your_password';"

# 5. Grant privileges
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sportsplatform_cv TO sportuser;"
```

## ✅ Verify Database Connection

### Using psql:
```bash
# Connect to database
psql -U postgres -d sportsplatform_cv

# If successful, you should see the PostgreSQL prompt:
# sportsplatform_cv=#

# Exit with:
# \q
```

### Using Prisma CLI:
```bash
# Update your .env or prisma/.env with correct DATABASE_URL:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sportsplatform_cv?schema=public"

# Test connection
npx prisma db push --skip-generate
```

## 📝 Update Environment Variables

### 1. Copy .env.cv-local to main .env:
```bash
# Edit your main .env file and add:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sportsplatform_cv?schema=public"
CV_SYSTEM_ENABLED=true
CV_UPLOADS_DIR=./uploads/cvs
CV_EXPORTS_DIR=./uploads/exports
CV_MAX_FILE_SIZE=10485760
PDF_RENDER_TIMEOUT=30000
ANALYTICS_ENABLED=true
ENABLE_CV_AI_FEATURES=true
ENABLE_CV_PUBLIC_PROFILES=true
ENABLE_CV_IMPORT=true
ENABLE_CV_VERSIONING=true
STORAGE_TYPE=local
LOCAL_STORAGE_PATH=./uploads
```

### 2. Verify DATABASE_URL is set:
```bash
# Check if .env has DATABASE_URL
echo %DATABASE_URL%  # Windows
echo $DATABASE_URL  # macOS/Linux
```

## 🗄️ Run Database Migrations

### First Time Setup:
```bash
# This creates all tables and indexes
npx prisma migrate dev --name init_cv_system

# Answer "Yes" when asked if you want to create the migration
```

### What This Does:
- ✅ Creates all CV system tables (User, CV, CVVersion, CVExport, etc.)
- ✅ Creates all indexes for performance
- ✅ Runs the init.sql script to populate initial data
- ✅ Generates updated Prisma Client

### After Migration:
```bash
# Verify tables were created
npx prisma studio

# This opens a web interface to view/edit your database
# You should see tables like: User, CV, CVVersion, CVExport, etc.
```

## ✅ Verify Setup

### Check Prisma Studio:
```bash
npx prisma studio
# Open http://localhost:5555 in your browser
# You should see all CV system tables and sample data
```

### Check Database Tables:
```bash
psql -U postgres -d sportsplatform_cv -c "\dt"
# Should list all CV tables
```

### Test Connection from Node.js:
Create a test file `test-db.js`:
```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('✅ Connected to database!');
  console.log(`Found ${users.length} users`);
}

main()
  .catch(e => console.error('❌ Connection failed:', e))
  .finally(async () => await prisma.$disconnect());
```

Then run:
```bash
node test-db.js
```

## 📊 Database Structure

Your database now has:

### Core Tables:
- **User** - User accounts (existing + CV users)
- **CV** - Resume/CV records
- **CVVersion** - Version history for each CV
- **CVExport** - Export history (PDF, HTML, JSON, etc.)

### Configuration Tables:
- **Template** - Resume templates (9+ templates)
- **ColorScheme** - Color schemes for templates
- **ParserConfig** - Parser configurations

### Analytics Tables:
- **CVAnalytics** - View statistics and tracking
- **ActivityLog** - User activity tracking

### Settings Tables:
- **FeatureFlag** - Feature toggles
- **SystemSetting** - System configuration

### Related Tables:
- **CVImport** - Import history tracking

## 🔐 Important Notes

### Security:
- Change default passwords in production
- Use environment variables for credentials
- Never commit .env files to git
- Use strong passwords for PostgreSQL users

### Backup:
```bash
# Create database backup
pg_dump -U postgres sportsplatform_cv > backup.sql

# Restore from backup
psql -U postgres sportsplatform_cv < backup.sql
```

### Troubleshooting:

**Error: "Cannot find module '@prisma/client'"**
```bash
npm install @prisma/client
npx prisma generate
```

**Error: "connect ECONNREFUSED"**
- Make sure PostgreSQL is running
- Check DATABASE_URL in .env
- Verify credentials are correct

**Error: "password authentication failed"**
- Check PostgreSQL password in DATABASE_URL
- Reset PostgreSQL password if needed

**Error: "database sportsplatform_cv does not exist"**
```bash
# Create database
createdb -U postgres sportsplatform_cv
```

## 📦 What's Included in the Schema

### Tables: 15 total
- User (core)
- CV (main resume table)
- CVVersion (history)
- CVExport (exports)
- Template (templates)
- ColorScheme (styling)
- ParserConfig (parsers)
- CVImport (imports)
- CVAnalytics (analytics)
- ActivityLog (logging)
- FeatureFlag (feature toggles)
- SystemSetting (settings)
- And more...

### Indexes: 30+ for performance optimization
- Primary keys on all tables
- Foreign key indexes for relationships
- Indexes on frequently queried fields
- Composite indexes for complex queries

## 🎯 Next: Phase 2 - Template System Integration

After database setup is complete:
1. Database is fully operational
2. All tables created and indexed
3. Prisma Client ready for use

Next phase will involve:
- Creating Template Service classes
- Implementing LaTeX template rendering
- Creating HTML template handlers
- Building template registry system

## ⏱️ Time Estimate

- Docker setup: 5 minutes
- Local PostgreSQL: 10-15 minutes
- Database migrations: 2 minutes
- Verification: 5 minutes
- **Total: 15-25 minutes**

## ✨ You're Ready!

Once PostgreSQL is running and migrations complete:
✅ Database is ready
✅ All tables created
✅ Prisma Client configured
✅ Ready for Phase 2: Templates

---

**Status**: ✅ Phase 1 Setup Complete
**Next**: Start PostgreSQL and run migrations
**Guide**: See "Run Database Migrations" section above
