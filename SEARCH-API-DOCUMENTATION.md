# Search API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Base URL](#base-url)
3. [Authentication](#authentication)
4. [Search Endpoints](#search-endpoints)
5. [Autocomplete & Suggestions](#autocomplete--suggestions)
6. [Search History](#search-history)
7. [Saved Searches](#saved-searches)
8. [Trending Searches](#trending-searches)
9. [Request Examples](#request-examples)
10. [Response Examples](#response-examples)
11. [Error Handling](#error-handling)

---

## Overview

The Search API provides comprehensive global search functionality across all entities in the SportX Platform. It supports:

- **Multi-entity search** across users, coaches, players, specialists, clubs, and jobs
- **Advanced filtering** specific to each entity type
- **Autocomplete suggestions** for real-time search
- **Search history tracking** for user convenience
- **Saved searches** with optional notifications
- **Trending searches** to discover popular content
- **Geospatial search** for location-based queries

---

## Base URL

```
http://localhost:4000/api/v1/search
```

---

## Authentication

Most search endpoints support both authenticated and unauthenticated access:

- **Authenticated**: Pass JWT token in Authorization header to enable history tracking and saved searches
- **Unauthenticated**: Public search access without history or saved features

```http
Authorization: Bearer <your_jwt_token>
```

---

## Search Endpoints

### 1. Search Users

Search across all user types (players, coaches, specialists, club members).

**Endpoint:** `GET /search/users`

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| q | string | Search query (searches name, bio, location) | "John" |
| role | string | Filter by role: player, coach, specialist, club | "coach" |
| sport | string | Filter by sport | "football" |
| location | string | Filter by location | "Cairo" |
| minRating | number | Minimum rating (0-5) | 4.0 |
| verified | boolean | Filter verified users only | true |
| page | number | Page number (default: 1) | 1 |
| limit | number | Results per page (default: 20) | 10 |
| sortBy | string | Sort field (createdAt, rating) | "rating" |
| sortOrder | string | Sort order (asc, desc) | "desc" |

**Example Request:**
```bash
curl -X GET "http://localhost:4000/api/v1/search/users?q=john&role=coach&sport=football&minRating=4&verified=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "count": 15,
  "total": 15,
  "page": 1,
  "pages": 1,
  "data": [
    {
      "_id": "user123",
      "firstName": "John",
      "lastName": "Smith",
      "email": "john@example.com",
      "role": "coach",
      "avatar": "https://...",
      "isVerified": true,
      "verificationBadge": {
        "isVerified": true,
        "verifiedAt": "2024-01-15T10:00:00Z"
      },
      "location": {
        "city": "Cairo",
        "country": "Egypt"
      },
      "profile": {
        "sports": ["football"],
        "rating": {
          "average": 4.5,
          "count": 25
        }
      }
    }
  ]
}
```

---

### 2. Search Coaches

Search specifically for coaches with coach-specific filters.

**Endpoint:** `GET /search/coaches`

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| q | string | Search query | "football coach" |
| sport | string | Primary sport | "football" |
| specialization | string | Coach specialization | "goalkeeper" |
| location | string | Location | "Cairo" |
| minRating | number | Minimum rating | 4.0 |
| maxPrice | number | Maximum session price | 100 |
| minPrice | number | Minimum session price | 0 |
| experienceLevel | string | Experience level (beginner, intermediate, advanced, elite) | "advanced" |
| coachingLevel | string | Coaching level (youth, amateur, professional, elite) | "professional" |
| certifications | string | Required certifications | "UEFA A" |
| language | string | Spoken language | "English" |
| availability | string | Day of week (monday, tuesday, etc.) | "monday" |
| verified | boolean | Verified coaches only | true |
| page | number | Page number | 1 |
| limit | number | Results per page | 10 |
| sortBy | string | Sort by (rating, price, experience) | "rating" |
| sortOrder | string | Sort order (asc, desc) | "desc" |

**Example Request:**
```bash
curl -X GET "http://localhost:4000/api/v1/search/coaches?sport=football&minRating=4&availability=monday&verified=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 3. Search Players

Search for players with player-specific filters.

**Endpoint:** `GET /search/players`

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| q | string | Search query | "striker" |
| sport | string | Primary sport | "football" |
| position | string | Playing position | "striker" |
| skillLevel | string | Skill level (beginner, intermediate, advanced, elite) | "advanced" |
| minAge | number | Minimum age | 18 |
| maxAge | number | Maximum age | 25 |
| location | string | Location | "Cairo" |
| preferredFoot | string | Preferred foot (right, left, both) | "right" |
| height | number | Height in cm | 180 |
| weight | number | Weight in kg | 75 |
| availability | string | Availability status (available, partially_available, unavailable) | "available" |
| verified | boolean | Verified players only | true |
| page | number | Page number | 1 |
| limit | number | Results per page | 10 |

**Example Request:**
```bash
curl -X GET "http://localhost:4000/api/v1/search/players?sport=football&position=striker&skillLevel=advanced&availability=available" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 4. Search Specialists

Search for sports specialists (physiotherapy, nutrition, fitness, psychology).

**Endpoint:** `GET /search/specialists`

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| q | string | Search query | "sports physiotherapist" |
| specialization | string | Primary specialization (sports_physiotherapy, sports_nutrition, fitness_training, sports_psychology) | "sports_physiotherapy" |
| location | string | Location | "Cairo" |
| minRating | number | Minimum rating | 4.0 |
| language | string | Spoken language | "English" |
| yearsOfExperience | number | Minimum years of experience | 5 |
| verified | boolean | Verified specialists only | true |
| page | number | Page number | 1 |
| limit | number | Results per page | 10 |

**Example Request:**
```bash
curl -X GET "http://localhost:4000/api/v1/search/specialists?specialization=sports_physiotherapy&minRating=4&yearsOfExperience=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 5. Search Clubs

Search for sports clubs and organizations.

**Endpoint:** `GET /search/clubs`

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| q | string | Search query | "football academy" |
| sport | string | Primary sport | "football" |
| organizationType | string | Organization type (academy, club, facility, organization) | "academy" |
| location | string | Location | "Cairo" |
| minRating | number | Minimum rating | 4.0 |
| facilities | string | Required facilities (comma-separated) | "gym,pool" |
| programs | string | Available programs | "youth_training" |
| verified | boolean | Verified clubs only | true |
| page | number | Page number | 1 |
| limit | number | Results per page | 10 |

**Example Request:**
```bash
curl -X GET "http://localhost:4000/api/v1/search/clubs?sport=football&organizationType=academy&facilities=gym,pool" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 6. Search Jobs

Search for job postings.

**Endpoint:** `GET /search/jobs`

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| q | string | Search query | "football coach position" |
| jobType | string | Job type (full_time, part_time, contract, internship) | "full_time" |
| location | string | Location | "Cairo" |
| sport | string | Related sport | "football" |
| minSalary | number | Minimum salary | 5000 |
| maxSalary | number | Maximum salary | 15000 |
| experienceRequired | string | Required experience level | "intermediate" |
| status | string | Job status (open, closed) | "open" |
| page | number | Page number | 1 |
| limit | number | Results per page | 10 |

**Example Request:**
```bash
curl -X GET "http://localhost:4000/api/v1/search/jobs?jobType=full_time&sport=football&status=open&minSalary=5000" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 7. Global Search (All Entities)

Search across all entity types simultaneously.

**Endpoint:** `GET /search/all`

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| q | string | **Required** - Search query | "football" |
| page | number | Page number | 1 |
| limit | number | Results per page | 10 |

**Example Request:**
```bash
curl -X GET "http://localhost:4000/api/v1/search/all?q=football&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "query": "football",
  "total": 142,
  "data": {
    "users": {
      "count": 45,
      "results": [...]
    },
    "coaches": {
      "count": 28,
      "results": [...]
    },
    "players": {
      "count": 35,
      "results": [...]
    },
    "specialists": {
      "count": 8,
      "results": [...]
    },
    "clubs": {
      "count": 18,
      "results": [...]
    },
    "jobs": {
      "count": 8,
      "results": [...]
    }
  }
}
```

---

## Autocomplete & Suggestions

### 1. Autocomplete

Get quick search suggestions as the user types.

**Endpoint:** `GET /search/autocomplete`

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| q | string | **Required** - Search query (min 2 chars) | "foo" |
| type | string | Entity type filter (users, coaches, players, specialists, clubs, jobs, all) | "coaches" |
| limit | number | Max suggestions (default: 10) | 5 |

**Example Request:**
```bash
curl -X GET "http://localhost:4000/api/v1/search/autocomplete?q=foo&type=coaches&limit=5"
```

**Response:**
```json
{
  "success": true,
  "query": "foo",
  "suggestions": [
    {
      "_id": "user123",
      "name": "Football Coach John",
      "type": "coach",
      "avatar": "https://...",
      "sport": "football",
      "rating": 4.5
    },
    {
      "_id": "club456",
      "name": "Football Academy Cairo",
      "type": "club",
      "logo": "https://...",
      "location": "Cairo"
    }
  ]
}
```

---

### 2. Get Suggestions

Get personalized search suggestions based on user history.

**Endpoint:** `GET /search/suggestions`

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| limit | number | Max suggestions (default: 10) | 5 |

**Example Request:**
```bash
curl -X GET "http://localhost:4000/api/v1/search/suggestions?limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "suggestions": [
    {
      "query": "football coaches",
      "count": 5,
      "lastSearched": "2024-01-15T10:00:00Z"
    },
    {
      "query": "cairo academy",
      "count": 3,
      "lastSearched": "2024-01-14T15:30:00Z"
    }
  ]
}
```

---

## Search History

### 1. Get Search History

Retrieve user's search history.

**Endpoint:** `GET /search/history`

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| page | number | Page number | 1 |
| limit | number | Results per page (default: 20) | 10 |

**Example Request:**
```bash
curl -X GET "http://localhost:4000/api/v1/search/history?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 45,
  "page": 1,
  "pages": 5,
  "data": [
    {
      "_id": "history123",
      "searchQuery": "football coaches",
      "searchType": "coaches",
      "filters": {
        "sport": "football",
        "minRating": 4
      },
      "resultsCount": 28,
      "clickedResults": [
        {
          "resultId": "user123",
          "resultType": "coach",
          "clickedAt": "2024-01-15T10:05:00Z"
        }
      ],
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### 2. Clear Search History

Delete all search history for the authenticated user.

**Endpoint:** `DELETE /search/history`

**Authentication:** Required

**Example Request:**
```bash
curl -X DELETE "http://localhost:4000/api/v1/search/history" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Search history cleared successfully"
}
```

---

## Saved Searches

### 1. Save Search

Save a search query with filters for later use.

**Endpoint:** `POST /search/saved`

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Top Football Coaches in Cairo",
  "searchQuery": "football coaches",
  "searchType": "coaches",
  "filters": {
    "sport": "football",
    "location": "Cairo",
    "minRating": 4,
    "verified": true
  },
  "notifyOnNewResults": true
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:4000/api/v1/search/saved" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Top Football Coaches in Cairo",
    "searchQuery": "football coaches",
    "searchType": "coaches",
    "filters": {
      "sport": "football",
      "location": "Cairo",
      "minRating": 4
    },
    "notifyOnNewResults": true
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "saved123",
    "name": "Top Football Coaches in Cairo",
    "searchQuery": "football coaches",
    "searchType": "coaches",
    "filters": {
      "sport": "football",
      "location": "Cairo",
      "minRating": 4
    },
    "notifyOnNewResults": true,
    "isActive": true,
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

---

### 2. Get Saved Searches

Retrieve all saved searches for the authenticated user.

**Endpoint:** `GET /search/saved`

**Authentication:** Required

**Example Request:**
```bash
curl -X GET "http://localhost:4000/api/v1/search/saved" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "saved123",
      "name": "Top Football Coaches in Cairo",
      "searchQuery": "football coaches",
      "searchType": "coaches",
      "filters": {
        "sport": "football",
        "location": "Cairo",
        "minRating": 4
      },
      "notifyOnNewResults": true,
      "isActive": true,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### 3. Delete Saved Search

Delete a saved search.

**Endpoint:** `DELETE /search/saved/:searchId`

**Authentication:** Required

**Example Request:**
```bash
curl -X DELETE "http://localhost:4000/api/v1/search/saved/saved123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Saved search deleted successfully"
}
```

---

## Trending Searches

### Get Trending Searches

Retrieve popular/trending searches across the platform.

**Endpoint:** `GET /search/trending`

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| limit | number | Max trending items (default: 10) | 5 |
| days | number | Time period in days (default: 7) | 30 |

**Example Request:**
```bash
curl -X GET "http://localhost:4000/api/v1/search/trending?limit=5&days=7"
```

**Response:**
```json
{
  "success": true,
  "period": "7 days",
  "data": [
    {
      "query": "football coaches",
      "searchCount": 156,
      "uniqueUsers": 89
    },
    {
      "query": "cairo academy",
      "searchCount": 134,
      "uniqueUsers": 67
    },
    {
      "query": "physiotherapist",
      "searchCount": 98,
      "uniqueUsers": 54
    }
  ]
}
```

---

## Request Examples

### Example 1: Search for Verified Football Coaches in Cairo

```bash
curl -X GET "http://localhost:4000/api/v1/search/coaches?sport=football&location=Cairo&verified=true&minRating=4&sortBy=rating&sortOrder=desc&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 2: Search for Available Strikers

```bash
curl -X GET "http://localhost:4000/api/v1/search/players?sport=football&position=striker&availability=available&minAge=18&maxAge=25" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 3: Global Search for "football"

```bash
curl -X GET "http://localhost:4000/api/v1/search/all?q=football" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 4: Autocomplete for "foo"

```bash
curl -X GET "http://localhost:4000/api/v1/search/autocomplete?q=foo&type=all&limit=5"
```

### Example 5: Save a Search with Notifications

```bash
curl -X POST "http://localhost:4000/api/v1/search/saved" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Elite Football Coaches",
    "searchQuery": "football",
    "searchType": "coaches",
    "filters": {
      "sport": "football",
      "coachingLevel": "elite",
      "minRating": 4.5
    },
    "notifyOnNewResults": true
  }'
```

---

## Response Examples

### Success Response (User Search)

```json
{
  "success": true,
  "count": 15,
  "total": 15,
  "page": 1,
  "pages": 1,
  "data": [
    {
      "_id": "user123",
      "firstName": "John",
      "lastName": "Smith",
      "email": "john@example.com",
      "role": "coach",
      "avatar": "https://example.com/avatars/john.jpg",
      "isVerified": true,
      "verificationBadge": {
        "isVerified": true,
        "verifiedAt": "2024-01-15T10:00:00Z",
        "verificationType": "email"
      },
      "location": {
        "city": "Cairo",
        "country": "Egypt",
        "coordinates": [31.2357, 30.0444]
      },
      "profile": {
        "sports": ["football"],
        "specialization": ["striker training"],
        "bio": "Professional football coach with 10 years experience",
        "rating": {
          "average": 4.5,
          "count": 25
        }
      },
      "createdAt": "2023-06-15T10:00:00Z"
    }
  ]
}
```

---

### Success Response (Global Search)

```json
{
  "success": true,
  "query": "football",
  "total": 142,
  "data": {
    "users": {
      "count": 45,
      "results": [
        {
          "_id": "user123",
          "firstName": "John",
          "lastName": "Smith",
          "role": "coach",
          "avatar": "https://...",
          "location": {
            "city": "Cairo",
            "country": "Egypt"
          },
          "profile": {
            "sports": ["football"],
            "rating": {
              "average": 4.5,
              "count": 25
            }
          }
        }
      ]
    },
    "coaches": {
      "count": 28,
      "results": [...]
    },
    "players": {
      "count": 35,
      "results": [...]
    },
    "specialists": {
      "count": 8,
      "results": [...]
    },
    "clubs": {
      "count": 18,
      "results": [...]
    },
    "jobs": {
      "count": 8,
      "results": [...]
    }
  }
}
```

---

### Success Response (Autocomplete)

```json
{
  "success": true,
  "query": "foo",
  "suggestions": [
    {
      "_id": "user123",
      "name": "Football Coach John",
      "type": "coach",
      "avatar": "https://...",
      "sport": "football",
      "rating": 4.5,
      "location": "Cairo"
    },
    {
      "_id": "club456",
      "name": "Football Academy Cairo",
      "type": "club",
      "logo": "https://...",
      "location": "Cairo",
      "rating": 4.2
    },
    {
      "_id": "player789",
      "name": "Football Player Ahmed",
      "type": "player",
      "avatar": "https://...",
      "position": "striker",
      "sport": "football"
    }
  ]
}
```

---

## Error Handling

### Common Error Responses

#### 400 Bad Request - Missing Query
```json
{
  "success": false,
  "message": "Search query is required"
}
```

#### 400 Bad Request - Query Too Short
```json
{
  "success": false,
  "message": "Search query must be at least 2 characters"
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

#### 404 Not Found - Saved Search
```json
{
  "success": false,
  "message": "Saved search not found"
}
```

#### 500 Server Error
```json
{
  "success": false,
  "message": "Error performing search",
  "error": "Detailed error message"
}
```

---

## Features Summary

### Search Capabilities
- ✅ Multi-entity search (users, coaches, players, specialists, clubs, jobs)
- ✅ Global search across all entities
- ✅ Advanced filtering per entity type
- ✅ Text search with MongoDB text indexes
- ✅ Geospatial search for location-based queries
- ✅ Pagination support
- ✅ Sorting options (rating, price, experience, date)

### Autocomplete & Suggestions
- ✅ Real-time autocomplete as user types
- ✅ Personalized suggestions based on history
- ✅ Quick suggestions with minimal data

### History & Tracking
- ✅ Automatic search history tracking (for authenticated users)
- ✅ Click tracking on search results
- ✅ Search history management (view, clear)
- ✅ Privacy-focused (only tracks own searches)

### Saved Searches
- ✅ Save complex searches with filters
- ✅ Optional notifications for new results
- ✅ Activate/deactivate saved searches
- ✅ Manage multiple saved searches

### Analytics
- ✅ Trending searches across platform
- ✅ Configurable time periods
- ✅ Popular query tracking
- ✅ Unique user counts

---

## Best Practices

### For Frontend Integration

1. **Debounce Autocomplete Requests**
```javascript
// Debounce autocomplete to avoid excessive API calls
const debouncedAutocomplete = debounce(async (query) => {
  if (query.length >= 2) {
    const response = await fetch(
      `http://localhost:4000/api/v1/search/autocomplete?q=${query}&limit=5`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    const data = await response.json();
    setSuggestions(data.suggestions);
  }
}, 300);
```

2. **Implement Infinite Scroll**
```javascript
const loadMoreResults = async () => {
  const nextPage = currentPage + 1;
  const response = await fetch(
    `http://localhost:4000/api/v1/search/coaches?q=${query}&page=${nextPage}&limit=10`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  const data = await response.json();
  setResults([...results, ...data.data]);
  setCurrentPage(nextPage);
};
```

3. **Track Clicked Results**
```javascript
// Track when user clicks a search result
const handleResultClick = (resultId, resultType) => {
  // Navigate to result
  navigate(`/${resultType}/${resultId}`);

  // Track click for better suggestions (optional backend implementation)
  fetch(`http://localhost:4000/api/v1/search/track-click`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ resultId, resultType })
  });
};
```

4. **Display Trending Searches**
```javascript
// Show trending searches on search page
useEffect(() => {
  const fetchTrending = async () => {
    const response = await fetch(
      'http://localhost:4000/api/v1/search/trending?limit=5'
    );
    const data = await response.json();
    setTrendingSearches(data.data);
  };

  fetchTrending();
}, []);
```

5. **Implement Search Filters**
```javascript
// Build dynamic filter query
const buildFilterQuery = (filters) => {
  const params = new URLSearchParams({
    q: searchQuery,
    ...filters
  });

  return `http://localhost:4000/api/v1/search/coaches?${params}`;
};

// Example filters
const filters = {
  sport: 'football',
  minRating: 4,
  location: 'Cairo',
  verified: true
};

const url = buildFilterQuery(filters);
```

---

## Testing Commands

### Test User Search
```bash
curl -X GET "http://localhost:4000/api/v1/search/users?q=john&role=coach"
```

### Test Coach Search with Filters
```bash
curl -X GET "http://localhost:4000/api/v1/search/coaches?sport=football&minRating=4&location=Cairo"
```

### Test Global Search
```bash
curl -X GET "http://localhost:4000/api/v1/search/all?q=football"
```

### Test Autocomplete
```bash
curl -X GET "http://localhost:4000/api/v1/search/autocomplete?q=foo&type=all"
```

### Test Trending Searches
```bash
curl -X GET "http://localhost:4000/api/v1/search/trending?limit=5"
```

### Test Save Search (Requires Authentication)
```bash
curl -X POST "http://localhost:4000/api/v1/search/saved" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Saved Search",
    "searchQuery": "football",
    "searchType": "coaches",
    "filters": {"sport": "football"},
    "notifyOnNewResults": true
  }'
```

---

## Notes

- All search endpoints automatically track search history for authenticated users
- Search queries are case-insensitive
- Text search uses MongoDB text indexes for optimal performance
- Geospatial queries support distance-based sorting (nearest first)
- Pagination defaults: page=1, limit=20
- Maximum limit per request: 100
- Autocomplete requires minimum 2 characters
- Trending searches are calculated based on the last 7 days by default
- Saved searches support notification system (requires Notification model implementation)

---

## Related APIs

- [Authentication API](./AUTH-API-DOCUMENTATION.md)
- [Messaging API](./MESSAGING-API-DOCUMENTATION.md)
- [Player API](./PLAYER-API-DOCUMENTATION.md)
- [Coach API](./COACH-API-DOCUMENTATION.md)
- [Specialist API](./SPECIALIST-API-DOCUMENTATION.md)
- [Club API](./CLUB-API-DOCUMENTATION.md)

---

## Support

For issues or questions, please contact the development team.

**Last Updated:** January 2025
**API Version:** v1
