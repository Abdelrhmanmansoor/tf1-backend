# Matches System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT APPLICATION                          │
│                     (Frontend - Not Modified)                       │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ HTTP/REST + WebSocket
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         EXPRESS.JS SERVER                            │
│                         (server.js)                                  │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │              EXISTING PLATFORM ROUTES                         │ │
│  │  /api/v1/auth, /api/v1/players, etc.                         │ │
│  │  (Unchanged)                                                  │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │              OLD MATCH HUB (Preserved)                        │ │
│  │  /api/v1/match-hub/*                                          │ │
│  │  (Moved for backward compatibility)                           │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │      ⭐ NEW ISOLATED MATCHES SYSTEM ⭐                        │ │
│  │              /matches/*                                        │ │
│  │                                                                │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │             RATE LIMITERS                               │ │ │
│  │  │  • Auth: 10/15min                                       │ │ │
│  │  │  • Join/Leave: 30/15min                                 │ │ │
│  │  │  • Chat: 60/min                                         │ │ │
│  │  │  • General: 100/15min                                   │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  │                        ▼                                       │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │        AUTHENTICATION MIDDLEWARE                        │ │ │
│  │  │  • Validates JWT token                                  │ │ │
│  │  │  • Checks token type = 'matches'                        │ │ │
│  │  │  • Populates req.matchUser                              │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  │                        ▼                                       │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │                 ROUTES                                  │ │ │
│  │  │  /matches/auth/*        (3 endpoints)                   │ │ │
│  │  │  /matches/*             (13 endpoints)                  │ │ │
│  │  │  /matches/teams/*       (5 endpoints)                   │ │ │
│  │  │  /matches/:id/chat      (2 endpoints)                   │ │ │
│  │  │  /matches/notifications (3 endpoints)                   │ │ │
│  │  │  /matches/me/*          (1 endpoint)                    │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  │                        ▼                                       │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │              CONTROLLERS                                │ │ │
│  │  │  • authController       • matchController               │ │ │
│  │  │  • teamController       • chatController                │ │ │
│  │  │  • historyController    • notificationController        │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  │                        ▼                                       │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │               SERVICES                                  │ │ │
│  │  │  • matchService (state machine, capacity)               │ │ │
│  │  │  • teamService                                          │ │ │
│  │  │  • invitationService (transactions)                     │ │ │
│  │  │  • ratingService                                        │ │ │
│  │  │  • chatService                                          │ │ │
│  │  │  • notificationService                                  │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  │                        ▼                                       │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │         STATE MACHINE + UTILITIES                       │ │ │
│  │  │  • StateMachine (validation)                            │ │ │
│  │  │  • jwtService (token generation)                        │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ Mongoose
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          MONGODB DATABASE                            │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │        EXISTING PLATFORM COLLECTIONS                          │ │
│  │  users, players, coaches, clubs, etc.                         │ │
│  │  (Unchanged)                                                  │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │      ⭐ NEW MATCHES SYSTEM COLLECTIONS (ms_* prefix)         │ │
│  │                                                                │ │
│  │  • ms_match_users        (independent user accounts)         │ │
│  │  • ms_teams              (team entities)                     │ │
│  │  • ms_team_members       (team memberships)                  │ │
│  │  • ms_matches            (match entities)                    │ │
│  │  • ms_match_teams        (team-match assignments)            │ │
│  │  • ms_participations     (player joins - source of truth)    │ │
│  │  • ms_invitations        (match invitations)                 │ │
│  │  • ms_ratings            (player ratings)                    │ │
│  │  • ms_chat_messages      (chat messages)                     │ │
│  │  • ms_match_notifications (notifications)                    │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘

                                 │
                                 │ Real-time Events
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          SOCKET.IO                                   │
├─────────────────────────────────────────────────────────────────────┤
│  Namespaces:                                                         │
│  • matches:{matchId}               (match room)                     │
│  • matches:{matchId}:team:{teamId} (team chat)                      │
│  • matchUser:{userId}              (user notifications)             │
│                                                                       │
│  Events:                                                             │
│  • player_joined    • match_full    • match_started                │
│  • invitation       • chat_message  • notification                  │
└─────────────────────────────────────────────────────────────────────┘


STATE MACHINE FLOW:
═══════════════════

    ┌───────┐
    │ draft │
    └───┬───┘
        │ publish
        ▼
    ┌───────┐
    │ open  │◄──────────┐
    └───┬───┘           │
        │               │
        │ auto when     │ player
        │ capacity      │ leaves
        │ reached       │
        ▼               │
    ┌───────┐           │
    │ full  ├───────────┘
    └───┬───┘
        │ start
        ▼
┌────────────────┐
│  in_progress   │
└────────┬───────┘
         │
    ┌────┴─────┐
    │          │
    │ finish   │ cancel
    ▼          ▼
┌──────┐   ┌──────────┐
│finish│   │ canceled │
└──────┘   └──────────┘


SECURITY LAYERS:
═══════════════

1. Rate Limiting (4 tiers)
   └─► Prevents abuse & DDoS

2. JWT Authentication
   └─► Independent token system
   └─► Type validation
   └─► Expiry enforcement

3. Password Security
   └─► bcrypt hashing (10 rounds)

4. Input Validation
   └─► All endpoints validated
   └─► Schema validation

5. State Machine Guards
   └─► Prevents invalid transitions
   └─► HTTP 409 for violations

6. Transaction Support
   └─► Atomic operations
   └─► Row locking
   └─► Capacity enforcement

7. Database Isolation
   └─► Separate collections (ms_*)
   └─► UNIQUE constraints
   └─► Proper indexes


KEY FEATURES:
════════════

✅ Independent Authentication
✅ State Machine with Validation
✅ Transactional Operations
✅ Capacity Enforcement
✅ Real-time Notifications
✅ Chat System
✅ Team Management
✅ Player Ratings
✅ Match History
✅ WebSocket Integration
✅ Rate Limiting
✅ Complete Documentation
```
