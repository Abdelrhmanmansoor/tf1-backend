# Test CSRF System - Complete Test
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Testing CSRF Protection System" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Get CSRF Token
Write-Host "Step 1: Getting CSRF token..." -ForegroundColor Yellow
try {
    $tokenResponse = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/auth/csrf-token" -Method GET -WebSession $session
    $token = $tokenResponse.token
    
    if (-not $token) {
        $token = $tokenResponse.data.token
    }
    
    if ($token) {
        Write-Host "✅ Token received: $($token.Substring(0,40))..." -ForegroundColor Green
        Write-Host "   Token length: $($token.Length) chars" -ForegroundColor Gray
    } else {
        Write-Host "❌ Failed to get token!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error getting token: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Test Login WITH CSRF token
Write-Host "Step 2: Testing login WITH CSRF token..." -ForegroundColor Yellow
try {
    $headers = @{
        "Content-Type" = "application/json"
        "X-CSRF-Token" = $token
    }
    
    $body = @{
        email = "test@example.com"
        password = "password123"
    } | ConvertTo-Json
    
    try {
        $loginResponse = Invoke-WebRequest -Uri "http://localhost:4000/api/v1/auth/login" `
            -Method POST `
            -Headers $headers `
            -Body $body `
            -UseBasicParsing `
            -ErrorAction Stop
        
        Write-Host "✅ Login succeeded (CSRF working!)" -ForegroundColor Green
        Write-Host "   Status: $($loginResponse.StatusCode)" -ForegroundColor Gray
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
        
        if ($statusCode -eq 401) {
            Write-Host "✅ CSRF is working! (401 = wrong credentials, not CSRF error)" -ForegroundColor Green
            Write-Host "   Message: $($errorBody.message)" -ForegroundColor Gray
        } elseif ($statusCode -eq 403 -and $errorBody.code -like "CSRF*") {
            Write-Host "❌ CSRF failed!" -ForegroundColor Red
            Write-Host "   Code: $($errorBody.code)" -ForegroundColor Red
            Write-Host "   Message: $($errorBody.message)" -ForegroundColor Red
        } else {
            Write-Host "⚠️  Unexpected response: $statusCode" -ForegroundColor Yellow
            Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "❌ Test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Step 3: Test Login WITHOUT CSRF token (should fail)
Write-Host "Step 3: Testing login WITHOUT CSRF token (should fail)..." -ForegroundColor Yellow
try {
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    $body = @{
        email = "test@example.com"
        password = "password123"
    } | ConvertTo-Json
    
    try {
        $loginResponse = Invoke-WebRequest -Uri "http://localhost:4000/api/v1/auth/login" `
            -Method POST `
            -Headers $headers `
            -Body $body `
            -UseBasicParsing `
            -ErrorAction Stop
        
        Write-Host "⚠️  Login succeeded without token (CSRF may be bypassed)" -ForegroundColor Yellow
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
        
        if ($statusCode -eq 403 -and $errorBody.code -eq "CSRF_TOKEN_MISSING") {
            Write-Host "✅ Correctly rejected (CSRF protection is working!)" -ForegroundColor Green
            Write-Host "   Code: CSRF_TOKEN_MISSING" -ForegroundColor Gray
        } else {
            Write-Host "⚠️  Unexpected response: $statusCode" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "❌ Test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Test Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
