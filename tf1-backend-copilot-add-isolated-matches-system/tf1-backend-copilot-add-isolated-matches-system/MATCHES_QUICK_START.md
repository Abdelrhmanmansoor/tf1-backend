# Matches System Quick Start Guide

## Prerequisites
- Node.js 18+ installed
- MongoDB running locally or connection string
- npm dependencies installed

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create or update `.env` file:
   ```env
   MONGODB_URI=mongodb://localhost:27017/sportsplatform
   MATCHES_JWT_SECRET=your-super-secret-key-change-in-production
   MATCHES_JWT_EXPIRES_IN=7d
   PORT=4000
   ```

3. **Start MongoDB** (if running locally):
   ```bash
   mongod
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

## Quick Test

Once the server is running, test the health endpoint:
```bash
curl http://localhost:4000/health
```

## Create Your First Match

### 1. Register a User
```bash
curl -X POST http://localhost:4000/matches/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "player@example.com",
    "password": "SecurePass123",
    "display_name": "John Doe"
  }'
```

Save the `token` from the response.

### 2. Create a Match
```bash
curl -X POST http://localhost:4000/matches \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "starts_at": "2024-12-20T18:00:00Z",
    "venue": "Central Stadium",
    "max_players": 10,
    "team_size": 5,
    "mode": "player_pool",
    "visibility": "public"
  }'
```

Save the match `_id` from the response.

### 3. Publish the Match (draft → open)
```bash
curl -X POST http://localhost:4000/matches/MATCH_ID/publish \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Join the Match
```bash
curl -X POST http://localhost:4000/matches/MATCH_ID/join \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 5. Send a Chat Message
```bash
curl -X POST http://localhost:4000/matches/MATCH_ID/chat \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Looking forward to the match!"
  }'
```

## Automated Testing

Run the automated test script:
```bash
./test-matches-system.sh
```

This will test all major endpoints in sequence.

## Common Operations

### List Open Matches
```bash
curl -X GET "http://localhost:4000/matches?state=open" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Match Details
```bash
curl -X GET http://localhost:4000/matches/MATCH_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Start a Match
```bash
curl -X POST http://localhost:4000/matches/MATCH_ID/start \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Finish a Match
```bash
curl -X POST http://localhost:4000/matches/MATCH_ID/finish \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Rate a Player (after match is finished)
```bash
curl -X POST http://localhost:4000/matches/MATCH_ID/rate \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "ratee_id": "USER_ID_TO_RATE",
    "score": 5,
    "comment": "Excellent player!"
  }'
```

### Get Your Match History
```bash
curl -X GET http://localhost:4000/matches/me/matches/history \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## State Machine

Matches follow a strict state machine:

```
draft → open → full → in_progress → finished
         ↓              ↓
      canceled      canceled
```

Valid transitions:
- `draft` → `open` (publish)
- `open` → `full` (auto when capacity reached)
- `open` → `canceled` (cancel)
- `full` → `in_progress` (start)
- `full` → `open` (when player leaves)
- `in_progress` → `finished` (finish)
- `in_progress` → `canceled` (cancel)

Invalid transitions will return HTTP 409 Conflict.

## Teams

### Create a Team
```bash
curl -X POST http://localhost:4000/matches/teams \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Thunder Squad",
    "logo_url": "https://example.com/logo.png"
  }'
```

### Get Your Teams
```bash
curl -X GET http://localhost:4000/matches/teams/my-teams \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Add Team Member (as captain)
```bash
curl -X POST http://localhost:4000/matches/teams/TEAM_ID/members \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "USER_ID_TO_ADD",
    "role": "player"
  }'
```

## Troubleshooting

### Server won't start
- Check MongoDB is running
- Verify MONGODB_URI in .env
- Check port 4000 is available

### Authentication errors
- Ensure token is in `Authorization: Bearer TOKEN` format
- Check MATCHES_JWT_SECRET is set
- Verify token hasn't expired

### Can't join match
- Check match state is `open` or `full`
- Verify you haven't already joined
- Check match hasn't reached capacity

### State transition fails
- Review state machine rules
- Check current match state with GET /matches/:id
- Verify you're the match creator for protected actions

## WebSocket Events

Connect to Socket.IO for real-time updates:

```javascript
const socket = io('http://localhost:4000');

// Join match room
socket.emit('join', { room: `matches:${matchId}` });

// Listen for events
socket.on('player_joined', (data) => {
  console.log('Player joined:', data);
});

socket.on('match_full', (data) => {
  console.log('Match is full:', data);
});

socket.on('match_started', (data) => {
  console.log('Match started:', data);
});

socket.on('chat_message', (data) => {
  console.log('New message:', data);
});
```

## API Documentation

Full API documentation: [src/modules/matches/README.md](src/modules/matches/README.md)

## Support

For issues or questions:
1. Check the full README: `src/modules/matches/README.md`
2. Review environment configuration: `MATCHES_ENV_CONFIG.md`
3. Run the test script: `./test-matches-system.sh`
4. Check server logs for detailed error messages
