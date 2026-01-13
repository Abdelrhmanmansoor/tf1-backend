# =====================================================
# CSRF Issue Diagnostic Script
# سكريبت تشخيص مشكلة CSRF
# =====================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CSRF Issue Diagnostic" -ForegroundColor Cyan
Write-Host "  تشخيص مشكلة CSRF" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Colors
function Write-Success { param($message) Write-Host "✅ $message" -ForegroundColor Green }
function Write-Error { param($message) Write-Host "❌ $message" -ForegroundColor Red }
function Write-Info { param($message) Write-Host "ℹ️  $message" -ForegroundColor Cyan }
function Write-Warning { param($message) Write-Host "⚠️  $message" -ForegroundColor Yellow }

# Check 1: .env file
Write-Info "1. Checking .env configuration..."
if (Test-Path ".env") {
    Write-Success ".env file exists"
    
    # Check CSRF_SECRET
    $envContent = Get-Content .env -Raw
    if ($envContent -match "CSRF_SECRET=(.+)") {
        $secret = $matches[1].Trim()
        if ($secret.Length -ge 32) {
            Write-Success "CSRF_SECRET exists ($($secret.Length) chars)"
        } else {
            Write-Error "CSRF_SECRET too short ($($secret.Length) chars, need 32+)"
        }
    } else {
        Write-Error "CSRF_SECRET not found in .env"
        Write-Warning "Add this line to .env:"
        Write-Host "CSRF_SECRET=314c505cdb3e165a87b041461d02a40cf17e82113be58fc757336a7b53db6e8d" -ForegroundColor Yellow
    }
    
    # Check ALLOWED_ORIGINS
    if ($envContent -match "ALLOWED_ORIGINS=(.+)") {
        Write-Success "ALLOWED_ORIGINS configured"
    } else {
        Write-Warning "ALLOWED_ORIGINS not found (optional)"
    }
} else {
    Write-Error ".env file not found!"
    Write-Warning "Create .env file with CSRF_SECRET"
}

Write-Host ""

# Check 2: Server status
Write-Info "2. Checking if server is running..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Success "Server is running on port 4000"
} catch {
    Write-Error "Server is NOT running!"
    Write-Warning "Start the server with: npm run dev"
    Write-Host ""
    Write-Host "To start server now:" -ForegroundColor Yellow
    Write-Host "  cd C:\Users\abdel\Desktop\SportsPlatform-BE\tf1-backend" -ForegroundColor White
    Write-Host "  npm run dev" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""

# Check 3: CSRF diagnostic
Write-Info "3. Checking CSRF configuration..."
try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/auth/csrf-diagnostic" -Method GET
    
    if ($response.status -eq "OK") {
        Write-Success "CSRF status: OK"
        
        if ($response.csrf.secretConfigured) {
            Write-Success "  CSRF_SECRET: Configured"
        } else {
            Write-Error "  CSRF_SECRET: Not configured"
        }
        
        if ($response.csrf.tokenGenerated) {
            Write-Success "  Token generation: Working"
        } else {
            Write-Error "  Token generation: Failed"
        }
    } else {
        Write-Warning "CSRF status: $($response.status)"
    }
    
    # Check recommendations
    if ($response.recommendations -and $response.recommendations.Count -gt 0) {
        Write-Host ""
        Write-Warning "Recommendations:"
        foreach ($rec in $response.recommendations) {
            if ($rec.severity -eq "CRITICAL") {
                Write-Error "  - $($rec.arabic)"
            } elseif ($rec.severity -eq "SUCCESS") {
                Write-Success "  - $($rec.arabic)"
            } else {
                Write-Warning "  - $($rec.arabic)"
            }
        }
    }
} catch {
    Write-Error "Failed to check CSRF diagnostic"
    Write-Warning "Error: $($_.Exception.Message)"
}

Write-Host ""

# Check 4: Test token generation
Write-Info "4. Testing token generation..."
try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/auth/csrf-token" -Method GET
    
    if ($response.token) {
        Write-Success "Token generated successfully"
        Write-Info "  Token: $($response.token.Substring(0, 30))..."
    } else {
        Write-Error "Token generation failed"
    }
} catch {
    Write-Error "Failed to generate token"
    Write-Warning "Error: $($_.Exception.Message)"
}

Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Summary / الملخص" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Determine the issue
$hasEnv = Test-Path ".env"
$hasSecret = $envContent -match "CSRF_SECRET=(.+)"
$serverRunning = $false

try {
    Invoke-WebRequest -Uri "http://localhost:4000/health" -Method GET -TimeoutSec 2 -ErrorAction Stop | Out-Null
    $serverRunning = $true
} catch {}

if (-not $hasEnv) {
    Write-Error "ISSUE: .env file missing"
    Write-Info "SOLUTION: Create .env file with CSRF_SECRET"
} elseif (-not $hasSecret) {
    Write-Error "ISSUE: CSRF_SECRET missing in .env"
    Write-Info "SOLUTION: Add CSRF_SECRET to .env"
    Write-Host ""
    Write-Host "Add this line to .env:" -ForegroundColor Yellow
    Write-Host "CSRF_SECRET=314c505cdb3e165a87b041461d02a40cf17e82113be58fc757336a7b53db6e8d" -ForegroundColor White
} elseif (-not $serverRunning) {
    Write-Error "ISSUE: Server is not running"
    Write-Info "SOLUTION: Start the server"
    Write-Host ""
    Write-Host "Run this command:" -ForegroundColor Yellow
    Write-Host "  npm run dev" -ForegroundColor White
} else {
    Write-Success "Everything looks good!"
    Write-Info "CSRF protection is working correctly"
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Copy frontend helper from: frontend/" -ForegroundColor White
    Write-Host "  2. Test in browser: test-csrf.html" -ForegroundColor White
    Write-Host "  3. Read guide: START_HERE_CSRF.md" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
