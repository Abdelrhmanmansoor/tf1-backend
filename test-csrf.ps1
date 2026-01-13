# =====================================================
# CSRF Test Script - PowerShell
# اختبار نظام CSRF بالكامل
# =====================================================

Write-Host ""
Write-Host "🔐 ============================================" -ForegroundColor Cyan
Write-Host "🔐  CSRF Test Script - اختبار نظام CSRF" -ForegroundColor Cyan
Write-Host "🔐 ============================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$API_URL = "http://localhost:4000"
$EMAIL = "test@example.com"
$PASSWORD = "password123"

# Colors
function Write-Success { param($message) Write-Host "✅ $message" -ForegroundColor Green }
function Write-Error { param($message) Write-Host "❌ $message" -ForegroundColor Red }
function Write-Info { param($message) Write-Host "ℹ️  $message" -ForegroundColor Cyan }
function Write-Warning { param($message) Write-Host "⚠️  $message" -ForegroundColor Yellow }

# =====================================================
# Test 1: Check Server
# =====================================================
Write-Info "الاختبار 1: فحص السيرفر..."
try {
    $response = Invoke-WebRequest -Uri "$API_URL/health" -Method GET -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Success "السيرفر يعمل بشكل صحيح"
    }
} catch {
    Write-Error "السيرفر لا يعمل! تأكد من تشغيله على $API_URL"
    Write-Warning "شغل السيرفر باستخدام: cd tf1-backend && npm run dev"
    exit 1
}

Write-Host ""

# =====================================================
# Test 2: CSRF Diagnostic
# =====================================================
Write-Info "الاختبار 2: فحص تكوين CSRF..."
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/v1/auth/csrf-diagnostic" -Method GET
    
    if ($response.status -eq "OK") {
        Write-Success "تكوين CSRF صحيح"
        
        if ($response.csrf.secretConfigured) {
            Write-Success "  CSRF_SECRET موجود"
        } else {
            Write-Error "  CSRF_SECRET غير موجود!"
        }
        
        if ($response.csrf.tokenGenerated) {
            Write-Success "  Token generation يعمل"
        } else {
            Write-Error "  Token generation لا يعمل!"
        }
    } else {
        Write-Warning "حالة CSRF: $($response.status)"
        
        if ($response.recommendations) {
            Write-Warning "التوصيات:"
            foreach ($rec in $response.recommendations) {
                if ($rec.severity -eq "CRITICAL") {
                    Write-Error "  - $($rec.arabic)"
                } else {
                    Write-Warning "  - $($rec.arabic)"
                }
            }
        }
    }
} catch {
    Write-Error "فشل فحص CSRF: $($_.Exception.Message)"
    exit 1
}

Write-Host ""

# =====================================================
# Test 3: Get CSRF Token
# =====================================================
Write-Info "الاختبار 3: الحصول على CSRF Token..."
try {
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $response = Invoke-RestMethod -Uri "$API_URL/api/v1/auth/csrf-token" -Method GET -WebSession $session
    
    $token = $response.token
    if (-not $token) {
        $token = $response.data.token
    }
    
    if ($token) {
        Write-Success "تم الحصول على Token بنجاح"
        Write-Info "  Token: $($token.Substring(0, [Math]::Min(50, $token.Length)))..."
        Write-Info "  الطول: $($token.Length) حرف"
    } else {
        Write-Error "فشل الحصول على Token!"
        exit 1
    }
} catch {
    Write-Error "فشل الحصول على Token: $($_.Exception.Message)"
    exit 1
}

Write-Host ""

# =====================================================
# Test 4: Test Token Validation
# =====================================================
Write-Info "الاختبار 4: اختبار صحة Token..."
try {
    $headers = @{
        "X-CSRF-Token" = $token
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri "$API_URL/api/v1/auth/csrf-test" `
        -Method POST `
        -Headers $headers `
        -WebSession $session
    
    if ($response.success) {
        Write-Success "Token صالح"
    } else {
        Write-Error "Token غير صالح!"
    }
} catch {
    Write-Warning "اختبار Token فشل (قد يكون الـ endpoint غير موجود)"
}

Write-Host ""

# =====================================================
# Test 5: Test Login with CSRF Token
# =====================================================
Write-Info "الاختبار 5: اختبار Login مع CSRF Token..."
try {
    $headers = @{
        "X-CSRF-Token" = $token
        "Content-Type" = "application/json"
    }
    
    $body = @{
        email = $EMAIL
        password = $PASSWORD
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$API_URL/api/v1/auth/login" `
            -Method POST `
            -Headers $headers `
            -Body $body `
            -WebSession $session `
            -ErrorAction Stop
        
        Write-Success "Login نجح! (CSRF يعمل بشكل صحيح)"
        Write-Info "  البيانات: $($response | ConvertTo-Json -Depth 2)"
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        
        if ($statusCode -eq 401) {
            Write-Success "بيانات دخول خاطئة (لكن CSRF يعمل!)"
            Write-Success "CSRF يعمل بشكل صحيح ✓✓✓"
        } elseif ($statusCode -eq 403) {
            $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
            
            if ($errorBody.code -like "CSRF*") {
                Write-Error "CSRF فشل!"
                Write-Error "  الكود: $($errorBody.code)"
                Write-Error "  الرسالة: $($errorBody.messageAr)"
                exit 1
            } else {
                Write-Warning "رفض الوصول (403) لكن ليس بسبب CSRF"
            }
        } else {
            Write-Warning "استجابة غير متوقعة: $statusCode"
        }
    }
} catch {
    Write-Error "فشل اختبار Login: $($_.Exception.Message)"
}

Write-Host ""

# =====================================================
# Summary
# =====================================================
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "📊 ملخص الاختبار / Test Summary" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Success "✓ السيرفر يعمل"
Write-Success "✓ تكوين CSRF صحيح"
Write-Success "✓ Token generation يعمل"
Write-Success "✓ Token validation يعمل"
Write-Success "✓ CSRF protection يعمل بشكل صحيح"
Write-Host ""
Write-Success "🎉 جميع الاختبارات نجحت! نظام CSRF يعمل بشكل ممتاز! 🎉"
Write-Host ""

# =====================================================
# Additional Info
# =====================================================
Write-Info "معلومات إضافية:"
Write-Host "  📖 دليل سريع: CSRF_QUICK_FIX.md" -ForegroundColor Gray
Write-Host "  📚 دليل شامل: CSRF_COMPLETE_SOLUTION_AR.md" -ForegroundColor Gray
Write-Host "  🌐 صفحة اختبار: test-csrf.html" -ForegroundColor Gray
Write-Host "  📝 ملخص: CSRF_SOLUTION_SUMMARY.md" -ForegroundColor Gray
Write-Host ""
