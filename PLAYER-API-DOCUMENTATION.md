# Player API Documentation
## SportX Platform - Player Role Endpoints

Base URL: `http://localhost:4000/api/v1`

---

## Authentication Required
All player endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 📋 Table of Contents

1. [Profile Management](#profile-management)
2. [Search & Discovery](#search--discovery)
3. [Dashboard](#dashboard)
4. [Media Gallery](#media-gallery)
5. [Privacy Settings](#privacy-settings)

---

## Profile Management

### 1. Create Player Profile
**POST** `/players/profile`

Create a new player profile after registration.

**Authorization:** Required (Player role only)

**Request Body:**
```json
{
  "bio": "Passionate football player with 5 years of experience",
  "bioAr": "لاعب كرة قدم متحمس مع 5 سنوات من الخبرة",
  "birthDate": "2000-01-15",
  "nationality": "Egyptian",
  "languages": ["arabic", "english"],
  "location": {
    "country": "Egypt",
    "city": "Cairo",
    "address": "Nasr City",
    "coordinates": {
      "type": "Point",
      "coordinates": [31.3547, 30.0444]
    },
    "showExactLocation": false
  },
  "socialMedia": {
    "facebook": "https://facebook.com/player",
    "instagram": "https://instagram.com/player",
    "twitter": "https://twitter.com/player"
  },
  "primarySport": "Football",
  "additionalSports": ["Basketball"],
  "position": "Striker",
  "positionAr": "مهاجم",
  "preferredFoot": "right",
  "height": {
    "value": 180,
    "unit": "cm"
  },
  "weight": {
    "value": 75,
    "unit": "kg"
  },
  "level": "semi-pro",
  "yearsOfExperience": 5,
  "currentClub": {
    "clubName": "Cairo Sports Academy",
    "joinedDate": "2023-01-01",
    "position": "Forward"
  },
  "previousClubs": [
    {
      "clubName": "Alexandria SC",
      "startDate": "2020-01-01",
      "endDate": "2022-12-31",
      "position": "Winger",
      "achievements": "Won regional championship 2021"
    }
  ],
  "achievements": [
    {
      "title": "Top Scorer 2023",
      "titleAr": "الهداف 2023",
      "description": "Scored 25 goals in the season",
      "date": "2023-12-31",
      "type": "award"
    }
  ],
  "certificates": [
    {
      "name": "CAF Level 1 Coaching Certificate",
      "issuedBy": "CAF",
      "issuedDate": "2023-06-15",
      "certificateUrl": "https://cloudinary.com/cert.pdf"
    }
  ],
  "statistics": {
    "matchesPlayed": 120,
    "goals": 45,
    "assists": 20
  },
  "status": "active",
  "availableForTraining": true,
  "trainingAvailability": [
    {
      "day": "monday",
      "slots": [
        {
          "startTime": "18:00",
          "endTime": "20:00"
        }
      ]
    },
    {
      "day": "wednesday",
      "slots": [
        {
          "startTime": "18:00",
          "endTime": "20:00"
        }
      ]
    }
  ],
  "openToRelocation": false,
  "salaryExpectations": {
    "min": 5000,
    "max": 10000,
    "currency": "EGP",
    "period": "monthly",
    "showPublicly": false
  },
  "goals": "Join a professional club and represent my country",
  "goalsAr": "الانضمام لنادي محترف وتمثيل بلدي",
  "avatar": "https://cloudinary.com/avatar.jpg",
  "highlightVideoUrl": "https://youtube.com/highlights",
  "privacy": {
    "showContact": true,
    "showLocation": true,
    "showSalary": false,
    "profileVisibility": "public"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Player profile created successfully",
  "profile": {
    "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
    "userId": "65f1a2b3c4d5e6f7g8h9i0j0",
    "bio": "Passionate football player with 5 years of experience",
    "primarySport": "Football",
    "position": "Striker",
    "level": "semi-pro",
    "profileCompletionPercentage": 85,
    // ... all other fields
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Profile already exists or validation failed
- `500 Internal Server Error`: Server error

---

### 2. Get My Profile
**GET** `/players/profile/me`

Get the authenticated player's own profile.

**Authorization:** Required (Player role only)

**Response (200 OK):**
```json
{
  "success": true,
  "profile": {
    "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
    "userId": {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j0",
      "firstName": "Ahmed",
      "lastName": "Mohamed",
      "email": "ahmed@example.com",
      "phone": "+201234567890",
      "avatar": "https://cloudinary.com/avatar.jpg",
      "isVerified": true
    },
    "bio": "Passionate football player",
    "primarySport": "Football",
    "position": "Striker",
    "level": "semi-pro",
    "profileCompletionPercentage": 85,
    "profileViews": 150,
    "trainingStats": {
      "totalSessions": 25,
      "completedSessions": 23,
      "cancelledSessions": 2
    },
    "ratingStats": {
      "averageRating": 4.5,
      "totalReviews": 12
    },
    // ... all profile fields
  }
}
```

---

### 3. Get Player Profile by ID
**GET** `/players/profile/:id`

Get a public view of any player's profile.

**Authorization:** Required

**Parameters:**
- `id` (path parameter): Player profile ID

**Response (200 OK):**
```json
{
  "success": true,
  "profile": {
    "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
    "userId": {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j0",
      "firstName": "Ahmed",
      "lastName": "Mohamed",
      "avatar": "https://cloudinary.com/avatar.jpg",
      "isVerified": true
    },
    "bio": "Passionate football player",
    "primarySport": "Football",
    "position": "Striker",
    "level": "semi-pro",
    "location": {
      "country": "Egypt",
      "city": "Cairo"
      // Note: Address and coordinates hidden based on privacy settings
    },
    "achievements": [...],
    "photos": [...],
    "videos": [...],
    "ratingStats": {
      "averageRating": 4.5,
      "totalReviews": 12
    }
    // Sensitive fields like salaryExpectations, socialMedia may be hidden based on privacy settings
  }
}
```

**Note:** This endpoint respects privacy settings and returns filtered data.

---

### 4. Update Player Profile
**PUT** `/players/profile`

Update the authenticated player's profile.

**Authorization:** Required (Player role only)

**Request Body (partial update allowed):**
```json
{
  "bio": "Updated bio",
  "status": "looking_for_club",
  "level": "professional",
  "achievements": [
    {
      "title": "Champion 2024",
      "type": "championship",
      "date": "2024-12-31"
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "profile": {
    // Updated profile data
  }
}
```

---

### 5. Delete Player Profile
**DELETE** `/players/profile`

Soft delete the player's profile (marks as deleted, doesn't remove from database).

**Authorization:** Required (Player role only)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile deleted successfully"
}
```

---

## Search & Discovery

### 6. Search Players
**GET** `/players/search`

Search for players with advanced filters. (Used by coaches/clubs to find players)

**Authorization:** Required

**Query Parameters:**
- `sport` (string): Sport name (e.g., "Football", "Basketball")
- `position` (string): Player position
- `level` (string): beginner | amateur | semi-pro | professional
- `city` (string): City name
- `country` (string): Country name
- `status` (string): active | looking_for_club | open_to_offers | not_available
- `minAge` (number): Minimum age
- `maxAge` (number): Maximum age
- `openToRelocation` (boolean): true/false
- `page` (number, default: 1): Page number
- `limit` (number, default: 20): Items per page
- `sortBy` (string, default: 'createdAt'): Field to sort by
- `sortOrder` (string, default: 'desc'): asc | desc

**Example Request:**
```
GET /players/search?sport=Football&level=semi-pro&city=Cairo&page=1&limit=10
```

**Response (200 OK):**
```json
{
  "success": true,
  "players": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "userId": {
        "firstName": "Ahmed",
        "lastName": "Mohamed",
        "avatar": "https://cloudinary.com/avatar.jpg",
        "isVerified": true
      },
      "bio": "Passionate football player",
      "primarySport": "Football",
      "position": "Striker",
      "level": "semi-pro",
      "location": {
        "city": "Cairo",
        "country": "Egypt"
      },
      "ratingStats": {
        "averageRating": 4.5,
        "totalReviews": 12
      },
      "age": 24,
      "profileUrl": "/players/65f1a2b3c4d5e6f7g8h9i0j1"
    }
    // ... more players
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "pages": 5,
    "limit": 10
  }
}
```

---

### 7. Get Nearby Players
**GET** `/players/nearby`

Find players near a specific location (proximity search).

**Authorization:** Required

**Query Parameters:**
- `lat` (number, required): Latitude
- `lng` (number, required): Longitude
- `radius` (number, default: 10): Search radius in kilometers
- `sport` (string): Filter by sport
- `level` (string): Filter by level
- `page` (number, default: 1): Page number
- `limit` (number, default: 20): Items per page

**Example Request:**
```
GET /players/nearby?lat=30.0444&lng=31.2357&radius=15&sport=Football
```

**Response (200 OK):**
```json
{
  "success": true,
  "players": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "userId": {
        "firstName": "Ahmed",
        "lastName": "Mohamed",
        "avatar": "https://cloudinary.com/avatar.jpg"
      },
      "primarySport": "Football",
      "position": "Striker",
      "level": "semi-pro",
      "location": {
        "city": "Cairo",
        "country": "Egypt"
      }
    }
    // ... more nearby players
  ],
  "pagination": {
    "total": 12,
    "page": 1,
    "pages": 1,
    "limit": 20
  }
}
```

---

## Dashboard

### 8. Get Dashboard Stats
**GET** `/players/dashboard/stats`

Get player dashboard statistics and overview.

**Authorization:** Required (Player role only)

**Response (200 OK):**
```json
{
  "success": true,
  "stats": {
    "profileCompletion": 85,
    "profileViews": 150,
    "totalSessions": 25,
    "completedSessions": 23,
    "averageRating": 4.5,
    "totalReviews": 12,
    "upcomingSessions": 3,
    "activeRequests": 2,
    "pendingApplications": 1,
    "clubMemberships": 1
  }
}
```

---

## Media Gallery

### 9. Add Photo
**POST** `/players/photos`

Add a photo to the player's gallery.

**Authorization:** Required (Player role only)

**Request Body:**
```json
{
  "url": "https://cloudinary.com/photo1.jpg",
  "caption": "Training session highlight",
  "captionAr": "لقطة من التدريب"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Photo added successfully",
  "photos": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j2",
      "url": "https://cloudinary.com/photo1.jpg",
      "caption": "Training session highlight",
      "captionAr": "لقطة من التدريب",
      "uploadedAt": "2025-01-15T12:00:00.000Z"
    }
    // ... all photos
  ]
}
```

---

### 10. Remove Photo
**DELETE** `/players/photos/:photoId`

Remove a photo from the gallery.

**Authorization:** Required (Player role only)

**Parameters:**
- `photoId` (path parameter): Photo ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Photo removed successfully",
  "photos": [
    // Remaining photos
  ]
}
```

---

### 11. Add Video
**POST** `/players/videos`

Add a video to the player's gallery.

**Authorization:** Required (Player role only)

**Request Body:**
```json
{
  "url": "https://youtube.com/video123",
  "thumbnail": "https://cloudinary.com/thumbnail.jpg",
  "title": "Match Highlights",
  "titleAr": "أبرز لحظات المباراة",
  "description": "Goals and assists from the championship final",
  "descriptionAr": "الأهداف والتمريرات الحاسمة من نهائي البطولة",
  "duration": 180
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Video added successfully",
  "videos": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j3",
      "url": "https://youtube.com/video123",
      "thumbnail": "https://cloudinary.com/thumbnail.jpg",
      "title": "Match Highlights",
      "duration": 180,
      "uploadedAt": "2025-01-15T13:00:00.000Z"
    }
    // ... all videos
  ]
}
```

---

### 12. Remove Video
**DELETE** `/players/videos/:videoId`

Remove a video from the gallery.

**Authorization:** Required (Player role only)

**Parameters:**
- `videoId` (path parameter): Video ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Video removed successfully",
  "videos": [
    // Remaining videos
  ]
}
```

---

## Privacy Settings

### 13. Update Privacy Settings
**PUT** `/players/privacy`

Update player privacy settings.

**Authorization:** Required (Player role only)

**Request Body:**
```json
{
  "showContact": true,
  "showLocation": true,
  "showSalary": false,
  "profileVisibility": "public"
}
```

**Profile Visibility Options:**
- `public`: Visible to everyone
- `clubs_only`: Only visible to clubs and coaches
- `private`: Only visible to connections

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Privacy settings updated successfully",
  "privacy": {
    "showContact": true,
    "showLocation": true,
    "showSalary": false,
    "profileVisibility": "public"
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `PROFILE_EXISTS` | 400 | Player profile already exists |
| `PROFILE_NOT_FOUND` | 404 | Player profile not found |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `MISSING_URL` | 400 | Required URL not provided |
| `MISSING_COORDINATES` | 400 | Latitude/longitude required for proximity search |
| `CREATE_PROFILE_FAILED` | 500 | Failed to create profile |
| `FETCH_PROFILE_FAILED` | 500 | Failed to fetch profile |
| `UPDATE_PROFILE_FAILED` | 500 | Failed to update profile |
| `DELETE_PROFILE_FAILED` | 500 | Failed to delete profile |
| `SEARCH_FAILED` | 500 | Failed to search players |
| `NEARBY_SEARCH_FAILED` | 500 | Failed to search nearby players |
| `STATS_FETCH_FAILED` | 500 | Failed to fetch dashboard stats |
| `ADD_PHOTO_FAILED` | 500 | Failed to add photo |
| `REMOVE_PHOTO_FAILED` | 500 | Failed to remove photo |
| `ADD_VIDEO_FAILED` | 500 | Failed to add video |
| `REMOVE_VIDEO_FAILED` | 500 | Failed to remove video |
| `UPDATE_PRIVACY_FAILED` | 500 | Failed to update privacy settings |

---

## Testing the APIs

### Using Postman/cURL

1. **Register as a player:**
```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "player@example.com",
    "password": "password123",
    "role": "player",
    "firstName": "Ahmed",
    "lastName": "Mohamed",
    "phone": "+201234567890"
  }'
```

2. **Login:**
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "player@example.com",
    "password": "password123"
  }'
```

Save the `accessToken` from the response.

3. **Create player profile:**
```bash
curl -X POST http://localhost:4000/api/v1/players/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "primarySport": "Football",
    "position": "Striker",
    "level": "semi-pro",
    "bio": "Passionate football player",
    "location": {
      "city": "Cairo",
      "country": "Egypt"
    }
  }'
```

4. **Get my profile:**
```bash
curl -X GET http://localhost:4000/api/v1/players/profile/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

5. **Search players:**
```bash
curl -X GET "http://localhost:4000/api/v1/players/search?sport=Football&level=semi-pro&city=Cairo" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Complete API Endpoint List

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| POST | `/players/profile` | Create player profile | ✅ | Player |
| GET | `/players/profile/me` | Get own profile | ✅ | Player |
| GET | `/players/profile/:id` | Get player profile by ID | ✅ | Any |
| PUT | `/players/profile` | Update profile | ✅ | Player |
| DELETE | `/players/profile` | Delete profile | ✅ | Player |
| GET | `/players/search` | Search players | ✅ | Any |
| GET | `/players/nearby` | Find nearby players | ✅ | Any |
| GET | `/players/dashboard/stats` | Get dashboard stats | ✅ | Player |
| POST | `/players/photos` | Add photo | ✅ | Player |
| DELETE | `/players/photos/:photoId` | Remove photo | ✅ | Player |
| POST | `/players/videos` | Add video | ✅ | Player |
| DELETE | `/players/videos/:videoId` | Remove video | ✅ | Player |
| PUT | `/players/privacy` | Update privacy settings | ✅ | Player |

---

## Next Steps

After implementing Player APIs, the next steps are:

1. **Coach Profile APIs** - Similar structure for coaches
2. **Training Request System** - Connect players and coaches
3. **Training Session Management** - Book and manage sessions
4. **Review & Rating System** - Rate coaches after sessions
5. **Club Integration** - Club membership and features
6. **Specialist APIs** - Physiotherapy, nutrition, fitness, psychology
7. **Messaging System** - Real-time chat
8. **Notifications** - Email and push notifications

---

**Document Version:** 1.0
**Last Updated:** January 2025
**Status:** ✅ Implemented and Ready for Testing
