#!/bin/bash

# CV System Database Setup Script for macOS/Linux
# This script helps set up PostgreSQL and run migrations

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Functions
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

show_help() {
    echo ""
    echo "$(echo '='*60)"
    echo -e "${CYAN}CV System Database Setup Script${NC}"
    echo "$(echo '='*60)"
    echo ""
    echo "Usage:"
    echo "  bash setup-cv-database.sh -docker   # Setup using Docker"
    echo "  bash setup-cv-database.sh -local    # Setup using local PostgreSQL"
    echo "  bash setup-cv-database.sh -help     # Show this help message"
    echo ""
    echo "Prerequisites:"
    echo "  Docker:             Docker and Docker Compose installed"
    echo "  Local PostgreSQL:   PostgreSQL 14+ installed"
    echo ""
    echo "What this script does:"
    echo "  1. Checks prerequisites"
    echo "  2. Updates .env file with database URL"
    echo "  3. Starts PostgreSQL (Docker or local)"
    echo "  4. Waits for database to be ready"
    echo "  5. Creates database and user"
    echo "  6. Runs Prisma migrations"
    echo "  7. Verifies setup"
    echo ""
}

# Check arguments
if [ "$#" -eq 0 ] || [ "$1" = "-help" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

echo ""
echo "$(echo '='*60)"
echo -e "${CYAN}CV System Database Setup${NC}"
echo "$(echo '='*60)"
echo ""

# Check if we're in the right directory
if [ ! -f "prisma/schema.prisma" ]; then
    error "Not in tf1-backend directory. Please run this script from tf1-backend folder."
    exit 1
fi

success "Found tf1-backend directory"

# ============================================
# DOCKER SETUP
# ============================================
if [ "$1" = "-docker" ]; then
    info "Setting up with Docker..."
    echo ""
    
    # Check if Docker is installed
    info "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
        warning "Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
        exit 1
    fi
    success "Docker found"
    
    # Check Docker status
    info "Checking Docker status..."
    if ! docker ps &> /dev/null; then
        error "Docker is not running"
        warning "Please start Docker and try again"
        exit 1
    fi
    success "Docker is running"
    
    # Stop existing containers if any
    info "Checking for existing containers..."
    if docker ps -a --filter "name=sportsplatform_cv" --format "{{.Names}}" | grep -q "sportsplatform_cv"; then
        warning "Found existing containers"
        info "Stopping and removing existing containers..."
        docker-compose -f docker-compose.cv.yml down -v || true
        success "Existing containers removed"
    fi
    
    # Start containers
    echo ""
    info "Starting PostgreSQL with Docker..."
    docker-compose -f docker-compose.cv.yml up -d
    
    if [ $? -ne 0 ]; then
        error "Failed to start Docker containers"
        exit 1
    fi
    success "Docker containers started"
    
    # Wait for PostgreSQL to be ready
    info "Waiting for PostgreSQL to be ready..."
    max_wait=30
    waited=0
    while [ $waited -lt $max_wait ]; do
        if docker exec sportsplatform_cv_db pg_isready -U postgres &> /dev/null; then
            success "PostgreSQL is ready"
            break
        fi
        sleep 1
        waited=$((waited + 1))
        echo -n "."
    done
    echo ""
    
    if [ $waited -eq $max_wait ]; then
        error "PostgreSQL did not start in time"
        exit 1
    fi
    
    # Update .env
    echo ""
    info "Updating environment configuration..."
    if grep -q "DATABASE_URL" .env; then
        sed -i '' 's|DATABASE_URL=.*|DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sportsplatform_cv?schema=public"|' .env
    else
        echo 'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sportsplatform_cv?schema=public"' >> .env
    fi
    success ".env updated with PostgreSQL URL"

# ============================================
# LOCAL POSTGRESQL SETUP
# ============================================
elif [ "$1" = "-local" ]; then
    info "Setting up with Local PostgreSQL..."
    echo ""
    
    # Detect OS
    if [ "$(uname)" = "Darwin" ]; then
        # macOS
        info "Detected macOS"
        
        # Check if PostgreSQL is installed
        info "Checking PostgreSQL installation..."
        if ! command -v psql &> /dev/null; then
            error "PostgreSQL is not installed"
            warning "Install with: brew install postgresql"
            exit 1
        fi
        success "PostgreSQL found"
        
        # Start PostgreSQL
        info "Starting PostgreSQL..."
        brew services start postgresql || true
        sleep 2
        success "PostgreSQL started"
        
    else
        # Linux
        info "Detected Linux"
        
        # Check if PostgreSQL is installed
        info "Checking PostgreSQL installation..."
        if ! command -v psql &> /dev/null; then
            error "PostgreSQL is not installed"
            warning "Install with: sudo apt-get install postgresql postgresql-contrib"
            exit 1
        fi
        success "PostgreSQL found"
        
        # Start PostgreSQL
        info "Starting PostgreSQL..."
        sudo systemctl start postgresql || true
        sleep 2
        success "PostgreSQL started"
    fi
    
    # Create database
    info "Creating database..."
    createdb -U postgres sportsplatform_cv 2>/dev/null || warning "Database might already exist"
    success "Database ready"
    
    # Update .env
    echo ""
    info "Updating environment configuration..."
    if grep -q "DATABASE_URL" .env; then
        sed -i '' 's|DATABASE_URL=.*|DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sportsplatform_cv?schema=public"|' .env
    else
        echo 'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sportsplatform_cv?schema=public"' >> .env
    fi
    success ".env updated with PostgreSQL URL"
else
    error "Unknown option: $1"
    show_help
    exit 1
fi

# ============================================
# RUN MIGRATIONS
# ============================================
echo ""
echo "$(echo '='*60)"
echo -e "${CYAN}Running Prisma Migrations${NC}"
echo "$(echo '='*60)"
echo ""

info "Running: npx prisma migrate dev --name init_cv_system"
npx prisma migrate dev --name init_cv_system

if [ $? -ne 0 ]; then
    error "Migration failed"
    exit 1
fi

success "Migrations completed successfully"

# ============================================
# VERIFY SETUP
# ============================================
echo ""
echo "$(echo '='*60)"
echo -e "${CYAN}Verifying Setup${NC}"
echo "$(echo '='*60)"
echo ""

info "Testing database connection..."
cat > test-db-temp.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        const users = await prisma.user.findMany();
        console.log('✅ Database connection successful!');
        console.log('Found ' + users.length + ' users');
        await prisma.$disconnect();
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        process.exit(1);
    }
}
test();
EOF

node test-db-temp.js
rm test-db-temp.js

echo ""
echo "$(echo '='*60)"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "$(echo '='*60)"
echo ""

info "Next Steps:"
echo "  1. Open Prisma Studio: npx prisma studio"
echo "  2. View your database tables at http://localhost:5555"
echo "  3. Start development: npm run dev"
echo "  4. Begin Phase 2: Template System Integration"
echo ""

if [ "$1" = "-docker" ]; then
    info "Useful Docker Commands:"
    echo "  View logs:       docker-compose -f docker-compose.cv.yml logs -f postgres"
    echo "  Access PgAdmin:  http://localhost:5050 (admin@sportsplatform.local / admin)"
    echo "  Stop containers: docker-compose -f docker-compose.cv.yml down"
    echo "  Remove all data: docker-compose -f docker-compose.cv.yml down -v"
    echo ""
fi

info "Database URL:"
echo "  Check your .env file for DATABASE_URL configuration"
echo ""
