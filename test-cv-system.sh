#!/bin/bash

# ======================================
# 🧪 اختبار سريع لنظام السيرة الذاتية
# ======================================

echo "========================================="
echo "🧪 اختبار نظام السيرة الذاتية المحسّن"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL=${BASE_URL:-"http://localhost:4000"}
API_PREFIX="/api/v1"

# Test Results
PASSED=0
FAILED=0

# Helper function
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local expected_status=$4
    
    echo -n "Testing: $name ... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" -X $method "$BASE_URL$endpoint")
    
    if [ "$response" == "$expected_status" ]; then
        echo -e "${GREEN}✅ PASSED${NC} (Status: $response)"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAILED${NC} (Expected: $expected_status, Got: $response)"
        ((FAILED++))
    fi
}

echo "1️⃣  Testing Server Connectivity"
echo "-----------------------------------"
test_endpoint "Server Health Check" "GET" "/health" "200"
echo ""

echo "2️⃣  Testing CV Routes (No Auth)"
echo "-----------------------------------"
test_endpoint "CV Create (Unauthorized)" "POST" "$API_PREFIX/cv" "401"
test_endpoint "CV Get (Not Found)" "GET" "$API_PREFIX/cv/invalid-id" "404"
echo ""

echo "3️⃣  Testing File Upload Middleware"
echo "-----------------------------------"
echo -e "${YELLOW}ℹ️  Upload tests require authentication token${NC}"
echo "   Use: export AUTH_TOKEN=your-token"
echo ""

if [ ! -z "$AUTH_TOKEN" ]; then
    # Create a test PDF
    echo "Test CV" > test-cv.txt
    
    test_upload=$(curl -s -X POST "$BASE_URL$API_PREFIX/jobs/test-job-id/apply" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -F "resume=@test-cv.txt" \
        -w "%{http_code}")
    
    echo "Upload Test: Status $test_upload"
    rm -f test-cv.txt
else
    echo -e "${YELLOW}⚠️  Skipping upload tests (no AUTH_TOKEN)${NC}"
fi
echo ""

echo "4️⃣  Testing AI Rate Limiting"
echo "-----------------------------------"
echo -e "${YELLOW}ℹ️  AI tests require authentication and valid API key${NC}"

if [ ! -z "$AUTH_TOKEN" ]; then
    for i in {1..3}; do
        response=$(curl -s -X POST "$BASE_URL$API_PREFIX/cv/ai/generate" \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{"type":"skills","data":"Developer","language":"ar"}' \
            -w "\n%{http_code}")
        
        status=$(echo "$response" | tail -n1)
        body=$(echo "$response" | head -n-1)
        
        echo "Request $i: Status $status"
        
        if [ "$status" == "429" ]; then
            echo -e "${GREEN}✅ Rate limiting working!${NC}"
            break
        fi
        
        sleep 1
    done
else
    echo -e "${YELLOW}⚠️  Skipping AI tests (no AUTH_TOKEN)${NC}"
fi
echo ""

echo "5️⃣  Testing Logs Directory"
echo "-----------------------------------"
if [ -d "logs" ]; then
    echo -e "${GREEN}✅ Logs directory exists${NC}"
    ls -lh logs/
    ((PASSED++))
else
    echo -e "${RED}❌ Logs directory not found${NC}"
    ((FAILED++))
fi
echo ""

echo "6️⃣  Testing Environment Variables"
echo "-----------------------------------"

check_env() {
    local var_name=$1
    if grep -q "^$var_name=" .env 2>/dev/null; then
        echo -e "${GREEN}✅ $var_name is set${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠️  $var_name not found in .env${NC}"
    fi
}

check_env "AI_API_KEY"
check_env "AI_PROVIDER"
check_env "MONGODB_URI"
check_env "JWT_SECRET"
echo ""

echo "7️⃣  Testing File Structure"
echo "-----------------------------------"

check_file() {
    local file=$1
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file exists${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ $file missing${NC}"
        ((FAILED++))
    fi
}

check_file "src/utils/logger.js"
check_file "src/middleware/rateLimiter.js"
check_file "src/middleware/localFileUpload.js"
check_file "src/modules/cv/services/aiService.js"
check_file ".env.example"
echo ""

echo "8️⃣  Checking Dependencies"
echo "-----------------------------------"

check_dep() {
    local dep=$1
    if grep -q "\"$dep\"" package.json; then
        echo -e "${GREEN}✅ $dep installed${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ $dep not found${NC}"
        ((FAILED++))
    fi
}

check_dep "winston"
check_dep "express-rate-limit"
check_dep "multer"
echo ""

echo "========================================="
echo "📊 Test Results Summary"
echo "========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed. Please review.${NC}"
    exit 1
fi
