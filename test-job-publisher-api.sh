#!/bin/bash

# Test Script for Job Publisher API
# This script tests all the updated endpoints with correct payloads

BASE_URL="http://localhost:5000/api/v1"
TOKEN="YOUR_JWT_TOKEN_HERE"  # Replace with actual token

echo "🚀 Starting Job Publisher API Tests..."
echo "======================================"
echo ""

# Test 1: Create Job with Correct Payload
echo "📝 Test 1: Create Job (Correct Payload)"
echo "---------------------------------------"

curl -X POST "$BASE_URL/job-publisher/jobs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Football Coach",
    "titleAr": "مدرب كرة قدم",
    "description": "We are looking for an experienced football coach with UEFA license to train our youth team. Must have excellent communication skills and experience working with young players.",
    "descriptionAr": "نبحث عن مدرب كرة قدم ذو خبرة يحمل رخصة يويفا لتدريب فريق الشباب. يجب أن يتمتع بمهارات تواصل ممتازة وخبرة في العمل مع اللاعبين الشباب.",
    "sport": "football",
    "category": "coach",
    "employmentType": "full-time",
    "experienceLevel": "senior",
    "location": {
      "city": "Riyadh",
      "cityAr": "الرياض",
      "country": "Saudi Arabia",
      "countryAr": "المملكة العربية السعودية",
      "isRemote": false
    },
    "requirements": [
      "UEFA B license or higher",
      "5+ years of coaching experience",
      "Experience with youth teams",
      "Fluent in Arabic and English"
    ],
    "responsibilities": [
      "Train youth team players",
      "Develop training plans and programs",
      "Analyze player performance",
      "Coordinate with other coaches"
    ],
    "skills": ["Leadership", "Communication", "Tactical Analysis"],
    "benefits": ["Health insurance", "Housing allowance", "Transportation"],
    "minExperienceYears": 5,
    "maxExperienceYears": 15,
    "salaryMin": 8000,
    "salaryMax": 15000,
    "salaryCurrency": "SAR",
    "applicationDeadline": "2026-03-01",
    "status": "active"
  }' | jq '.'

echo ""
echo "Expected: ✅ Status 201, job created"
echo ""

# Test 2: Create Job with Missing Required Fields
echo "📝 Test 2: Validation Error (Missing experienceLevel)"
echo "---------------------------------------------------"

curl -X POST "$BASE_URL/job-publisher/jobs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Basketball Coach",
    "description": "Looking for a basketball coach with experience in professional leagues and strong leadership skills.",
    "sport": "basketball",
    "category": "coach",
    "employmentType": "full-time",
    "location": {
      "city": "Jeddah",
      "country": "Saudi Arabia",
      "isRemote": false
    },
    "requirements": ["Experience required"],
    "responsibilities": ["Train players"],
    "status": "active"
  }' | jq '.'

echo ""
echo "Expected: ❌ Status 400, validation error for missing experienceLevel"
echo ""

# Test 3: Create Job with Invalid employmentType
echo "📝 Test 3: Validation Error (Invalid employmentType)"
echo "--------------------------------------------------"

curl -X POST "$BASE_URL/job-publisher/jobs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Tennis Coach",
    "description": "We need an experienced tennis coach to train our professional athletes and help them improve their game.",
    "sport": "tennis",
    "category": "coach",
    "employmentType": "full_time",
    "experienceLevel": "intermediate",
    "location": {
      "city": "Dammam",
      "country": "Saudi Arabia",
      "isRemote": false
    },
    "requirements": ["Tennis coaching certificate"],
    "responsibilities": ["Train athletes"],
    "status": "active"
  }' | jq '.'

echo ""
echo "Expected: ❌ Status 400, validation error for invalid employmentType (should be full-time not full_time)"
echo ""

# Test 4: Create Job with Short Description
echo "📝 Test 4: Validation Error (Description too short)"
echo "-------------------------------------------------"

curl -X POST "$BASE_URL/job-publisher/jobs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Swimming Coach",
    "description": "Need coach",
    "sport": "swimming",
    "category": "coach",
    "employmentType": "part-time",
    "experienceLevel": "entry",
    "location": {
      "city": "Riyadh",
      "country": "Saudi Arabia",
      "isRemote": false
    },
    "requirements": ["Swimming skills"],
    "responsibilities": ["Teach swimming"],
    "status": "active"
  }' | jq '.'

echo ""
echo "Expected: ❌ Status 400, validation error (description must be at least 50 characters)"
echo ""

# Test 5: Get Jobs (with filters)
echo "📝 Test 5: Get Jobs with Filters"
echo "-------------------------------"

curl -X GET "$BASE_URL/job-publisher/jobs?status=active&page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo ""
echo "Expected: ✅ Status 200, list of active jobs"
echo ""

# Test 6: Update Application Status
echo "📝 Test 6: Update Application Status"
echo "-----------------------------------"

# Replace APPLICATION_ID with actual ID
APPLICATION_ID="REPLACE_WITH_ACTUAL_ID"

curl -X PUT "$BASE_URL/job-publisher/applications/$APPLICATION_ID/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "under_review",
    "message": "We have reviewed your application and would like to schedule an interview."
  }' | jq '.'

echo ""
echo "Expected: ✅ Status 200, application status updated"
echo ""

# Test 7: Update Application Status with Invalid Status
echo "📝 Test 7: Validation Error (Invalid Status)"
echo "-------------------------------------------"

curl -X PUT "$BASE_URL/job-publisher/applications/$APPLICATION_ID/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "invalid_status",
    "message": "Test message"
  }' | jq '.'

echo ""
echo "Expected: ❌ Status 400, validation error for invalid status"
echo ""

# Test 8: Test Subscription Limit (create jobs until limit)
echo "📝 Test 8: Subscription Limit (Free Tier - 3 jobs)"
echo "-------------------------------------------------"
echo "Creating jobs until limit is reached..."

for i in {1..4}; do
  echo "Creating job #$i..."

  curl -s -X POST "$BASE_URL/job-publisher/jobs" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"title\": \"Test Job $i\",
      \"description\": \"This is a test job posting to verify subscription limits are enforced correctly. Must have experience.\",
      \"sport\": \"football\",
      \"category\": \"other\",
      \"employmentType\": \"full-time\",
      \"experienceLevel\": \"entry\",
      \"location\": {
        \"city\": \"Riyadh\",
        \"country\": \"Saudi Arabia\",
        \"isRemote\": false
      },
      \"requirements\": [\"Test requirement\"],
      \"responsibilities\": [\"Test responsibility\"],
      \"status\": \"active\"
    }" | jq -r '.success, .message, .messageAr'

  echo ""
done

echo "Expected: First 3 jobs succeed (✅), 4th job fails with subscription limit error (❌)"
echo ""

# Test 9: File Upload (Logo)
echo "📝 Test 9: File Upload (Company Logo)"
echo "------------------------------------"

# Create a test image file
echo "Creating test image..."
convert -size 100x100 xc:blue test-logo.jpg 2>/dev/null || echo "Note: ImageMagick not installed, skipping file creation"

if [ -f "test-logo.jpg" ]; then
  curl -X POST "$BASE_URL/job-publisher/profile/upload-logo" \
    -H "Authorization: Bearer $TOKEN" \
    -F "logo=@test-logo.jpg" | jq '.'

  rm test-logo.jpg
  echo ""
  echo "Expected: ✅ Status 200, logo uploaded successfully"
else
  echo "⚠️ Skipped: No test image available"
fi

echo ""

# Test 10: File Upload Rate Limiting
echo "📝 Test 10: File Upload Rate Limiting (6 attempts)"
echo "-------------------------------------------------"
echo "Note: This test requires creating multiple test images"
echo "Expected: First 5 uploads succeed, 6th fails with rate limit error"
echo ""

echo "======================================"
echo "✅ Tests Complete!"
echo "======================================"
echo ""
echo "Summary:"
echo "--------"
echo "1. Job Creation (correct payload)        : Should succeed"
echo "2. Job Creation (missing field)          : Should fail (400)"
echo "3. Job Creation (invalid employmentType) : Should fail (400)"
echo "4. Job Creation (short description)      : Should fail (400)"
echo "5. Get Jobs (with filters)               : Should succeed"
echo "6. Update Application Status             : Should succeed"
echo "7. Update Status (invalid)               : Should fail (400)"
echo "8. Subscription Limit Test               : 4th job should fail (403)"
echo "9. File Upload                           : Should succeed"
echo "10. Rate Limiting Test                   : 6th upload should fail (429)"
echo ""
echo "Next Steps:"
echo "----------"
echo "1. Replace YOUR_JWT_TOKEN_HERE with actual token"
echo "2. Run: chmod +x test-job-publisher-api.sh"
echo "3. Run: ./test-job-publisher-api.sh"
echo ""
