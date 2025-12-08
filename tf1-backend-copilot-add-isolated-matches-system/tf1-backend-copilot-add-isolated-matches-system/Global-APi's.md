🌐 Global/Shared APIs (Cross-Platform Features)
These APIs work across all 4 roles and connect the entire platform:
1. 💬 Messaging System (Real-time Chat)
Features:
Direct 1-on-1 conversations
Group chats (teams, club announcements)
File/image/video sharing
Read receipts
Typing indicators
Online/offline status
Message reactions (emoji)
Message edit/delete
Search message history
Mute conversations
Block users
Models:
Conversation Model:
{
  _id: ObjectId,
  type: "direct" | "group",
  
  // Participants
  participants: [
    {
      userId: ObjectId,
      role: "player" | "coach" | "club" | "specialist",
      joinedAt: Date,
      isActive: true,
      lastReadAt: Date,
      isMuted: false
    }
  ],
  
  // Group chat specific
  name: String,              // For group chats
  avatar: String,            // Group avatar
  createdBy: ObjectId,       // Group creator
  admins: [ObjectId],        // Group admins
  
  // Last message preview
  lastMessage: {
    content: String,
    senderId: ObjectId,
    sentAt: Date,
    messageType: "text" | "image" | "file"
  },
  
  // Unread counts per participant
  unreadCounts: {
    type: Map,
    of: Number,
    default: {}
  },
  
  // Related entities (optional links)
  relatedTo: {
    entityType: "training_session" | "consultation" | "job" | "club",
    entityId: ObjectId
  },
  
  isArchived: false,
  createdAt: Date,
  updatedAt: Date
}
Message Model:
{
  _id: ObjectId,
  conversationId: ObjectId,
  
  senderId: ObjectId,
  senderRole: "player" | "coach" | "club" | "specialist",
  
  messageType: "text" | "image" | "video" | "file" | "audio" | "system",
  
  // Content
  content: String,              // Text content
  contentAr: String,            // Arabic translation (optional)
  
  // Attachments
  attachments: [
    {
      fileType: "image" | "video" | "audio" | "document",
      fileName: String,
      fileUrl: String,
      fileSize: Number,
      mimeType: String
    }
  ],
  
  // Read tracking
  readBy: [
    {
      userId: ObjectId,
      readAt: Date
    }
  ],
  
  // Reactions
  reactions: [
    {
      userId: ObjectId,
      emoji: String,
      createdAt: Date
    }
  ],
  
  // Reply/thread
  replyTo: ObjectId,            // Reply to another message
  
  // Edit/delete
  isEdited: false,
  editHistory: [
    {
      content: String,
      editedAt: Date
    }
  ],
  isDeleted: false,
  deletedAt: Date,
  deletedBy: ObjectId,
  
  // System messages
  systemMessageType: "user_joined" | "user_left" | "session_booked" | "payment_received",
  
  sentAt: Date,
  createdAt: Date,
  updatedAt: Date
}
APIs:
// Conversations
GET    /api/v1/messages/conversations              // List all conversations
GET    /api/v1/messages/conversations/:id          // Get conversation details
POST   /api/v1/messages/conversations              // Create new conversation
PUT    /api/v1/messages/conversations/:id          // Update conversation (name, avatar)
DELETE /api/v1/messages/conversations/:id          // Delete/leave conversation
PUT    /api/v1/messages/conversations/:id/mute     // Mute/unmute
PUT    /api/v1/messages/conversations/:id/archive  // Archive conversation
POST   /api/v1/messages/conversations/:id/participants  // Add participant (group)
DELETE /api/v1/messages/conversations/:id/participants/:userId  // Remove participant

// Messages
GET    /api/v1/messages/conversations/:id/messages     // Get messages in conversation
POST   /api/v1/messages/conversations/:id/messages     // Send message
PUT    /api/v1/messages/:messageId                     // Edit message
DELETE /api/v1/messages/:messageId                     // Delete message
POST   /api/v1/messages/:messageId/react               // Add reaction
PUT    /api/v1/messages/:messageId/read                // Mark as read

// Real-time (Socket.io events)
socket.emit('send_message', { conversationId, content })
socket.on('new_message', (message) => {})
socket.emit('typing', { conversationId })
socket.on('user_typing', ({ userId, conversationId }) => {})
socket.on('message_read', ({ messageId, userId }) => {})
Use Cases:
Player ↔ Coach:
PLAYER sends message to COACH
  → "Hi, can we reschedule Saturday's session to Sunday?"
COACH receives notification + real-time message
  → "Sure, Sunday 10am works for me"
System creates automatic message when session rescheduled
  → "Session moved to Sunday, Jan 15 at 10:00 AM"
Club → Team (Group Chat):
CLUB creates group chat: "U18 Football Team"
  → Adds all players, coach, specialist
CLUB sends announcement
  → "Training cancelled tomorrow due to weather"
All members receive notification
Coach can reply, players can react with emoji
2. 🔍 Global Search System
Features:
Search across all entities (users, clubs, jobs, posts)
Advanced filters
Autocomplete/suggestions
Search history
Recent searches
Saved searches
Fuzzy matching
Multilingual search (Arabic/English)
Location-based search
Relevance ranking
Search Entities:
A. Search Users (Players, Coaches, Specialists):
GET /api/v1/search/users?q=Ahmed&role=coach&sport=football&location=Cairo&minRating=4

Response:
{
  results: [
    {
      _id: "...",
      role: "coach",
      fullName: "Ahmed Mohamed",
      avatar: "url",
      sport: "Football",
      location: "Cairo, Egypt",
      rating: 4.8,
      reviewCount: 45,
      specializations: ["Youth Training", "Goalkeeping"],
      priceRange: "$20-$50",
      availability: "Available"
    }
  ],
  total: 15,
  page: 1,
  hasMore: true
}
Filters:
q: Search query (name, bio, specialization)
role: player | coach | specialist
sport: Football, Basketball, Tennis, etc.
location: City/country
minRating: 1-5
maxPrice: Number
minPrice: Number
availability: available | busy | inactive
verified: true | false
experienceLevel: beginner | intermediate | advanced | professional
ageGroup: kids | youth | adults | seniors (for coaches/specialists)
specialization: Array of specializations
certifications: Has specific certifications
language: Arabic | English | Both
B. Search Clubs:
GET /api/v1/search/clubs?q=Cairo&sport=football&verified=true&hasOpenPositions=true

Response:
{
  results: [
    {
      _id: "...",
      name: "Cairo Sports Academy",
      logo: "url",
      location: "Cairo, Egypt",
      sports: ["Football", "Basketball"],
      rating: 4.5,
      memberCount: 120,
      verified: true,
      facilities: ["Outdoor Field", "Gym", "Pool"],
      programs: ["Youth Training", "Professional Team"],
      openPositions: 3
    }
  ]
}
Filters:
q: Club name, description
sport: Sport offered
location: City/country
verified: true | false
organizationType: sports_club | academy | training_center | gym
minRating: 1-5
hasOpenPositions: true | false
facilityType: outdoor_field | indoor_court | gym | pool
programType: youth | professional | fitness
C. Search Jobs/Opportunities:
GET /api/v1/search/jobs?role=player&sport=football&location=Cairo&jobType=contract

Response:
{
  results: [
    {
      _id: "...",
      title: "U18 Striker Position",
      club: {
        _id: "...",
        name: "Cairo Sports Academy",
        logo: "url"
      },
      jobType: "contract",
      sport: "Football",
      position: "Striker",
      location: "Cairo, Egypt",
      salaryRange: "$500-$1000/month",
      deadline: "2025-02-01",
      applicationCount: 25,
      postedAt: "2025-01-15"
    }
  ]
}
Filters:
q: Job title, description
role: player | coach | specialist | staff
sport: Sport
location: City/country
jobType: contract | trial | seasonal | volunteer
salaryMin: Number
salaryMax: Number
postedWithin: 7d | 30d | 90d
clubId: Specific club
D. Unified Global Search:
GET /api/v1/search/all?q=football+Cairo

Response:
{
  users: {
    coaches: [...],
    players: [...],
    specialists: [...]
  },
  clubs: [...],
  jobs: [...],
  total: {
    users: 45,
    clubs: 12,
    jobs: 8
  }
}
Search APIs:
// Main search endpoints
GET  /api/v1/search/users           // Search users (all roles)
GET  /api/v1/search/coaches         // Search coaches only
GET  /api/v1/search/players         // Search players only
GET  /api/v1/search/specialists     // Search specialists only
GET  /api/v1/search/clubs           // Search clubs
GET  /api/v1/search/jobs            // Search jobs/opportunities
GET  /api/v1/search/all             // Global search (all entities)

// Autocomplete & suggestions
GET  /api/v1/search/autocomplete?q=ahmed    // Quick suggestions
GET  /api/v1/search/suggestions             // Personalized suggestions

// Search history & saved searches
GET  /api/v1/search/history                 // User's search history
POST /api/v1/search/saved                   // Save a search
GET  /api/v1/search/saved                   // Get saved searches
DELETE /api/v1/search/saved/:id             // Delete saved search
Search Index (MongoDB Text Index):
// User collection indexes
userSchema.index({
  'firstName': 'text',
  'lastName': 'text',
  'email': 'text'
});

// PlayerProfile indexes
playerProfileSchema.index({
  'sports': 1,
  'primarySport': 1,
  'location.city': 1,
  'rating': -1,
  'level': 1
});

// CoachProfile indexes
coachProfileSchema.index({
  'sports': 1,
  'specializations': 1,
  'location.city': 1,
  'rating': -1,
  'pricing.sessionPrice': 1,
  'certifications.name': 'text'
});

// ClubProfile indexes
clubProfileSchema.index({
  'organizationName': 'text',
  'description': 'text',
  'sports': 1,
  'location.city': 1,
  'rating': -1,
  'verified': 1
});

// Job indexes
jobSchema.index({
  'title': 'text',
  'description': 'text',
  'sport': 1,
  'jobType': 1,
  'location': 1,
  'deadline': 1
});
3. 🔔 Notification System
Notification Model:
{
  _id: ObjectId,
  userId: ObjectId,              // Recipient
  userRole: "player" | "coach" | "club" | "specialist",
  
  type: String,                  // Notification type (see below)
  title: String,
  titleAr: String,
  message: String,
  messageAr: String,
  
  // Related entity
  relatedTo: {
    entityType: "training_request" | "job" | "application" | "message" | "review" | "session",
    entityId: ObjectId
  },
  
  // Action link
  actionUrl: String,             // Deep link to relevant page
  
  // Status
  isRead: false,
  readAt: Date,
  
  // Delivery channels
  channels: {
    inApp: true,                 // In-app notification
    email: false,                // Email sent
    push: false,                 // Push notification sent
    sms: false                   // SMS sent (if enabled)
  },
  
  // Priority
  priority: "low" | "normal" | "high" | "urgent",
  
  // Grouping (for bundling similar notifications)
  groupKey: String,              // e.g., "training_requests_2025-01"
  
  createdAt: Date,
  expiresAt: Date                // Auto-delete after 30 days
}
Notification Types:
For Players:
training_offer - New training offer from coach
training_accepted - Coach accepted your request
training_rejected - Coach rejected your request
session_reminder - Session starting in 1 hour
session_cancelled - Coach cancelled session
session_completed - Please rate your coach
job_match - New job matches your profile
club_accepted - Club accepted your membership
club_rejected - Club rejected your membership
message_received - New message from coach/club
review_received - Coach reviewed your progress
For Coaches:
training_request - New training request from player
session_booked - Player booked a session
session_cancelled - Player cancelled session
payment_received - Payment received for session
review_received - Player left a review
club_invitation - Club invited you to apply
message_received - New message from player/club
For Specialists:
consultation_request - New consultation request
session_booked - Client booked session
session_cancelled - Client cancelled
payment_received - Payment received
review_received - Client left review
club_offer - Club offered you position
message_received - New message
For Clubs:
membership_request - New membership request
job_application - New application for job
payment_received - Membership fee received
review_received - Member left review
facility_booking - New facility booking request
message_received - New message
Notification APIs:
// Get notifications
GET  /api/v1/notifications                    // List all notifications
GET  /api/v1/notifications/unread             // Unread only
GET  /api/v1/notifications/unread/count       // Unread count

// Mark as read
PUT  /api/v1/notifications/:id/read           // Mark one as read
PUT  /api/v1/notifications/read-all           // Mark all as read
PUT  /api/v1/notifications/read-multiple      // Mark multiple as read

// Delete
DELETE /api/v1/notifications/:id              // Delete one
DELETE /api/v1/notifications/clear-all        // Clear all

// Settings
GET  /api/v1/notifications/settings           // Get notification preferences
PUT  /api/v1/notifications/settings           // Update preferences

// Real-time (Socket.io)
socket.on('new_notification', (notification) => {})
Notification Preferences:
{
  userId: ObjectId,
  
  preferences: {
    // Channel preferences
    email: {
      enabled: true,
      frequency: "instant" | "daily_digest" | "weekly_digest"
    },
    push: {
      enabled: true
    },
    sms: {
      enabled: false
    },
    
    // Type preferences
    trainingRequests: {
      inApp: true,
      email: true,
      push: true
    },
    messages: {
      inApp: true,
      email: false,
      push: true
    },
    payments: {
      inApp: true,
      email: true,
      push: false
    },
    reviews: {
      inApp: true,
      email: true,
      push: true
    },
    jobMatches: {
      inApp: true,
      email: true,
      push: false
    },
    sessionReminders: {
      inApp: true,
      email: false,
      push: true
    }
  },
  
  // Quiet hours
  quietHours: {
    enabled: true,
    start: "22:00",
    end: "08:00",
    timezone: "Africa/Cairo"
  },
  
  updatedAt: Date
}
4. ⭐ Rating & Review System (Universal)
Review Model:
{
  _id: ObjectId,
  
  // Who is being reviewed
  revieweeId: ObjectId,
  revieweeRole: "coach" | "specialist" | "club",
  
  // Who is writing the review
  reviewerId: ObjectId,
  reviewerRole: "player" | "coach",
  
  // Related to what
  relatedTo: {
    entityType: "training_session" | "consultation_session" | "club_membership",
    entityId: ObjectId
  },
  
  // Rating
  rating: Number,                // 1-5 stars
  
  // Review content
  title: String,
  review: String,
  reviewAr: String,
  
  // Detailed ratings (optional)
  detailedRatings: {
    professionalism: Number,     // 1-5
    communication: Number,        // 1-5
    expertise: Number,            // 1-5
    punctuality: Number,          // 1-5
    value: Number                 // 1-5
  },
  
  // Response from reviewee
  response: {
    text: String,
    textAr: String,
    respondedAt: Date
  },
  
  // Helpful votes
  helpfulCount: Number,
  notHelpfulCount: Number,
  helpfulVotes: [
    {
      userId: ObjectId,
      vote: "helpful" | "not_helpful"
    }
  ],
  
  // Moderation
  isReported: false,
  reportReason: String,
  isHidden: false,
  isVerified: true,              // Verified as genuine review
  
  createdAt: Date,
  updatedAt: Date
}
Rating Statistics (Embedded in Profiles):
// In CoachProfile, SpecialistProfile, ClubProfile
ratingStats: {
  averageRating: 4.8,
  totalReviews: 45,
  ratingDistribution: {
    5: 35,    // 35 five-star reviews
    4: 8,
    3: 2,
    2: 0,
    1: 0
  },
  detailedAverages: {
    professionalism: 4.9,
    communication: 4.7,
    expertise: 4.8,
    punctuality: 4.6,
    value: 4.9
  }
}
Review APIs:
// Create review
POST /api/v1/reviews                          // Create review
POST /api/v1/reviews/:id/response             // Reviewee responds
PUT  /api/v1/reviews/:id                      // Edit review (within 24hrs)
DELETE /api/v1/reviews/:id                    // Delete review (own only)

// Get reviews
GET  /api/v1/reviews/coach/:coachId           // Get all coach reviews
GET  /api/v1/reviews/specialist/:specialistId // Get specialist reviews
GET  /api/v1/reviews/club/:clubId             // Get club reviews
GET  /api/v1/reviews/user/:userId             // Reviews written by user

// Helpful votes
POST /api/v1/reviews/:id/helpful              // Mark as helpful
POST /api/v1/reviews/:id/not-helpful          // Mark as not helpful

// Report
POST /api/v1/reviews/:id/report               // Report inappropriate review
5. 📍 Location & Map Services
Location Model (embedded in profiles):
location: {
  // Address
  street: String,
  city: String,
  state: String,
  country: String,
  postalCode: String,
  
  // Coordinates (for map & proximity search)
  coordinates: {
    type: "Point",
    coordinates: [longitude, latitude]  // [31.2357, 30.0444] for Cairo
  },
  
  // Service area (for coaches/specialists who travel)
  serviceRadius: Number,           // in km
  willingToTravel: Boolean,
  
  // Display preferences
  showExactLocation: false,        // Privacy: only show city
  
  // Formatted for display
  formatted: "Cairo, Egypt"
}
Location APIs:
// Nearby search
GET /api/v1/search/nearby/coaches?lat=30.0444&lng=31.2357&radius=10
GET /api/v1/search/nearby/clubs?lat=30.0444&lng=31.2357&radius=20
GET /api/v1/search/nearby/specialists?lat=30.0444&lng=31.2357&radius=15

// Geocoding (convert address to coordinates)
POST /api/v1/location/geocode
Body: { address: "Cairo, Egypt" }
Response: { lat: 30.0444, lng: 31.2357 }

// Reverse geocoding (coordinates to address)
POST /api/v1/location/reverse-geocode
Body: { lat: 30.0444, lng: 31.2357 }
Response: { city: "Cairo", country: "Egypt", formatted: "Cairo, Egypt" }
Map Integration:
Google Maps API (or Mapbox)
Show coaches/clubs on map
Distance calculation
Directions to facility
6. 📤 File Upload & Media Management
Upload APIs:
// Image upload (avatars, photos)
POST /api/v1/upload/image
- Max size: 5MB
- Formats: jpg, png, webp
- Returns: { url, publicId, width, height }

// Video upload (highlights, demos)
POST /api/v1/upload/video
- Max size: 100MB
- Formats: mp4, mov, avi
- Returns: { url, publicId, duration, thumbnail }

// Document upload (CV, certificates)
POST /api/v1/upload/document
- Max size: 10MB
- Formats: pdf, doc, docx
- Returns: { url, publicId, fileName }

// Multiple files
POST /api/v1/upload/multiple

// Delete file
DELETE /api/v1/upload/:publicId
Media Library (per user):
GET    /api/v1/media                  // User's media library
GET    /api/v1/media/:id              // Get specific file
DELETE /api/v1/media/:id              // Delete file
PUT    /api/v1/media/:id              // Update metadata (caption, tags)
7. 🌍 Language & Localization
APIs:
// Get translations
GET /api/v1/localization/translations?lang=ar

// Change user language preference
PUT /api/v1/users/me/language
Body: { language: "ar" | "en" }
Implementation:
All text fields have dual versions: title + titleAr
API accepts Accept-Language header
Returns content in requested language
Falls back to English if Arabic not available
8. 📊 Analytics & Tracking (For Users)
// Profile analytics (coaches, specialists, clubs)
GET /api/v1/analytics/profile-views          // Profile view count
GET /api/v1/analytics/profile-views/timeline // Views over time
GET /api/v1/analytics/search-appearances     // How often appeared in search
GET /api/v1/analytics/conversion-rate        // Request → Session conversion

// For coaches
GET /api/v1/analytics/coach/earnings         // Earnings analytics
GET /api/v1/analytics/coach/students         // Student analytics
GET /api/v1/analytics/coach/sessions         // Session analytics

// For clubs
GET /api/v1/analytics/club/members           // Member growth
GET /api/v1/analytics/club/applications      // Application analytics
GET /api/v1/analytics/club/revenue           // Revenue analytics
9. 🚫 Blocking & Reporting
Block Users:
POST   /api/v1/users/block/:userId           // Block user
DELETE /api/v1/users/block/:userId           // Unblock
GET    /api/v1/users/blocked                 // List blocked users

Effect of blocking:
- Can't send messages
- Can't send requests
- Can't view detailed profile
- Hidden from search results
Report System:
POST /api/v1/reports
Body: {
  reportType: "user" | "review" | "message" | "job",
  reportedEntityId: ObjectId,
  reason: "spam" | "harassment" | "inappropriate" | "fake" | "other",
  details: String
}

// Admin reviews reports (future feature)
10. 📱 Real-time Features (Socket.io)
Socket Events:
// Connection
socket.on('connect')
socket.emit('authenticate', { token })
socket.on('authenticated')

// Online status
socket.emit('user_online')
socket.emit('user_offline')
socket.on('user_status_changed', { userId, status: 'online' | 'offline' })

// Messaging
socket.emit('send_message', { conversationId, content })
socket.on('new_message', (message))
socket.emit('typing', { conversationId })
socket.on('user_typing', { userId, conversationId })
socket.emit('mark_read', { conversationId })

// Notifications
socket.on('new_notification', (notification))

// Requests
socket.on('new_training_request', (request))
socket.on('request_accepted', (request))
socket.on('request_rejected', (request))

// Sessions
socket.on('session_reminder', { sessionId, startsIn: 60 }) // 60 minutes
Summary: Global APIs Structure
/api/v1/
├── messages/
│   ├── conversations/
│   └── :conversationId/messages/
├── search/
│   ├── users
│   ├── coaches
│   ├── players
│   ├── specialists
│   ├── clubs
│   ├── jobs
│   └── all
├── notifications/
│   ├── GET /
│   ├── GET /unread
│   ├── PUT /:id/read
│   └── GET /settings
├── reviews/
│   ├── POST /
│   ├── GET /coach/:id
│   ├── GET /specialist/:id
│   └── GET /club/:id
├── upload/
│   ├── POST /image
│   ├── POST /video
│   └── POST /document
├── location/
│   ├── POST /geocode
│   └── GET /nearby/:role
├── analytics/
│   ├── GET /profile-views
│   └── GET /conversion-rate
├── users/
│   ├── POST /block/:userId
│   └── GET /blocked
└── reports/
    └── POST /