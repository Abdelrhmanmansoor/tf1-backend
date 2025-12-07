#!/bin/bash

# Matches System Manual Test Script
# This script tests the matches system endpoints with MongoDB running

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:4000/matches"

echo -e "${YELLOW}=== Matches System Manual Test ===${NC}\n"

# Check if server is running
echo -e "${YELLOW}Checking server...${NC}"
curl -s http://localhost:4000/health > /dev/null || {
    echo -e "${RED}Error: Server is not running. Start it with: npm start${NC}"
    exit 1
}
echo -e "${GREEN}✓ Server is running${NC}\n"

# Test 1: Signup
echo -e "${YELLOW}Test 1: User Signup${NC}"
SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test'$(date +%s)'@example.com",
    "password": "Test@123",
    "display_name": "Test User"
  }')

echo "$SIGNUP_RESPONSE" | grep -q '"success":true' && \
    echo -e "${GREEN}✓ Signup successful${NC}" || \
    echo -e "${RED}✗ Signup failed: $SIGNUP_RESPONSE${NC}"

TOKEN=$(echo "$SIGNUP_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo -e "Token: ${TOKEN:0:20}...\n"

# Test 2: Get current user
echo -e "${YELLOW}Test 2: Get Current User (Me)${NC}"
ME_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN")

echo "$ME_RESPONSE" | grep -q '"success":true' && \
    echo -e "${GREEN}✓ Get me successful${NC}" || \
    echo -e "${RED}✗ Get me failed: $ME_RESPONSE${NC}"
echo ""

# Test 3: Create a team
echo -e "${YELLOW}Test 3: Create Team${NC}"
TEAM_RESPONSE=$(curl -s -X POST "$BASE_URL/teams" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Team '$(date +%s)'",
    "logo_url": "https://example.com/logo.png"
  }')

echo "$TEAM_RESPONSE" | grep -q '"success":true' && \
    echo -e "${GREEN}✓ Team creation successful${NC}" || \
    echo -e "${RED}✗ Team creation failed: $TEAM_RESPONSE${NC}"

TEAM_ID=$(echo "$TEAM_RESPONSE" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo -e "Team ID: $TEAM_ID\n"

# Test 4: Create a match
echo -e "${YELLOW}Test 4: Create Match${NC}"
FUTURE_DATE=$(date -u -d "+7 days" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v+7d +"%Y-%m-%dT%H:%M:%SZ")
MATCH_RESPONSE=$(curl -s -X POST "$BASE_URL/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "starts_at": "'$FUTURE_DATE'",
    "venue": "Central Stadium",
    "max_players": 10,
    "team_size": 5,
    "mode": "player_pool",
    "visibility": "public"
  }')

echo "$MATCH_RESPONSE" | grep -q '"success":true' && \
    echo -e "${GREEN}✓ Match creation successful${NC}" || \
    echo -e "${RED}✗ Match creation failed: $MATCH_RESPONSE${NC}"

MATCH_ID=$(echo "$MATCH_RESPONSE" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo -e "Match ID: $MATCH_ID\n"

# Test 5: Publish match (draft → open)
echo -e "${YELLOW}Test 5: Publish Match (State Transition)${NC}"
PUBLISH_RESPONSE=$(curl -s -X POST "$BASE_URL/$MATCH_ID/publish" \
  -H "Authorization: Bearer $TOKEN")

echo "$PUBLISH_RESPONSE" | grep -q '"success":true' && \
    echo -e "${GREEN}✓ Match published (draft → open)${NC}" || \
    echo -e "${RED}✗ Match publish failed: $PUBLISH_RESPONSE${NC}"
echo ""

# Test 6: List matches
echo -e "${YELLOW}Test 6: List Matches${NC}"
LIST_RESPONSE=$(curl -s -X GET "$BASE_URL/?state=open" \
  -H "Authorization: Bearer $TOKEN")

echo "$LIST_RESPONSE" | grep -q '"success":true' && \
    echo -e "${GREEN}✓ List matches successful${NC}" || \
    echo -e "${RED}✗ List matches failed: $LIST_RESPONSE${NC}"
echo ""

# Test 7: Get match details
echo -e "${YELLOW}Test 7: Get Match Details${NC}"
GET_MATCH_RESPONSE=$(curl -s -X GET "$BASE_URL/$MATCH_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "$GET_MATCH_RESPONSE" | grep -q '"success":true' && \
    echo -e "${GREEN}✓ Get match details successful${NC}" || \
    echo -e "${RED}✗ Get match details failed: $GET_MATCH_RESPONSE${NC}"
echo ""

# Test 8: Join match
echo -e "${YELLOW}Test 8: Join Match${NC}"
JOIN_RESPONSE=$(curl -s -X POST "$BASE_URL/$MATCH_ID/join" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')

echo "$JOIN_RESPONSE" | grep -q '"success":true' && \
    echo -e "${GREEN}✓ Join match successful${NC}" || \
    echo -e "${RED}✗ Join match failed: $JOIN_RESPONSE${NC}"
echo ""

# Test 9: Send chat message
echo -e "${YELLOW}Test 9: Send Chat Message${NC}"
CHAT_RESPONSE=$(curl -s -X POST "$BASE_URL/$MATCH_ID/chat" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Hello everyone! Ready for the match?"
  }')

echo "$CHAT_RESPONSE" | grep -q '"success":true' && \
    echo -e "${GREEN}✓ Send chat message successful${NC}" || \
    echo -e "${RED}✗ Send chat message failed: $CHAT_RESPONSE${NC}"
echo ""

# Test 10: Get chat messages
echo -e "${YELLOW}Test 10: Get Chat Messages${NC}"
GET_CHAT_RESPONSE=$(curl -s -X GET "$BASE_URL/$MATCH_ID/chat" \
  -H "Authorization: Bearer $TOKEN")

echo "$GET_CHAT_RESPONSE" | grep -q '"success":true' && \
    echo -e "${GREEN}✓ Get chat messages successful${NC}" || \
    echo -e "${RED}✗ Get chat messages failed: $GET_CHAT_RESPONSE${NC}"
echo ""

# Test 11: Get notifications
echo -e "${YELLOW}Test 11: Get Notifications${NC}"
NOTIF_RESPONSE=$(curl -s -X GET "$BASE_URL/notifications" \
  -H "Authorization: Bearer $TOKEN")

echo "$NOTIF_RESPONSE" | grep -q '"success":true' && \
    echo -e "${GREEN}✓ Get notifications successful${NC}" || \
    echo -e "${RED}✗ Get notifications failed: $NOTIF_RESPONSE${NC}"
echo ""

# Test 12: Get user history
echo -e "${YELLOW}Test 12: Get User Match History${NC}"
HISTORY_RESPONSE=$(curl -s -X GET "$BASE_URL/me/matches/history" \
  -H "Authorization: Bearer $TOKEN")

echo "$HISTORY_RESPONSE" | grep -q '"success":true' && \
    echo -e "${GREEN}✓ Get history successful${NC}" || \
    echo -e "${RED}✗ Get history failed: $HISTORY_RESPONSE${NC}"
echo ""

# Test 13: Test invalid state transition
echo -e "${YELLOW}Test 13: Test State Machine (Invalid Transition)${NC}"
INVALID_RESPONSE=$(curl -s -X POST "$BASE_URL/$MATCH_ID/finish" \
  -H "Authorization: Bearer $TOKEN")

echo "$INVALID_RESPONSE" | grep -q '"success":false' && \
    echo -e "${GREEN}✓ Invalid state transition correctly rejected (409)${NC}" || \
    echo -e "${RED}✗ State machine validation failed${NC}"
echo ""

# Test 14: Start match
echo -e "${YELLOW}Test 14: Start Match${NC}"
START_RESPONSE=$(curl -s -X POST "$BASE_URL/$MATCH_ID/start" \
  -H "Authorization: Bearer $TOKEN")

echo "$START_RESPONSE" | grep -q '"success":true' && \
    echo -e "${GREEN}✓ Start match successful${NC}" || \
    echo -e "${RED}✗ Start match failed: $START_RESPONSE${NC}"
echo ""

# Test 15: Finish match
echo -e "${YELLOW}Test 15: Finish Match${NC}"
FINISH_RESPONSE=$(curl -s -X POST "$BASE_URL/$MATCH_ID/finish" \
  -H "Authorization: Bearer $TOKEN")

echo "$FINISH_RESPONSE" | grep -q '"success":true' && \
    echo -e "${GREEN}✓ Finish match successful${NC}" || \
    echo -e "${RED}✗ Finish match failed: $FINISH_RESPONSE${NC}"
echo ""

echo -e "${YELLOW}=== Test Summary ===${NC}"
echo -e "${GREEN}All manual tests completed!${NC}"
echo -e "\nNote: Some tests may fail if MongoDB is not connected."
echo -e "To run with database: Ensure MongoDB is running at mongodb://localhost:27017\n"
