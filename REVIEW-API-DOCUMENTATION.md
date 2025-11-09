# Review & Rating API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Base URL](#base-url)
3. [Authentication](#authentication)
4. [Review Model](#review-model)
5. [API Endpoints](#api-endpoints)
6. [Request Examples](#request-examples)
7. [Response Examples](#response-examples)
8. [Error Handling](#error-handling)

---

## Overview

The Review & Rating System provides comprehensive feedback functionality for coaches, specialists, and clubs on the SportX Platform. It supports:

- **Star ratings** (1-5 stars)
- **Detailed ratings** across 5 categories (professionalism, communication, expertise, punctuality, value)
- **Written reviews** with multilingual support (English and Arabic)
- **Review responses** from service providers
- **Helpful voting** system
- **Review moderation** and reporting
- **Automatic statistics** calculation
- **Edit window** (24 hours)
- **Duplicate prevention** (one review per entity)

---

## Base URL

```
http://localhost:4000/api/v1/reviews
```

---

## Authentication

Some endpoints require authentication, while others are public:

**Public Access:**
- Get reviews for coaches, specialists, clubs
- Get review statistics
- Get single review by ID

**Authentication Required:**
- Create review
- Update review
- Delete review
- Add response to review
- Vote on reviews (helpful/not helpful)
- Report reviews

Include your JWT token in the Authorization header for protected endpoints:

```http
Authorization: Bearer <your_jwt_token>
```

---

## Review Model

### Core Fields

```javascript
{
  _id: ObjectId,

  // Who is being reviewed
  revieweeId: ObjectId,           // User ID of coach/specialist/club
  revieweeRole: String,           // "coach" | "specialist" | "club"

  // Who is writing the review
  reviewerId: ObjectId,           // User ID of reviewer
  reviewerRole: String,           // "player" | "coach" | "specialist"

  // Related entity
  relatedTo: {
    entityType: String,           // "training_session" | "consultation_session" | "club_membership"
    entityId: ObjectId
  },

  // Rating (required)
  rating: Number,                 // 1-5 stars

  // Review content
  title: String,                  // Optional short title
  review: String,                 // Review text (required)
  reviewAr: String,               // Arabic translation (optional)

  // Detailed ratings (optional)
  detailedRatings: {
    professionalism: Number,      // 1-5
    communication: Number,         // 1-5
    expertise: Number,             // 1-5
    punctuality: Number,           // 1-5
    value: Number                  // 1-5
  },

  // Response from reviewee
  response: {
    text: String,
    textAr: String,
    respondedAt: Date,
    respondedBy: ObjectId
  },

  // Helpful votes
  helpfulCount: Number,
  notHelpfulCount: Number,
  helpfulVotes: [{
    userId: ObjectId,
    vote: String,                 // "helpful" | "not_helpful"
    votedAt: Date
  }],

  // Moderation
  isReported: Boolean,
  reportedBy: [{
    userId: ObjectId,
    reason: String,
    reportedAt: Date
  }],
  isHidden: Boolean,
  isVerified: Boolean,
  isDeleted: Boolean,

  createdAt: Date,
  updatedAt: Date
}
```

---

## API Endpoints

### 1. Create Review

Create a new review for a coach, specialist, or club.

**Endpoint:** `POST /reviews`

**Authentication:** Required

**Request Body:**
```json
{
  "revieweeId": "user123",
  "revieweeRole": "coach",
  "relatedTo": {
    "entityType": "training_session",
    "entityId": "session456"
  },
  "rating": 5,
  "title": "Excellent Coach!",
  "review": "Ahmed is an outstanding coach. His training methods are very effective and he's always punctual.",
  "reviewAr": "أحمد مدرب ممتاز. أساليب التدريب الخاصة به فعالة للغاية وهو دائمًا دقيق في المواعيد.",
  "detailedRatings": {
    "professionalism": 5,
    "communication": 5,
    "expertise": 5,
    "punctuality": 5,
    "value": 5
  }
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:4000/api/v1/reviews" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "revieweeId": "user123",
    "revieweeRole": "coach",
    "relatedTo": {
      "entityType": "training_session",
      "entityId": "session456"
    },
    "rating": 5,
    "title": "Excellent Coach!",
    "review": "Ahmed is an outstanding coach.",
    "detailedRatings": {
      "professionalism": 5,
      "communication": 5,
      "expertise": 5,
      "punctuality": 5,
      "value": 5
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Review created successfully",
  "data": {
    "_id": "review123",
    "revieweeId": "user123",
    "revieweeRole": "coach",
    "reviewerId": "currentUser456",
    "reviewerRole": "player",
    "relatedTo": {
      "entityType": "training_session",
      "entityId": "session456"
    },
    "rating": 5,
    "title": "Excellent Coach!",
    "review": "Ahmed is an outstanding coach.",
    "detailedRatings": {
      "professionalism": 5,
      "communication": 5,
      "expertise": 5,
      "punctuality": 5,
      "value": 5
    },
    "helpfulCount": 0,
    "notHelpfulCount": 0,
    "isVerified": true,
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

---

### 2. Get Coach Reviews

Retrieve all reviews for a specific coach with pagination and filtering.

**Endpoint:** `GET /reviews/coach/:coachId`

**Authentication:** Public

**Query Parameters:**
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| page | number | Page number | 1 |
| limit | number | Results per page | 20 |
| minRating | number | Minimum rating filter (1-5) | - |
| sort | string | Sort order (-createdAt, createdAt, -rating, rating) | -createdAt |

**Example Request:**
```bash
curl -X GET "http://localhost:4000/api/v1/reviews/coach/user123?page=1&limit=10&minRating=4&sort=-rating"
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 45,
  "page": 1,
  "pages": 5,
  "statistics": {
    "averageRating": 4.8,
    "totalReviews": 45,
    "ratingDistribution": {
      "5": 35,
      "4": 8,
      "3": 2,
      "2": 0,
      "1": 0
    },
    "detailedAverages": {
      "professionalism": 4.9,
      "communication": 4.7,
      "expertise": 4.8,
      "punctuality": 4.6,
      "value": 4.9
    }
  },
  "data": [
    {
      "_id": "review123",
      "reviewerId": {
        "_id": "player789",
        "firstName": "Sarah",
        "lastName": "Ali",
        "avatar": "https://..."
      },
      "rating": 5,
      "title": "Excellent Coach!",
      "review": "Ahmed is an outstanding coach.",
      "detailedRatings": {
        "professionalism": 5,
        "communication": 5,
        "expertise": 5,
        "punctuality": 5,
        "value": 5
      },
      "helpfulCount": 12,
      "notHelpfulCount": 1,
      "response": {
        "text": "Thank you for your kind words!",
        "respondedAt": "2024-01-15T11:00:00Z"
      },
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### 3. Get Specialist Reviews

Retrieve all reviews for a specific specialist.

**Endpoint:** `GET /reviews/specialist/:specialistId`

**Authentication:** Public

**Query Parameters:** Same as coach reviews

**Example Request:**
```bash
curl -X GET "http://localhost:4000/api/v1/reviews/specialist/user456?page=1&limit=10"
```

---

### 4. Get Club Reviews

Retrieve all reviews for a specific club.

**Endpoint:** `GET /reviews/club/:clubId`

**Authentication:** Public

**Query Parameters:** Same as coach reviews

**Example Request:**
```bash
curl -X GET "http://localhost:4000/api/v1/reviews/club/club789?page=1&limit=10"
```

---

### 5. Get Reviews Written by User

Retrieve all reviews written by a specific user.

**Endpoint:** `GET /reviews/user/:userId`

**Authentication:** Public

**Query Parameters:**
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| page | number | Page number | 1 |
| limit | number | Results per page | 20 |

**Example Request:**
```bash
curl -X GET "http://localhost:4000/api/v1/reviews/user/player123?page=1&limit=10"
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "total": 15,
  "page": 1,
  "pages": 2,
  "data": [
    {
      "_id": "review123",
      "revieweeId": {
        "_id": "coach456",
        "firstName": "Ahmed",
        "lastName": "Mohamed",
        "avatar": "https://..."
      },
      "revieweeRole": "coach",
      "rating": 5,
      "review": "Great coach!",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### 6. Get Single Review

Retrieve a specific review by ID.

**Endpoint:** `GET /reviews/:id`

**Authentication:** Public

**Example Request:**
```bash
curl -X GET "http://localhost:4000/api/v1/reviews/review123"
```

---

### 7. Update Review

Update an existing review (only within 24 hours of creation).

**Endpoint:** `PUT /reviews/:id`

**Authentication:** Required (must be the review author)

**Request Body:**
```json
{
  "rating": 4,
  "title": "Updated Title",
  "review": "Updated review text",
  "reviewAr": "نص التقييم المحدث",
  "detailedRatings": {
    "professionalism": 4,
    "communication": 5,
    "expertise": 4,
    "punctuality": 5,
    "value": 4
  }
}
```

**Example Request:**
```bash
curl -X PUT "http://localhost:4000/api/v1/reviews/review123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 4,
    "review": "Updated review text"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Review updated successfully",
  "data": {
    "_id": "review123",
    "rating": 4,
    "review": "Updated review text",
    "updatedAt": "2024-01-15T12:00:00Z"
  }
}
```

---

### 8. Delete Review

Delete your own review (soft delete).

**Endpoint:** `DELETE /reviews/:id`

**Authentication:** Required (must be the review author)

**Example Request:**
```bash
curl -X DELETE "http://localhost:4000/api/v1/reviews/review123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Review deleted successfully"
}
```

---

### 9. Add Response to Review

Add a response to a review (only reviewee can respond).

**Endpoint:** `POST /reviews/:id/response`

**Authentication:** Required (must be the reviewee)

**Request Body:**
```json
{
  "text": "Thank you for your feedback! I'm glad you enjoyed the training.",
  "textAr": "شكرًا لك على ملاحظاتك! أنا سعيد لأنك استمتعت بالتدريب."
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:4000/api/v1/reviews/review123/response" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Thank you for your feedback!",
    "textAr": "شكرًا لك على ملاحظاتك!"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Response added successfully",
  "data": {
    "_id": "review123",
    "response": {
      "text": "Thank you for your feedback!",
      "textAr": "شكرًا لك على ملاحظاتك!",
      "respondedAt": "2024-01-15T13:00:00Z",
      "respondedBy": "user123"
    }
  }
}
```

---

### 10. Mark Review as Helpful

Vote that a review is helpful.

**Endpoint:** `POST /reviews/:id/helpful`

**Authentication:** Required

**Example Request:**
```bash
curl -X POST "http://localhost:4000/api/v1/reviews/review123/helpful" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Review marked as helpful",
  "data": {
    "helpfulCount": 13,
    "notHelpfulCount": 1
  }
}
```

---

### 11. Mark Review as Not Helpful

Vote that a review is not helpful.

**Endpoint:** `POST /reviews/:id/not-helpful`

**Authentication:** Required

**Example Request:**
```bash
curl -X POST "http://localhost:4000/api/v1/reviews/review123/not-helpful" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 12. Report Review

Report an inappropriate review.

**Endpoint:** `POST /reviews/:id/report`

**Authentication:** Required

**Request Body:**
```json
{
  "reason": "spam"
}
```

**Reason Options:**
- `spam` - Review is spam
- `harassment` - Contains harassment
- `inappropriate` - Inappropriate content
- `fake` - Fake or fraudulent review
- `other` - Other reason

**Example Request:**
```bash
curl -X POST "http://localhost:4000/api/v1/reviews/review123/report" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "spam"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Review reported successfully. Our team will review it."
}
```

---

### 13. Get Review Statistics

Get aggregated statistics for a reviewee.

**Endpoint:** `GET /reviews/:revieweeId/statistics`

**Authentication:** Public

**Example Request:**
```bash
curl -X GET "http://localhost:4000/api/v1/reviews/user123/statistics"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "averageRating": 4.8,
    "totalReviews": 45,
    "ratingDistribution": {
      "5": 35,
      "4": 8,
      "3": 2,
      "2": 0,
      "1": 0
    },
    "detailedAverages": {
      "professionalism": 4.9,
      "communication": 4.7,
      "expertise": 4.8,
      "punctuality": 4.6,
      "value": 4.9
    }
  }
}
```

---

## Request Examples

### Example 1: Create Detailed Review

```bash
curl -X POST "http://localhost:4000/api/v1/reviews" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "revieweeId": "coach123",
    "revieweeRole": "coach",
    "relatedTo": {
      "entityType": "training_session",
      "entityId": "session456"
    },
    "rating": 5,
    "title": "Best Football Coach in Cairo",
    "review": "Ahmed helped improve my skills significantly. Professional, knowledgeable, and always on time.",
    "detailedRatings": {
      "professionalism": 5,
      "communication": 5,
      "expertise": 5,
      "punctuality": 5,
      "value": 5
    }
  }'
```

### Example 2: Get High-Rated Reviews Only

```bash
curl -X GET "http://localhost:4000/api/v1/reviews/coach/coach123?minRating=4&sort=-rating&limit=5"
```

### Example 3: Update Review Within 24 Hours

```bash
curl -X PUT "http://localhost:4000/api/v1/reviews/review123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "review": "Actually, the session was even better than I initially thought!"
  }'
```

### Example 4: Coach Responds to Review

```bash
curl -X POST "http://localhost:4000/api/v1/reviews/review123/response" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Thank you for the kind words! Keep up the great work!"
  }'
```

---

## Response Examples

### Success Response (Create Review)

```json
{
  "success": true,
  "message": "Review created successfully",
  "data": {
    "_id": "review123",
    "revieweeId": "coach123",
    "revieweeRole": "coach",
    "reviewerId": {
      "_id": "player456",
      "firstName": "Sarah",
      "lastName": "Ali",
      "avatar": "https://example.com/avatar.jpg"
    },
    "reviewerRole": "player",
    "relatedTo": {
      "entityType": "training_session",
      "entityId": "session789"
    },
    "rating": 5,
    "title": "Excellent Coach!",
    "review": "Ahmed is an outstanding coach.",
    "detailedRatings": {
      "professionalism": 5,
      "communication": 5,
      "expertise": 5,
      "punctuality": 5,
      "value": 5
    },
    "helpfulCount": 0,
    "notHelpfulCount": 0,
    "isVerified": true,
    "isReported": false,
    "isHidden": false,
    "isDeleted": false,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
}
```

---

## Error Handling

### Common Error Responses

#### 400 Bad Request - Missing Required Fields
```json
{
  "success": false,
  "message": "Please provide all required fields"
}
```

#### 400 Bad Request - Duplicate Review
```json
{
  "success": false,
  "message": "You have already reviewed this entity"
}
```

#### 400 Bad Request - Edit Window Expired
```json
{
  "success": false,
  "message": "Reviews can only be edited within 24 hours of creation"
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

#### 403 Forbidden - Not Reviewee
```json
{
  "success": false,
  "message": "Only the reviewee can respond to this review"
}
```

#### 404 Not Found - Review Not Found
```json
{
  "success": false,
  "message": "Review not found"
}
```

#### 500 Server Error
```json
{
  "success": false,
  "message": "Error creating review",
  "error": "Detailed error message"
}
```

---

## Features Summary

### Review Creation & Management
- ✅ Star ratings (1-5)
- ✅ Optional detailed ratings across 5 categories
- ✅ Multilingual support (English and Arabic)
- ✅ 24-hour edit window
- ✅ Soft delete functionality
- ✅ Duplicate prevention (one review per entity)

### Social Features
- ✅ Helpful/not helpful voting
- ✅ Review responses from service providers
- ✅ Automatic notification on new review
- ✅ Automatic notification on response

### Statistics & Analytics
- ✅ Automatic rating calculation
- ✅ Rating distribution histogram
- ✅ Detailed averages per category
- ✅ Total review count
- ✅ Real-time profile updates

### Moderation & Safety
- ✅ Review reporting system
- ✅ Multiple report reasons
- ✅ Review hiding capability
- ✅ Verified review flag
- ✅ Spam protection

---

## Best Practices

### For Frontend Integration

1. **Display Star Ratings**
```javascript
const StarRating = ({ rating }) => {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map(star => (
        <span key={star} className={star <= rating ? 'filled' : 'empty'}>
          ★
        </span>
      ))}
      <span className="rating-number">{rating.toFixed(1)}</span>
    </div>
  );
};
```

2. **Show Detailed Ratings**
```javascript
const DetailedRatings = ({ ratings }) => {
  const categories = [
    { key: 'professionalism', label: 'Professionalism' },
    { key: 'communication', label: 'Communication' },
    { key: 'expertise', label: 'Expertise' },
    { key: 'punctuality', label: 'Punctuality' },
    { key: 'value', label: 'Value for Money' }
  ];

  return (
    <div className="detailed-ratings">
      {categories.map(cat => (
        <div key={cat.key} className="rating-bar">
          <span>{cat.label}</span>
          <div className="bar">
            <div
              className="fill"
              style={{ width: `${(ratings[cat.key] / 5) * 100}%` }}
            />
          </div>
          <span>{ratings[cat.key]}</span>
        </div>
      ))}
    </div>
  );
};
```

3. **Implement Review Form**
```javascript
const ReviewForm = ({ revieweeId, revieweeRole, entityId, entityType }) => {
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [detailedRatings, setDetailedRatings] = useState({
    professionalism: 5,
    communication: 5,
    expertise: 5,
    punctuality: 5,
    value: 5
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const response = await fetch('/api/v1/reviews', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        revieweeId,
        revieweeRole,
        relatedTo: { entityType, entityId },
        rating,
        review,
        detailedRatings
      })
    });

    const data = await response.json();
    if (data.success) {
      // Show success message
      // Redirect or refresh
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <StarRatingInput value={rating} onChange={setRating} />
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        required
      />
      <DetailedRatingsInput
        ratings={detailedRatings}
        onChange={setDetailedRatings}
      />
      <button type="submit">Submit Review</button>
    </form>
  );
};
```

4. **Display Rating Distribution**
```javascript
const RatingDistribution = ({ distribution, total }) => {
  return (
    <div className="rating-distribution">
      {[5, 4, 3, 2, 1].map(stars => {
        const count = distribution[stars] || 0;
        const percentage = (count / total) * 100;

        return (
          <div key={stars} className="distribution-row">
            <span>{stars} ★</span>
            <div className="bar">
              <div
                className="fill"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span>{count}</span>
          </div>
        );
      })}
    </div>
  );
};
```

5. **Helpful Vote Buttons**
```javascript
const HelpfulVotes = ({ reviewId, helpfulCount, notHelpfulCount }) => {
  const voteHelpful = async () => {
    await fetch(`/api/v1/reviews/${reviewId}/helpful`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    // Refresh review
  };

  const voteNotHelpful = async () => {
    await fetch(`/api/v1/reviews/${reviewId}/not-helpful`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    // Refresh review
  };

  return (
    <div className="helpful-votes">
      <span>Was this review helpful?</span>
      <button onClick={voteHelpful}>
        👍 Yes ({helpfulCount})
      </button>
      <button onClick={voteNotHelpful}>
        👎 No ({notHelpfulCount})
      </button>
    </div>
  );
};
```

---

## Testing Commands

### Test Create Review
```bash
curl -X POST "http://localhost:4000/api/v1/reviews" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "revieweeId": "COACH_ID",
    "revieweeRole": "coach",
    "relatedTo": {
      "entityType": "training_session",
      "entityId": "SESSION_ID"
    },
    "rating": 5,
    "review": "Great coach!"
  }'
```

### Test Get Coach Reviews
```bash
curl -X GET "http://localhost:4000/api/v1/reviews/coach/COACH_ID"
```

### Test Get Statistics
```bash
curl -X GET "http://localhost:4000/api/v1/reviews/COACH_ID/statistics"
```

### Test Add Response
```bash
curl -X POST "http://localhost:4000/api/v1/reviews/REVIEW_ID/response" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Thank you for your feedback!"
  }'
```

### Test Mark as Helpful
```bash
curl -X POST "http://localhost:4000/api/v1/reviews/REVIEW_ID/helpful" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Notes

- Reviews cannot be edited after 24 hours of creation
- Only one review allowed per user per entity (training session, consultation, membership)
- Review statistics are automatically updated when reviews are created, updated, or deleted
- Deleted reviews are soft-deleted (not permanently removed)
- Hidden reviews are not included in statistics calculations
- Notifications are sent to reviewee when a review is created
- Notifications are sent to reviewer when reviewee responds

---

## Related APIs

- [Authentication API](./AUTH-API-DOCUMENTATION.md)
- [Notification API](./NOTIFICATION-API-DOCUMENTATION.md)
- [Coach API](./COACH-API-DOCUMENTATION.md)
- [Specialist API](./SPECIALIST-API-DOCUMENTATION.md)
- [Club API](./CLUB-API-DOCUMENTATION.md)

---

## Support

For issues or questions, please contact the development team.

**Last Updated:** January 2025
**API Version:** v1
