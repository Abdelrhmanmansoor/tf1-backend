# CV System Database Setup Script for Windows
# This script helps set up PostgreSQL and run migrations

param(
    [switch]$Docker = $false,
    [switch]$Local = $false,
    [switch]$Help = $false
)

# Color output
$successColor = 'Green'
$errorColor = 'Red'
$infoColor = 'Cyan'
$warningColor = 'Yellow'

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor $successColor
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor $errorColor
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor $infoColor
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor $warningColor
}

# Show help
if ($Help -or (-not $Docker -and -not $Local)) {
    Write-Host "`n$('='*60)`n" -ForegroundColor $infoColor
    Write-Host "CV System Database Setup Script" -ForegroundColor $infoColor
    Write-Host "$('='*60)`n" -ForegroundColor $infoColor
    
    Write-Host "Usage:" -ForegroundColor $warningColor
    Write-Host "  .\setup-cv-database.ps1 -Docker   # Setup using Docker" -ForegroundColor White
    Write-Host "  .\setup-cv-database.ps1 -Local    # Setup using local PostgreSQL" -ForegroundColor White
    Write-Host "  .\setup-cv-database.ps1 -Help     # Show this help message`n" -ForegroundColor White
    
    Write-Host "Prerequisites:" -ForegroundColor $warningColor
    Write-Host "  Docker:             Docker Desktop installed" -ForegroundColor White
    Write-Host "  Local PostgreSQL:   PostgreSQL 14+ installed`n" -ForegroundColor White
    
    Write-Host "What this script does:" -ForegroundColor $warningColor
    Write-Host "  1. Checks prerequisites" -ForegroundColor White
    Write-Host "  2. Updates .env file with database URL" -ForegroundColor White
    Write-Host "  3. Starts PostgreSQL (Docker or local)" -ForegroundColor White
    Write-Host "  4. Waits for database to be ready" -ForegroundColor White
    Write-Host "  5. Creates database and user" -ForegroundColor White
    Write-Host "  6. Runs Prisma migrations" -ForegroundColor White
    Write-Host "  7. Verifies setup`n" -ForegroundColor White
    
    exit 0
}

Write-Host "`n$('='*60)`n" -ForegroundColor $infoColor
Write-Host "CV System Database Setup" -ForegroundColor $infoColor
Write-Host "$('='*60)`n" -ForegroundColor $infoColor

# Check if we're in the right directory
if (-not (Test-Path "prisma\schema.prisma")) {
    Write-Error "Not in tf1-backend directory. Please run this script from tf1-backend folder."
    exit 1
}

Write-Success "Found tf1-backend directory"

# ============================================
# DOCKER SETUP
# ============================================
if ($Docker) {
    Write-Host "`nSetting up with Docker...`n" -ForegroundColor $infoColor
    
    # Check if Docker is installed
    Write-Info "Checking Docker installation..."
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "Docker is not installed or not in PATH"
        Write-Host "Please install Docker Desktop from https://www.docker.com/products/docker-desktop" -ForegroundColor $warningColor
        exit 1
    }
    Write-Success "Docker found"
    
    # Check Docker status
    Write-Info "Checking Docker status..."
    $dockerStatus = docker version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker is not running"
        Write-Host "Please start Docker Desktop and try again" -ForegroundColor $warningColor
        exit 1
    }
    Write-Success "Docker is running"
    
    # Stop existing containers if any
    Write-Info "Checking for existing containers..."
    $existingContainers = docker ps -a --filter "name=sportsplatform_cv" --format "{{.Names}}" 2>/dev/null
    if ($existingContainers) {
        Write-Warning "Found existing containers: $existingContainers"
        Write-Host "Stopping and removing existing containers..."
        docker-compose -f docker-compose.cv.yml down -v
        Write-Success "Existing containers removed"
    }
    
    # Start containers
    Write-Host "`nStarting PostgreSQL with Docker...`n" -ForegroundColor $infoColor
    docker-compose -f docker-compose.cv.yml up -d
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to start Docker containers"
        exit 1
    }
    Write-Success "Docker containers started"
    
    # Wait for PostgreSQL to be ready
    Write-Info "Waiting for PostgreSQL to be ready..."
    $maxWait = 30
    $waited = 0
    while ($waited -lt $maxWait) {
        $health = docker exec sportsplatform_cv_db pg_isready -U postgres 2>/dev/null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "PostgreSQL is ready"
            break
        }
        Start-Sleep -Seconds 1
        $waited++
        Write-Host "." -NoNewline -ForegroundColor $infoColor
    }
    
    if ($waited -eq $maxWait) {
        Write-Error "PostgreSQL did not start in time"
        exit 1
    }
    
    # Update .env
    Write-Host "`nUpdating environment configuration...`n" -ForegroundColor $infoColor
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match 'DATABASE_URL') {
        $envContent = $envContent -replace 'DATABASE_URL=.*', 'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sportsplatform_cv?schema=public"'
    } else {
        $envContent = $envContent + "`nDATABASE_URL=`"postgresql://postgres:postgres@localhost:5432/sportsplatform_cv?schema=public`""
    }
    Set-Content ".env" $envContent
    Write-Success ".env updated with PostgreSQL URL"
}

# ============================================
# LOCAL POSTGRESQL SETUP
# ============================================
elseif ($Local) {
    Write-Host "`nSetting up with Local PostgreSQL...`n" -ForegroundColor $infoColor
    
    # Check if PostgreSQL is installed
    Write-Info "Checking PostgreSQL installation..."
    $psqlPath = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
    if (-not (Test-Path $psqlPath)) {
        # Try to find it in PATH
        $psqlPath = Get-Command psql -ErrorAction SilentlyContinue
        if (-not $psqlPath) {
            Write-Error "PostgreSQL is not installed"
            Write-Host "Please install PostgreSQL from https://www.postgresql.org/download/windows/" -ForegroundColor $warningColor
            exit 1
        }
    }
    Write-Success "PostgreSQL found"
    
    # Check if PostgreSQL service is running
    Write-Info "Checking PostgreSQL service..."
    $postgresService = Get-Service postgresql-x64-16 -ErrorAction SilentlyContinue
    if ($postgresService -and $postgresService.Status -ne 'Running') {
        Write-Info "Starting PostgreSQL service..."
        Start-Service postgresql-x64-16 -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
    }
    Write-Success "PostgreSQL service is running"
    
    # Prompt for password
    Write-Host "`nEnter PostgreSQL 'postgres' user password:" -ForegroundColor $warningColor
    $password = Read-Host -AsSecureString
    $plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($password))
    
    # Create database and user
    Write-Info "Creating database and user..."
    $pgPassword = $plainPassword -replace '"', '\"'
    $pgEnv = @{
        'PGPASSWORD' = $plainPassword
    }
    
    # Create database
    & $env:ProgramFiles\PostgreSQL\16\bin\createdb.exe -U postgres sportsplatform_cv -e 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Database created"
    } elseif ($LASTEXITCODE -eq 1) {
        Write-Warning "Database might already exist"
    }
    
    # Update .env
    Write-Info "Updating environment configuration..."
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match 'DATABASE_URL') {
        $envContent = $envContent -replace 'DATABASE_URL=.*', 'DATABASE_URL="postgresql://postgres:' + $plainPassword + '@localhost:5432/sportsplatform_cv?schema=public"'
    } else {
        $envContent = $envContent + "`nDATABASE_URL=`"postgresql://postgres:" + $plainPassword + "@localhost:5432/sportsplatform_cv?schema=public`""
    }
    Set-Content ".env" $envContent
    Write-Success ".env updated with PostgreSQL URL"
}

# ============================================
# RUN MIGRATIONS
# ============================================
Write-Host "`n$('='*60)`n" -ForegroundColor $infoColor
Write-Host "Running Prisma Migrations" -ForegroundColor $infoColor
Write-Host "$('='*60)`n" -ForegroundColor $infoColor

Write-Info "Running: npx prisma migrate dev --name init_cv_system"
npx prisma migrate dev --name init_cv_system

if ($LASTEXITCODE -ne 0) {
    Write-Error "Migration failed"
    exit 1
}

Write-Success "Migrations completed successfully"

# ============================================
# VERIFY SETUP
# ============================================
Write-Host "`n$('='*60)`n" -ForegroundColor $infoColor
Write-Host "Verifying Setup" -ForegroundColor $infoColor
Write-Host "$('='*60)`n" -ForegroundColor $infoColor

Write-Info "Testing database connection..."
$testScript = @"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        const users = await prisma.user.findMany();
        console.log('✅ Database connection successful!');
        console.log('Found ' + users.length + ' users');
        await prisma.\$disconnect();
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        process.exit(1);
    }
}
test();
"@

$testScript | Out-File -FilePath "test-db-temp.js" -Encoding UTF8
node test-db-temp.js
Remove-Item "test-db-temp.js"

Write-Host "`n$('='*60)`n" -ForegroundColor $successColor
Write-Host "✅ Setup Complete!" -ForegroundColor $successColor
Write-Host "$('='*60)`n" -ForegroundColor $successColor

Write-Host "Next Steps:" -ForegroundColor $infoColor
Write-Host "1. Open Prisma Studio: npx prisma studio" -ForegroundColor White
Write-Host "2. View your database tables at http://localhost:5555" -ForegroundColor White
Write-Host "3. Start development: npm run dev" -ForegroundColor White
Write-Host "4. Begin Phase 2: Template System Integration`n" -ForegroundColor White

if ($Docker) {
    Write-Host "Useful Docker Commands:" -ForegroundColor $infoColor
    Write-Host "  View logs:       docker-compose -f docker-compose.cv.yml logs -f postgres" -ForegroundColor Gray
    Write-Host "  Access PgAdmin:  http://localhost:5050 (admin@sportsplatform.local / admin)" -ForegroundColor Gray
    Write-Host "  Stop containers: docker-compose -f docker-compose.cv.yml down" -ForegroundColor Gray
    Write-Host "  Remove all data: docker-compose -f docker-compose.cv.yml down -v`n" -ForegroundColor Gray
}

Write-Host "Database URL:" -ForegroundColor $infoColor
Write-Host "  Check your .env file for DATABASE_URL configuration`n" -ForegroundColor Gray
