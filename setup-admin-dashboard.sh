#!/bin/bash

# Quick Start Guide for Admin Dashboard
# ======================================

echo "🚀 Admin Dashboard - Quick Start Setup"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Node.js
echo "${YELLOW}📋 Checking requirements...${NC}"
if ! command -v node &> /dev/null; then
    echo "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi
echo "${GREEN}✓ Node.js ${NC}$(node --version)"

# Check MongoDB
if ! command -v mongod &> /dev/null; then
    echo "${YELLOW}⚠️  MongoDB is not installed locally (you can use MongoDB Atlas)${NC}"
fi

# Install dependencies
echo ""
echo "${YELLOW}📦 Installing dependencies...${NC}"
npm install \
  mongoose \
  express \
  jsonwebtoken \
  bcryptjs \
  multer \
  xss \
  ua-parser-js \
  cron \
  axios \
  helmet \
  cors \
  express-rate-limit \
  chalk

if [ $? -eq 0 ]; then
    echo "${GREEN}✓ Dependencies installed${NC}"
else
    echo "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

# Create .env file if not exists
echo ""
echo "${YELLOW}⚙️  Creating .env file...${NC}"
if [ ! -f .env ]; then
    cp .env.admin-dashboard .env
    echo "${GREEN}✓ .env file created${NC}"
    echo "${YELLOW}⚠️  Please edit .env file with your configuration${NC}"
else
    echo "${YELLOW}ℹ️  .env file already exists${NC}"
fi

# Create directories
echo ""
echo "${YELLOW}📁 Creating required directories...${NC}"
mkdir -p backups uploads logs data

echo "${GREEN}✓ Directories created${NC}"

# Run initialization script
echo ""
echo "${YELLOW}🔧 Initializing Admin Dashboard...${NC}"
echo "${YELLOW}Note: Make sure MongoDB is running and .env is configured${NC}"
echo ""

node initialize-admin-dashboard.js

if [ $? -eq 0 ]; then
    echo ""
    echo "${GREEN}════════════════════════════════════════════════${NC}"
    echo "${GREEN}✅ Admin Dashboard Setup Complete!${NC}"
    echo "${GREEN}════════════════════════════════════════════════${NC}"
    echo ""
    echo "${YELLOW}Next steps:${NC}"
    echo "1. Review and update .env file with your settings"
    echo "2. Add this route to your server.js:"
    echo "   const adminDashboardRoutes = require('./src/modules/admin-dashboard/routes');"
    echo "   app.use('/sys-admin-secure-panel/api', adminDashboardRoutes);"
    echo ""
    echo "3. Start your server:"
    echo "   npm run dev"
    echo ""
    echo "4. Access Admin Dashboard:"
    echo "   https://yourdomain.com/sys-admin-secure-panel"
    echo ""
    echo "${YELLOW}📖 Full documentation:${NC}"
    echo "   See: ADMIN_DASHBOARD_GUIDE.md"
    echo ""
else
    echo "${RED}❌ Setup failed. Check MongoDB connection and .env settings${NC}"
    exit 1
fi
