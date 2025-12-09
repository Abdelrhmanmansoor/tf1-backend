# Matches System API Documentation

## Overview

The Matches System is an isolated backend service for managing sports matches with independent authentication. It uses httpOnly cookies for secure session management and includes email verification.

**Base URL**: `/matches/api`

## Authentication

The Matches System uses JWT tokens stored in httpOnly cookies for authentication. The cookie name is `matches_token`.

### Cookie Details
- **Name**: `matches_token`
- **httpOnly**: `true`
- **Secure**: `true` (in production)
- **SameSite**: `none` (in production) or `lax` (in development)
- **Max Age**: 7 days

### Backward Compatibility
For backward compatibility, Bearer token authentication is also supported:
```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### 1. Register

Create a new matches user account and trigger email verification.

**Endpoint**: `POST /matches/api/auth/register`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "user": {
    "id": "64f5a1b2c3d4e5f6a7b8c9d0",
    "email": "user@example.com",
    "name": "John Doe",
    "verified": false,
    "role": "MatchUser"
  }
}
```

**Notes**:
- Password must be at least 8 characters
- Email verification email is sent using the existing email service
- User cannot login until email is verified

---

### 2. Verify Email

Verify user's email address using the token sent via email.

**Endpoint**: `POST /matches/api/auth/verify` or `GET /matches/api/auth/verify`

**Query Parameters**:
- `token` (required): The verification token from the email

**Example**:
```
GET /matches/api/auth/verify?token=a1b2c3d4e5f6...
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Email verified successfully",
  "user": {
    "id": "64f5a1b2c3d4e5f6a7b8c9d0",
    "email": "user@example.com",
    "name": "John Doe",
    "verified": true,
    "role": "MatchUser"
  }
}
```

**Error Response** (400 Bad Request):
```json
{
  "success": false,
  "message": "Invalid or expired verification token",
  "code": "INVALID_TOKEN"
}
```

---

### 3. Login

Login with email and password. Issues httpOnly cookie on success.

**Endpoint**: `POST /matches/api/auth/login`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "64f5a1b2c3d4e5f6a7b8c9d0",
    "email": "user@example.com",
    "name": "John Doe",
    "verified": true,
    "role": "MatchUser",
    "is_admin": false
  }
}
```

**Sets Cookie**: `matches_token=<jwt_token>; HttpOnly; Secure; SameSite=None; Max-Age=604800`

**Error Response** (403 Forbidden):
```json
{
  "success": false,
  "message": "Please verify your email before logging in",
  "code": "EMAIL_NOT_VERIFIED"
}
```

---

### 4. Get Current User

Get the currently authenticated user's information.

**Endpoint**: `GET /matches/api/auth/me`

**Authentication**: Required (via cookie or Bearer token)

**Response** (200 OK):
```json
{
  "success": true,
  "user": {
    "id": "64f5a1b2c3d4e5f6a7b8c9d0",
    "email": "user@example.com",
    "name": "John Doe",
    "verified": true,
    "role": "MatchUser",
    "is_admin": false,
    "created_at": "2024-09-05T10:30:00.000Z",
    "updated_at": "2024-09-05T10:30:00.000Z"
  }
}
```

---

### 5. Logout

Logout the current user by clearing the httpOnly cookie.

**Endpoint**: `POST /matches/api/auth/logout`

**Authentication**: Not required (but cookie must exist to clear)

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Logout successful"
}
```

**Clears Cookie**: `matches_token`

---

## Matches Endpoints

### 6. List Matches

List and search matches with optional filtering.

**Endpoint**: `GET /matches/api/matches`

**Authentication**: Optional (public endpoint)

**Query Parameters** (all optional):
- `sport`: Filter by sport (e.g., "Football", "Basketball")
- `city`: Filter by city
- `area`: Filter by area
- `level`: Filter by skill level ("beginner", "intermediate", "advanced")
- `status`: Filter by match status ("open", "full", "finished")
- `state`: Filter by legacy state field
- `dateFrom`: Filter matches from this date (ISO 8601)
- `dateTo`: Filter matches until this date (ISO 8601)
- `limit`: Maximum number of results (default: 50, max: 100)

**Example**:
```
GET /matches/api/matches?sport=Football&city=Cairo&level=intermediate&limit=20
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "_id": "64f5a1b2c3d4e5f6a7b8c9d0",
        "title": "Friday Football Match",
        "sport": "Football",
        "city": "Cairo",
        "area": "Nasr City",
        "location": "Sporting Club",
        "date": "2024-09-15T00:00:00.000Z",
        "time": "18:00",
        "level": "intermediate",
        "max_players": 14,
        "current_players": 8,
        "notes": "Bring your own water",
        "status": "open",
        "owner_id": {
          "_id": "64f5a1b2c3d4e5f6a7b8c9d1",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "created_at": "2024-09-05T10:30:00.000Z",
        "updated_at": "2024-09-05T10:30:00.000Z"
      }
    ]
  }
}
```

---

### 7. Get Match Details

Get detailed information about a specific match.

**Endpoint**: `GET /matches/api/matches/:id`

**Authentication**: Optional

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "match": {
      "_id": "64f5a1b2c3d4e5f6a7b8c9d0",
      "title": "Friday Football Match",
      "sport": "Football",
      "city": "Cairo",
      "area": "Nasr City",
      "location": "Sporting Club",
      "date": "2024-09-15T00:00:00.000Z",
      "time": "18:00",
      "level": "intermediate",
      "max_players": 14,
      "current_players": 8,
      "notes": "Bring your own water",
      "status": "open",
      "owner_id": {
        "_id": "64f5a1b2c3d4e5f6a7b8c9d1",
        "name": "John Doe",
        "email": "john@example.com"
      }
    },
    "participants": [
      {
        "user_id": {
          "_id": "64f5a1b2c3d4e5f6a7b8c9d2",
          "name": "Jane Smith",
          "email": "jane@example.com"
        },
        "status": "joined",
        "joined_at": "2024-09-06T14:20:00.000Z"
      }
    ]
  }
}
```

---

### 8. Create Match

Create a new match. Requires authentication.

**Endpoint**: `POST /matches/api/matches`

**Authentication**: Required

**Request Body** (New Format):
```json
{
  "title": "Friday Football Match",
  "sport": "Football",
  "city": "Cairo",
  "area": "Nasr City",
  "location": "Sporting Club",
  "date": "2024-09-15",
  "time": "18:00",
  "level": "intermediate",
  "max_players": 14,
  "notes": "Bring your own water"
}
```

**Required Fields**:
- `title`: Match title
- `sport`: Type of sport
- `city`: City where match will be held
- `area`: Area within the city
- `location`: Specific venue/location
- `date`: Match date (ISO 8601 format)
- `time`: Match time (HH:MM format)
- `level`: Skill level ("beginner", "intermediate", or "advanced")
- `max_players`: Maximum number of players (minimum 2)

**Optional Fields**:
- `notes`: Additional notes or requirements

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Match created successfully",
  "data": {
    "match": {
      "_id": "64f5a1b2c3d4e5f6a7b8c9d0",
      "title": "Friday Football Match",
      "sport": "Football",
      "city": "Cairo",
      "area": "Nasr City",
      "location": "Sporting Club",
      "date": "2024-09-15T00:00:00.000Z",
      "time": "18:00",
      "level": "intermediate",
      "max_players": 14,
      "current_players": 0,
      "notes": "Bring your own water",
      "status": "open",
      "owner_id": "64f5a1b2c3d4e5f6a7b8c9d1"
    }
  }
}
```

---

### 9. Join Match

Join an existing match. Requires authentication.

**Endpoint**: `POST /matches/api/matches/:id/join`

**Authentication**: Required

**Request Body**: Empty or `{}`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Successfully joined match",
  "data": {
    "participation": {
      "_id": "64f5a1b2c3d4e5f6a7b8c9d3",
      "match_id": "64f5a1b2c3d4e5f6a7b8c9d0",
      "user_id": "64f5a1b2c3d4e5f6a7b8c9d1",
      "status": "joined",
      "joined_at": "2024-09-07T16:45:00.000Z"
    },
    "match": {
      "_id": "64f5a1b2c3d4e5f6a7b8c9d0",
      "current_players": 9,
      "status": "open"
    }
  }
}
```

**Error Responses**:

**400 Bad Request** - Already joined:
```json
{
  "success": false,
  "message": "User already joined this match"
}
```

**400 Bad Request** - Match full:
```json
{
  "success": false,
  "message": "Match is full"
}
```

**Notes**:
- Automatically increments `current_players`
- Changes match status to "full" when capacity is reached
- Prevents duplicate joins

---

### 10. Leave Match

Leave a match you've joined. Requires authentication.

**Endpoint**: `POST /matches/api/matches/:id/leave`

**Authentication**: Required

**Request Body**: Empty or `{}`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Successfully left match",
  "data": {
    "match": {
      "_id": "64f5a1b2c3d4e5f6a7b8c9d0",
      "current_players": 8,
      "status": "open"
    }
  }
}
```

**Error Responses**:

**400 Bad Request** - Not participating:
```json
{
  "success": false,
  "message": "User is not participating in this match"
}
```

**400 Bad Request** - Match finished:
```json
{
  "success": false,
  "message": "Cannot leave finished match"
}
```

**Notes**:
- Automatically decrements `current_players`
- Changes match status from "full" to "open" if space becomes available
- Cannot leave finished matches

---

### 11. Get My Matches

Get all matches created or joined by the authenticated user.

**Endpoint**: `GET /matches/api/my-matches`

**Authentication**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "created": [
      {
        "_id": "64f5a1b2c3d4e5f6a7b8c9d0",
        "title": "Friday Football Match",
        "sport": "Football",
        "city": "Cairo",
        "status": "open",
        "current_players": 8,
        "max_players": 14,
        "date": "2024-09-15T00:00:00.000Z"
      }
    ],
    "joined": [
      {
        "_id": "64f5a1b2c3d4e5f6a7b8c9d4",
        "title": "Saturday Basketball Game",
        "sport": "Basketball",
        "city": "Cairo",
        "status": "full",
        "current_players": 10,
        "max_players": 10,
        "date": "2024-09-16T00:00:00.000Z"
      }
    ]
  }
}
```

**Notes**:
- `created`: Matches where the user is the owner
- `joined`: Matches the user has joined as a participant

---

## Data Models

### MatchUser (ms_match_users collection)
```javascript
{
  name: String,              // User's full name
  email: String,             // Unique email address
  password_hash: String,     // Hashed password
  verified: Boolean,         // Email verification status
  role: String,              // Always "MatchUser"
  emailVerificationToken: String,
  emailVerificationTokenExpires: Date,
  is_admin: Boolean,
  created_at: Date,
  updated_at: Date
}
```

### Match (ms_matches collection)
```javascript
{
  owner_id: ObjectId,        // Reference to MatchUser
  title: String,             // Match title
  sport: String,             // Type of sport
  city: String,              // City
  area: String,              // Area within city
  location: String,          // Specific venue
  date: Date,                // Match date
  time: String,              // Match time (HH:MM)
  level: String,             // "beginner" | "intermediate" | "advanced"
  max_players: Number,       // Maximum capacity
  current_players: Number,   // Current participants count
  notes: String,             // Optional notes
  status: String,            // "open" | "full" | "finished"
  created_at: Date,
  updated_at: Date
}
```

### Participation (ms_match_participants collection)
```javascript
{
  match_id: ObjectId,        // Reference to Match
  user_id: ObjectId,         // Reference to MatchUser
  status: String,            // "joined"
  joined_at: Date,
  created_at: Date,
  updated_at: Date
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `NO_TOKEN` | No authentication token provided |
| `INVALID_TOKEN` | Invalid or malformed token |
| `TOKEN_EXPIRED` | Token has expired |
| `INVALID_TOKEN_TYPE` | Token is not a matches token |
| `USER_NOT_FOUND` | User not found with the provided token |
| `EMAIL_NOT_VERIFIED` | Email must be verified before login |
| `TOKEN_MISSING` | Verification token is required |

---

## Rate Limiting

Different rate limits apply to different endpoint types:

- **Auth endpoints** (`/auth/register`, `/auth/login`): 10 requests per 15 minutes
- **Join/Leave endpoints**: 30 requests per 15 minutes
- **General matches endpoints**: 100 requests per 15 minutes

---

## Environment Variables

Configure these environment variables for the matches system:

```bash
# JWT Configuration
MATCHES_JWT_SECRET=your-secret-key-here
MATCHES_JWT_EXPIRES_IN=7d

# Email Configuration (reused from main system)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=your-smtp-password
SMTP_FROM_EMAIL=noreply@example.com
SMTP_FROM_NAME="Sports Platform"

# Frontend URL (for email links)
FRONTEND_URL=https://your-frontend-url.com

# Node Environment
NODE_ENV=production
```

---

## Frontend Integration Guide

### 1. Registration Flow
```javascript
// Register
const response = await fetch('/matches/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, name })
});

// Inform user to check email
// User clicks verification link in email
// Link goes to frontend route, extract token from query params
// Call verify endpoint

await fetch(`/matches/api/auth/verify?token=${token}`);
```

### 2. Login Flow
```javascript
const response = await fetch('/matches/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Important: includes cookies
  body: JSON.stringify({ email, password })
});

// Cookie is automatically set by browser
// Redirect to /matches/dashboard
```

### 3. Authenticated Requests
```javascript
// All subsequent requests automatically include the cookie
const response = await fetch('/matches/api/matches', {
  credentials: 'include' // Important: includes cookies
});
```

### 4. Logout
```javascript
await fetch('/matches/api/auth/logout', {
  method: 'POST',
  credentials: 'include'
});

// Redirect to login page
```

---

## Testing with cURL

### Register
```bash
curl -X POST http://localhost:4000/matches/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

### Verify (use token from email)
```bash
curl "http://localhost:4000/matches/api/auth/verify?token=YOUR_TOKEN_HERE"
```

### Login
```bash
curl -X POST http://localhost:4000/matches/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Get Current User
```bash
curl http://localhost:4000/matches/api/auth/me \
  -b cookies.txt
```

### Create Match
```bash
curl -X POST http://localhost:4000/matches/api/matches \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title":"Friday Football",
    "sport":"Football",
    "city":"Cairo",
    "area":"Nasr City",
    "location":"Club",
    "date":"2024-09-15",
    "time":"18:00",
    "level":"intermediate",
    "max_players":14
  }'
```

### List Matches
```bash
curl "http://localhost:4000/matches/api/matches?sport=Football&city=Cairo"
```

### Join Match
```bash
curl -X POST http://localhost:4000/matches/api/matches/MATCH_ID/join \
  -b cookies.txt
```

### Get My Matches
```bash
curl http://localhost:4000/matches/api/my-matches \
  -b cookies.txt
```

---

## Security Considerations

1. **httpOnly Cookies**: Cookies are httpOnly to prevent XSS attacks
2. **Secure Flag**: In production, cookies use the Secure flag (HTTPS only)
3. **SameSite**: Prevents CSRF attacks
4. **Email Verification**: Required before login
5. **Rate Limiting**: Protects against brute force attacks
6. **Password Hashing**: Uses bcrypt with salt
7. **Token Expiration**: Verification tokens expire after 24 hours
8. **JWT Expiration**: JWTs expire after 7 days

---

## Legacy Compatibility

The system maintains backward compatibility with the old format:

### Legacy Routes (still work)
- `/matches/auth/*` (in addition to `/matches/api/auth/*`)
- `/matches/matches/*` (in addition to `/matches/api/matches/*`)

### Legacy Match Format
The old match creation format is still supported:
```json
{
  "starts_at": "2024-09-15T18:00:00Z",
  "venue": "Sporting Club",
  "max_players": 14,
  "team_size": 7,
  "mode": "player_pool"
}
```

However, the new format is recommended for all new implementations.
