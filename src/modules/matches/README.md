# Isolated Matches System

This is a fully isolated matches management system with independent authentication, database schema, and business logic.

## Overview

The matches system provides a complete platform for organizing and managing sports matches with teams, players, ratings, and chat functionality.

## Architecture

### Database Models (MongoDB/Mongoose)
- **MatchUser**: Independent user accounts for the matches system
- **Team**: Teams with captains and members
- **TeamMember**: Team membership with roles
- **Match**: Match entities with state machine
- **MatchTeam**: Team assignments to matches
- **Participation**: Source of truth for player joins
- **Invitation**: Match and team invitations
- **Rating**: Player ratings (1-5 stars)
- **ChatMessage**: Match chat messages
- **MatchNotification**: Notification persistence

### State Machine
Matches follow a strict state machine with enforced transitions:
- `draft` → `open`
- `open` → `full` (auto when capacity reached) or `canceled`
- `full` → `in_progress` or `open` (when player leaves)
- `in_progress` → `finished` or `canceled`
- `finished` → (terminal state)
- `canceled` → (terminal state)

Invalid transitions return HTTP 409 Conflict.

### Authentication
The matches system uses its own JWT-based authentication, completely isolated from the main platform auth:
- Token type: `matches`
- Secret: `MATCHES_JWT_SECRET` (env var)
- Token expiry: `MATCHES_JWT_EXPIRES_IN` (default: 7d)

## API Endpoints

All endpoints are under the `/matches` prefix.

### Authentication
- `POST /matches/auth/signup` - Register new match user
- `POST /matches/auth/login` - Login and get JWT token
- `GET /matches/auth/me` - Get current user info (requires auth)

### Matches
- `POST /matches` - Create a new match (draft state)
- `POST /matches/:id/publish` - Transition draft → open
- `GET /matches` - List matches (with filters: state, visibility)
- `GET /matches/:id` - Get match details with participants
- `POST /matches/:id/join` - Join a match (transactional with capacity checks)
- `POST /matches/:id/leave` - Leave a match (before in_progress)
- `POST /matches/:id/invite` - Invite a user to the match
- `POST /matches/:id/invitations/:inv_id/respond` - Accept/decline invitation
- `POST /matches/:id/start` - Start a match (open/full → in_progress)
- `POST /matches/:id/finish` - Finish a match (in_progress → finished)
- `POST /matches/:id/cancel` - Cancel a match
- `POST /matches/:id/rate` - Rate a player (only in finished matches)

### Chat
- `GET /matches/:id/chat` - Get chat messages
- `POST /matches/:id/chat` - Send a chat message (participants only)

### Teams
- `POST /matches/teams` - Create a new team
- `GET /matches/teams/my-teams` - Get user's teams
- `GET /matches/teams/:id` - Get team details with members
- `POST /matches/teams/:id/members` - Add team member (captain only)
- `DELETE /matches/teams/:id/members/:user_id` - Remove team member (captain only)

### History
- `GET /matches/me/matches/history` - Get user's match history with ratings

## Business Rules

### Participation
- `UNIQUE(match_id, user_id)` enforces single join per match
- Players can only join one team per match
- Source of truth for all match joins

### Capacity Management
- Join operations use MongoDB transactions with document locking
- Automatic state transition to `full` when `current_players >= max_players`
- Waitlist support when match is full
- Auto-transition back to `open` when player leaves from full match

### Ratings
- Only allowed when `match.state === 'finished'`
- Both rater and ratee must be confirmed participants
- Score range: 1-5
- One rating per rater-ratee pair per match

### Invitations
- Expire after 7 days
- Accept triggers transactional join with capacity checks
- One invitation per user per match

## Socket.IO Events

The system emits real-time events via Socket.IO:

### Rooms
- `matches:{matchId}` - Match-specific room
- `matches:{matchId}:team:{teamId}` - Team-specific chat room
- `matchUser:{userId}` - User-specific notifications

### Events
- `player_joined` - When a player joins
- `match_full` - When match reaches capacity
- `match_started` - When match starts
- `invitation` - When user receives invitation
- `chat_message` - When chat message is sent

## Environment Variables

Add these to your `.env` file:

```env
# Matches System JWT
MATCHES_JWT_SECRET=your-secret-key-change-in-production
MATCHES_JWT_EXPIRES_IN=7d

# MongoDB connection (shared with main platform)
MONGODB_URI=mongodb://localhost:27017/sportsplatform
```

## Usage Examples

### Register and Login
```bash
# Register
curl -X POST http://localhost:4000/matches/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "player@example.com",
    "password": "password123",
    "display_name": "John Player"
  }'

# Login
curl -X POST http://localhost:4000/matches/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "player@example.com",
    "password": "password123"
  }'
```

### Create and Publish a Match
```bash
# Create (requires auth token)
curl -X POST http://localhost:4000/matches \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "starts_at": "2024-12-15T14:00:00Z",
    "venue": "Central Stadium",
    "max_players": 10,
    "team_size": 5,
    "mode": "player_pool",
    "visibility": "public"
  }'

# Publish (draft → open)
curl -X POST http://localhost:4000/matches/MATCH_ID/publish \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Join a Match
```bash
curl -X POST http://localhost:4000/matches/MATCH_ID/join \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Rate a Player
```bash
curl -X POST http://localhost:4000/matches/MATCH_ID/rate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ratee_id": "USER_ID",
    "score": 5,
    "comment": "Great teamwork!"
  }'
```

## Testing

The system can be tested manually using the examples above or by running:

```bash
npm test
```

## Integration Notes

- The old match hub has been moved to `/api/v1/match-hub` for backward compatibility
- The new isolated system is at `/matches`
- Both systems can coexist without conflicts
- Each has independent authentication and database collections

## Security

- All endpoints (except signup/login) require authentication
- JWT tokens are validated on every request
- Passwords are hashed with bcrypt (10 rounds)
- Input validation on all endpoints
- MongoDB transactions ensure data consistency
- State machine prevents invalid transitions

## Future Enhancements

- Email notifications
- Advanced team management
- Match scheduling and reminders
- Tournament support
- Payment integration
- Mobile app support
