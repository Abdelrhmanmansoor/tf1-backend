# Frontend Integration Guide

## Table of Contents
1. [Overview](#overview)
2. [New API Endpoints](#new-api-endpoints)
3. [Rating System Implementation](#rating-system-implementation)
4. [Recent Jobs Feature](#recent-jobs-feature)
5. [Top Rated Players Feature](#top-rated-players-feature)
6. [Complete Examples](#complete-examples)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)

---

## Overview

This guide covers the implementation of three major features:
1. **Universal Rating System** - All users (players, coaches, specialists, clubs) can give and receive ratings
2. **Recent Jobs** - Display the 3 most recent job postings
3. **Top Rated Players** - Show the top 3 players by rating

### Base URL
```
http://localhost:4000/api/v1
```

---

## New API Endpoints

### 1. Get Recent Jobs
**Endpoint:** `GET /search/jobs/recent`

**Query Parameters:**
- `limit` (optional, default: 3) - Number of jobs to return

**Example Request:**
```javascript
const response = await fetch('http://localhost:4000/api/v1/search/jobs/recent?limit=3');
const data = await response.json();
```

**Example Response:**
```json
{
  "success": true,
  "jobs": [
    {
      "_id": "67123abc456def789",
      "title": "Head Football Coach",
      "titleAr": "مدرب كرة قدم رئيسي",
      "description": "We are looking for an experienced football coach...",
      "descriptionAr": "نبحث عن مدرب كرة قدم ذو خبرة...",
      "club": {
        "_id": "67123abc456def123",
        "name": "Al Ahly Sports Club",
        "logo": "https://example.com/logo.png",
        "location": {
          "city": "Cairo",
          "country": "Egypt"
        }
      },
      "jobType": "permanent",
      "category": "coach",
      "sport": "Football",
      "position": "Head Coach",
      "employmentType": "full_time",
      "location": {
        "city": "Cairo",
        "country": "Egypt"
      },
      "salary": {
        "amount": 5000,
        "currency": "USD",
        "period": "monthly"
      },
      "numberOfPositions": 1,
      "applicationDeadline": "2025-12-31T23:59:59.999Z",
      "expectedStartDate": "2026-01-15T00:00:00.000Z",
      "applicationStats": {
        "totalApplications": 25,
        "newApplications": 5
      },
      "isFeatured": true,
      "createdAt": "2025-10-21T09:00:00.000Z"
    }
  ],
  "total": 3
}
```

---

### 2. Get Top Rated Players
**Endpoint:** `GET /search/players/top-rated`

**Query Parameters:**
- `limit` (optional, default: 3) - Number of players to return
- `sport` (optional) - Filter by specific sport
- `minReviews` (optional, default: 1) - Minimum number of reviews required

**Example Request:**
```javascript
const response = await fetch('http://localhost:4000/api/v1/search/players/top-rated?limit=3&sport=Football&minReviews=5');
const data = await response.json();
```

**Example Response:**
```json
{
  "success": true,
  "players": [
    {
      "_id": "67123abc456def789",
      "userId": "67123abc456def456",
      "fullName": "Mohamed Salah",
      "firstName": "Mohamed",
      "lastName": "Salah",
      "avatar": "https://example.com/avatar.jpg",
      "primarySport": "Football",
      "additionalSports": ["Futsal"],
      "position": "Forward",
      "positionAr": "مهاجم",
      "level": "professional",
      "location": {
        "city": "Cairo",
        "country": "Egypt"
      },
      "bio": "Professional football player with 10 years of experience...",
      "bioAr": "لاعب كرة قدم محترف بخبرة 10 سنوات...",
      "ratingStats": {
        "averageRating": 4.8,
        "totalReviews": 25
      },
      "verified": true,
      "age": 28
    }
  ],
  "total": 3
}
```

---

### 3. Player Reviews Endpoint
**Endpoint:** `GET /reviews/player/:playerId`

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20) - Reviews per page
- `minRating` (optional) - Filter by minimum rating
- `sort` (optional, default: '-createdAt') - Sort order

**Example Request:**
```javascript
const playerId = '67123abc456def789';
const response = await fetch(`http://localhost:4000/api/v1/reviews/player/${playerId}?page=1&limit=10`);
const data = await response.json();
```

**Example Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 25,
  "page": 1,
  "pages": 3,
  "statistics": {
    "averageRating": 4.8,
    "totalReviews": 25,
    "ratingDistribution": {
      "5": 18,
      "4": 5,
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
      "_id": "67123review123",
      "revieweeId": "67123abc456def789",
      "reviewerId": {
        "_id": "67123reviewer456",
        "firstName": "Ahmed",
        "lastName": "Ali",
        "profileImage": "https://example.com/reviewer.jpg"
      },
      "rating": 5,
      "title": "Excellent player!",
      "review": "Mohamed is an outstanding player with great skills...",
      "reviewAr": "محمد لاعب ممتاز بمهارات رائعة...",
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
        "text": "Thank you for the kind words!",
        "textAr": "شكراً على الكلمات الطيبة!",
        "respondedAt": "2025-10-20T10:30:00.000Z"
      },
      "createdAt": "2025-10-15T14:20:00.000Z"
    }
  ]
}
```

---

## Rating System Implementation

### Who Can Rate Whom?

| Reviewer ↓ / Reviewee → | Player | Coach | Specialist | Club |
|-------------------------|--------|-------|------------|------|
| **Player**              | ✅     | ✅    | ✅         | ✅   |
| **Coach**               | ✅     | ✅    | ✅         | ✅   |
| **Specialist**          | ✅     | ✅    | ✅         | ✅   |
| **Club**                | ✅     | ✅    | ✅         | ✅   |

**Everyone can rate everyone!**

---

### Create a Review

**Endpoint:** `POST /reviews`
**Authentication:** Required (Bearer Token)

**Request Body:**
```json
{
  "revieweeId": "user_id_to_review",
  "revieweeRole": "player",
  "relatedTo": {
    "entityType": "training_session",
    "entityId": "session_id"
  },
  "rating": 5,
  "title": "Excellent experience!",
  "review": "This player showed great professionalism...",
  "reviewAr": "أظهر هذا اللاعب احترافية كبيرة...",
  "detailedRatings": {
    "professionalism": 5,
    "communication": 5,
    "expertise": 5,
    "punctuality": 4,
    "value": 5
  }
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `revieweeId` | String | Yes | User ID of the person being reviewed |
| `revieweeRole` | String | Yes | Role of reviewee: `player`, `coach`, `specialist`, `club` |
| `reviewerId` | String | Auto | Automatically set from authenticated user |
| `reviewerRole` | String | Auto | Automatically set from authenticated user |
| `relatedTo.entityType` | String | Yes | `training_session`, `consultation_session`, `club_membership` |
| `relatedTo.entityId` | String | Yes | ID of the related entity |
| `rating` | Number | Yes | Overall rating (1-5) |
| `title` | String | No | Review title (max 200 chars) |
| `review` | String | Yes | Review text (max 2000 chars) |
| `reviewAr` | String | No | Arabic review text |
| `detailedRatings` | Object | No | Category-specific ratings (1-5 each) |

**Response:**
```json
{
  "success": true,
  "message": "Review created successfully",
  "data": {
    "_id": "67123review123",
    "revieweeId": "user_id",
    "revieweeRole": "player",
    "reviewerId": "reviewer_id",
    "reviewerRole": "coach",
    "rating": 5,
    "title": "Excellent experience!",
    "review": "This player showed great professionalism...",
    "createdAt": "2025-10-21T10:00:00.000Z"
  }
}
```

---

### Get Reviews for Different Roles

All endpoints follow the same pattern:

```javascript
// Get player reviews
GET /api/v1/reviews/player/:playerId

// Get coach reviews
GET /api/v1/reviews/coach/:coachId

// Get specialist reviews
GET /api/v1/reviews/specialist/:specialistId

// Get club reviews
GET /api/v1/reviews/club/:clubId

// Get all reviews written by a user
GET /api/v1/reviews/user/:userId
```

---

### Update a Review

**Endpoint:** `PUT /reviews/:reviewId`
**Authentication:** Required (Bearer Token)
**Time Limit:** Can only update within 24 hours of creation

**Request Body:**
```json
{
  "rating": 4,
  "title": "Updated title",
  "review": "Updated review text...",
  "detailedRatings": {
    "professionalism": 4,
    "communication": 5
  }
}
```

---

### Delete a Review

**Endpoint:** `DELETE /reviews/:reviewId`
**Authentication:** Required (Bearer Token)

**Response:**
```json
{
  "success": true,
  "message": "Review deleted successfully"
}
```

---

### Add Response to Review

**Endpoint:** `POST /reviews/:reviewId/response`
**Authentication:** Required (Must be the reviewee)

**Request Body:**
```json
{
  "responseText": "Thank you for your feedback!",
  "responseTextAr": "شكراً على ملاحظاتك!"
}
```

---

### Mark Review as Helpful

**Endpoint:** `POST /reviews/:reviewId/helpful`
**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Review marked as helpful",
  "helpfulCount": 13
}
```

---

### Report a Review

**Endpoint:** `POST /reviews/:reviewId/report`
**Authentication:** Required

**Request Body:**
```json
{
  "reason": "Inappropriate content"
}
```

---

## Complete Examples

### Example 1: Display Recent Jobs on Homepage

```javascript
import React, { useState, useEffect } from 'react';

const RecentJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRecentJobs();
  }, []);

  const fetchRecentJobs = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/v1/search/jobs/recent?limit=3');
      const data = await response.json();

      if (data.success) {
        setJobs(data.jobs);
      } else {
        setError('Failed to fetch jobs');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading jobs...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="recent-jobs">
      <h2>Recent Job Openings</h2>
      {jobs.length === 0 ? (
        <p>No jobs available at the moment.</p>
      ) : (
        <div className="jobs-grid">
          {jobs.map(job => (
            <div key={job._id} className="job-card">
              <div className="club-info">
                <img src={job.club.logo} alt={job.club.name} />
                <h3>{job.club.name}</h3>
              </div>
              <h4>{job.title}</h4>
              <p className="job-details">
                <span>{job.sport}</span> • <span>{job.jobType}</span>
              </p>
              <p className="location">
                📍 {job.location?.city}, {job.location?.country}
              </p>
              {job.salary && (
                <p className="salary">
                  💰 {job.salary.currency} {job.salary.amount}/{job.salary.period}
                </p>
              )}
              <p className="deadline">
                Deadline: {new Date(job.applicationDeadline).toLocaleDateString()}
              </p>
              <button className="apply-btn">View Details</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentJobs;
```

---

### Example 2: Display Top Rated Players

```javascript
import React, { useState, useEffect } from 'react';

const TopRatedPlayers = ({ sport = null, minReviews = 5 }) => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopPlayers();
  }, [sport]);

  const fetchTopPlayers = async () => {
    try {
      let url = 'http://localhost:4000/api/v1/search/players/top-rated?limit=3';
      if (sport) url += `&sport=${sport}`;
      if (minReviews) url += `&minReviews=${minReviews}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setPlayers(data.players);
      }
    } catch (err) {
      console.error('Error fetching top players:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="stars">
        {[1, 2, 3, 4, 5].map(star => (
          <span key={star} className={star <= rating ? 'filled' : 'empty'}>
            ⭐
          </span>
        ))}
        <span className="rating-text">{rating.toFixed(1)}</span>
      </div>
    );
  };

  if (loading) return <div>Loading top players...</div>;

  return (
    <div className="top-rated-players">
      <h2>Top Rated Players</h2>
      {players.length === 0 ? (
        <p>No top-rated players found.</p>
      ) : (
        <div className="players-grid">
          {players.map(player => (
            <div key={player._id} className="player-card">
              <img
                src={player.avatar || '/default-avatar.png'}
                alt={player.fullName}
                className="player-avatar"
              />
              <h3>{player.fullName}</h3>
              {player.verified && <span className="verified-badge">✓ Verified</span>}
              <p className="sport">{player.primarySport}</p>
              <p className="position">{player.position}</p>
              <p className="location">
                📍 {player.location?.city}, {player.location?.country}
              </p>
              <div className="rating-info">
                {renderStars(player.ratingStats.averageRating)}
                <p className="review-count">
                  ({player.ratingStats.totalReviews} reviews)
                </p>
              </div>
              <button className="view-profile-btn">View Profile</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TopRatedPlayers;
```

---

### Example 3: Complete Rating System Component

```javascript
import React, { useState, useEffect } from 'react';

const RatingSystem = ({ userId, userRole, authToken }) => {
  const [reviews, setReviews] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [userId]);

  const fetchReviews = async () => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/v1/reviews/${userRole}/${userId}?page=1&limit=10`
      );
      const data = await response.json();

      if (data.success) {
        setReviews(data.data);
        setStatistics(data.statistics);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (reviewData) => {
    try {
      const response = await fetch('http://localhost:4000/api/v1/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          revieweeId: userId,
          revieweeRole: userRole,
          ...reviewData
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('Review submitted successfully!');
        fetchReviews(); // Refresh reviews
        setShowReviewForm(false);
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const markAsHelpful = async (reviewId) => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/v1/reviews/${reviewId}/helpful`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        fetchReviews(); // Refresh to show updated count
      }
    } catch (err) {
      console.error('Error marking as helpful:', err);
    }
  };

  const renderRatingDistribution = () => {
    if (!statistics) return null;

    return (
      <div className="rating-distribution">
        <h3>Rating Distribution</h3>
        {[5, 4, 3, 2, 1].map(star => (
          <div key={star} className="rating-bar">
            <span className="star-label">{star} ⭐</span>
            <div className="bar-container">
              <div
                className="bar-fill"
                style={{
                  width: `${(statistics.ratingDistribution[star] / statistics.totalReviews) * 100}%`
                }}
              />
            </div>
            <span className="count">{statistics.ratingDistribution[star]}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <div>Loading reviews...</div>;

  return (
    <div className="rating-system">
      {/* Overall Rating */}
      {statistics && (
        <div className="overall-rating">
          <div className="rating-score">
            <h1>{statistics.averageRating.toFixed(1)}</h1>
            <div className="stars">
              {[1, 2, 3, 4, 5].map(star => (
                <span key={star} className={star <= statistics.averageRating ? 'filled' : 'empty'}>
                  ⭐
                </span>
              ))}
            </div>
            <p>{statistics.totalReviews} reviews</p>
          </div>
          {renderRatingDistribution()}
        </div>
      )}

      {/* Detailed Averages */}
      {statistics?.detailedAverages && (
        <div className="detailed-ratings">
          <h3>Detailed Ratings</h3>
          {Object.entries(statistics.detailedAverages).map(([category, rating]) => (
            rating && (
              <div key={category} className="category-rating">
                <span className="category-name">{category}</span>
                <div className="rating-bar">
                  <div
                    className="bar-fill"
                    style={{ width: `${(rating / 5) * 100}%` }}
                  />
                </div>
                <span className="rating-value">{rating.toFixed(1)}</span>
              </div>
            )
          ))}
        </div>
      )}

      {/* Write Review Button */}
      <button
        className="write-review-btn"
        onClick={() => setShowReviewForm(!showReviewForm)}
      >
        Write a Review
      </button>

      {/* Review Form */}
      {showReviewForm && (
        <ReviewForm
          onSubmit={submitReview}
          onCancel={() => setShowReviewForm(false)}
        />
      )}

      {/* Reviews List */}
      <div className="reviews-list">
        <h3>Reviews ({reviews.length})</h3>
        {reviews.map(review => (
          <div key={review._id} className="review-card">
            <div className="review-header">
              <img
                src={review.reviewerId.profileImage || '/default-avatar.png'}
                alt={review.reviewerId.firstName}
                className="reviewer-avatar"
              />
              <div className="reviewer-info">
                <h4>{review.reviewerId.firstName} {review.reviewerId.lastName}</h4>
                <div className="stars">
                  {[1, 2, 3, 4, 5].map(star => (
                    <span key={star} className={star <= review.rating ? 'filled' : 'empty'}>
                      ⭐
                    </span>
                  ))}
                </div>
                <p className="date">
                  {new Date(review.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {review.title && <h5 className="review-title">{review.title}</h5>}
            <p className="review-text">{review.review}</p>

            {/* Response */}
            {review.response && (
              <div className="review-response">
                <strong>Response from {userRole}:</strong>
                <p>{review.response.text}</p>
                <span className="response-date">
                  {new Date(review.response.respondedAt).toLocaleDateString()}
                </span>
              </div>
            )}

            {/* Helpful Buttons */}
            <div className="review-actions">
              <button onClick={() => markAsHelpful(review._id)}>
                👍 Helpful ({review.helpfulCount})
              </button>
              <button onClick={() => {}}>
                👎 Not Helpful ({review.notHelpfulCount})
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Review Form Component
const ReviewForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    rating: 5,
    title: '',
    review: '',
    relatedTo: {
      entityType: 'training_session',
      entityId: ''
    },
    detailedRatings: {
      professionalism: 5,
      communication: 5,
      expertise: 5,
      punctuality: 5,
      value: 5
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <h3>Write Your Review</h3>

      {/* Overall Rating */}
      <div className="form-group">
        <label>Overall Rating</label>
        <div className="star-rating">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              className={star <= formData.rating ? 'filled' : 'empty'}
              onClick={() => setFormData({...formData, rating: star})}
            >
              ⭐
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div className="form-group">
        <label>Title (optional)</label>
        <input
          type="text"
          maxLength={200}
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
          placeholder="Summarize your experience"
        />
      </div>

      {/* Review Text */}
      <div className="form-group">
        <label>Review</label>
        <textarea
          required
          maxLength={2000}
          value={formData.review}
          onChange={(e) => setFormData({...formData, review: e.target.value})}
          placeholder="Share your experience..."
          rows={5}
        />
      </div>

      {/* Related Entity */}
      <div className="form-group">
        <label>Related To</label>
        <select
          value={formData.relatedTo.entityType}
          onChange={(e) => setFormData({
            ...formData,
            relatedTo: {...formData.relatedTo, entityType: e.target.value}
          })}
        >
          <option value="training_session">Training Session</option>
          <option value="consultation_session">Consultation Session</option>
          <option value="club_membership">Club Membership</option>
        </select>
      </div>

      {/* Entity ID */}
      <div className="form-group">
        <label>Session/Membership ID</label>
        <input
          type="text"
          required
          value={formData.relatedTo.entityId}
          onChange={(e) => setFormData({
            ...formData,
            relatedTo: {...formData.relatedTo, entityId: e.target.value}
          })}
          placeholder="Enter the session or membership ID"
        />
      </div>

      {/* Detailed Ratings */}
      <div className="form-group">
        <label>Detailed Ratings (optional)</label>
        {Object.keys(formData.detailedRatings).map(category => (
          <div key={category} className="detailed-rating-input">
            <span>{category}</span>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  className={star <= formData.detailedRatings[category] ? 'filled' : 'empty'}
                  onClick={() => setFormData({
                    ...formData,
                    detailedRatings: {
                      ...formData.detailedRatings,
                      [category]: star
                    }
                  })}
                >
                  ⭐
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Form Actions */}
      <div className="form-actions">
        <button type="submit" className="submit-btn">Submit Review</button>
        <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
};

export default RatingSystem;
```

---

### Example 4: Using with Axios

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:4000/api/v1';

// Create axios instance with defaults
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API Functions
export const reviewAPI = {
  // Get reviews
  getPlayerReviews: (playerId, params = {}) =>
    api.get(`/reviews/player/${playerId}`, { params }),

  getCoachReviews: (coachId, params = {}) =>
    api.get(`/reviews/coach/${coachId}`, { params }),

  getSpecialistReviews: (specialistId, params = {}) =>
    api.get(`/reviews/specialist/${specialistId}`, { params }),

  getClubReviews: (clubId, params = {}) =>
    api.get(`/reviews/club/${clubId}`, { params }),

  // Create review
  createReview: (reviewData) =>
    api.post('/reviews', reviewData),

  // Update review
  updateReview: (reviewId, reviewData) =>
    api.put(`/reviews/${reviewId}`, reviewData),

  // Delete review
  deleteReview: (reviewId) =>
    api.delete(`/reviews/${reviewId}`),

  // Add response
  addResponse: (reviewId, responseText, responseTextAr) =>
    api.post(`/reviews/${reviewId}/response`, { responseText, responseTextAr }),

  // Mark helpful
  markHelpful: (reviewId) =>
    api.post(`/reviews/${reviewId}/helpful`),

  // Report review
  reportReview: (reviewId, reason) =>
    api.post(`/reviews/${reviewId}/report`, { reason }),

  // Get statistics
  getStatistics: (revieweeId) =>
    api.get(`/reviews/${revieweeId}/statistics`)
};

export const searchAPI = {
  // Get recent jobs
  getRecentJobs: (limit = 3) =>
    api.get('/search/jobs/recent', { params: { limit } }),

  // Get top rated players
  getTopRatedPlayers: (params = {}) =>
    api.get('/search/players/top-rated', { params })
};

// Usage example
const fetchData = async () => {
  try {
    // Get recent jobs
    const jobsResponse = await searchAPI.getRecentJobs(3);
    console.log('Recent Jobs:', jobsResponse.data);

    // Get top rated players
    const playersResponse = await searchAPI.getTopRatedPlayers({
      limit: 3,
      sport: 'Football',
      minReviews: 5
    });
    console.log('Top Players:', playersResponse.data);

    // Get player reviews
    const reviewsResponse = await reviewAPI.getPlayerReviews('playerId123', {
      page: 1,
      limit: 10
    });
    console.log('Reviews:', reviewsResponse.data);

    // Create a review
    const newReview = await reviewAPI.createReview({
      revieweeId: 'user123',
      revieweeRole: 'player',
      relatedTo: {
        entityType: 'training_session',
        entityId: 'session123'
      },
      rating: 5,
      title: 'Great player!',
      review: 'Excellent skills and teamwork...'
    });
    console.log('New Review:', newReview.data);

  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
  }
};
```

---

## Error Handling

### Common Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Please provide all required fields"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Review not found"
}
```

**500 Server Error:**
```json
{
  "success": false,
  "message": "Error creating review",
  "error": "Detailed error message"
}
```

### Error Handling Best Practices

```javascript
const handleAPICall = async (apiFunction) => {
  try {
    const response = await apiFunction();

    if (response.data.success) {
      return { success: true, data: response.data };
    } else {
      return { success: false, error: response.data.message };
    }
  } catch (error) {
    // Network error
    if (!error.response) {
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      };
    }

    // HTTP error
    const status = error.response.status;
    const message = error.response.data?.message || 'An error occurred';

    switch (status) {
      case 400:
        return { success: false, error: `Invalid request: ${message}` };
      case 401:
        return { success: false, error: 'Please log in to continue' };
      case 403:
        return { success: false, error: 'You do not have permission' };
      case 404:
        return { success: false, error: 'Resource not found' };
      case 500:
        return { success: false, error: 'Server error. Please try again later' };
      default:
        return { success: false, error: message };
    }
  }
};

// Usage
const result = await handleAPICall(() =>
  reviewAPI.createReview(reviewData)
);

if (result.success) {
  console.log('Success:', result.data);
} else {
  console.error('Error:', result.error);
}
```

---

## Best Practices

### 1. Authentication
Always include the Bearer token for protected endpoints:
```javascript
headers: {
  'Authorization': `Bearer ${token}`
}
```

### 2. Pagination
Use pagination for large datasets:
```javascript
const fetchReviews = async (page = 1, limit = 20) => {
  const response = await fetch(
    `${API_URL}/reviews/player/${playerId}?page=${page}&limit=${limit}`
  );
  return response.json();
};
```

### 3. Caching
Cache API responses to reduce server load:
```javascript
const cache = new Map();

const fetchWithCache = async (url, ttl = 5 * 60 * 1000) => {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }

  const response = await fetch(url);
  const data = await response.json();

  cache.set(url, { data, timestamp: Date.now() });
  return data;
};
```

### 4. Loading States
Always show loading states:
```javascript
const [loading, setLoading] = useState(false);
const [data, setData] = useState(null);
const [error, setError] = useState(null);

useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(API_URL);
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, []);
```

### 5. Optimistic Updates
Update UI immediately, then sync with server:
```javascript
const markAsHelpful = async (reviewId) => {
  // Optimistically update UI
  setReviews(prevReviews =>
    prevReviews.map(review =>
      review._id === reviewId
        ? { ...review, helpfulCount: review.helpfulCount + 1 }
        : review
    )
  );

  try {
    // Sync with server
    await reviewAPI.markHelpful(reviewId);
  } catch (err) {
    // Revert on error
    setReviews(prevReviews =>
      prevReviews.map(review =>
        review._id === reviewId
          ? { ...review, helpfulCount: review.helpfulCount - 1 }
          : review
      )
    );
    alert('Failed to mark as helpful');
  }
};
```

### 6. Input Validation
Validate user input before sending to API:
```javascript
const validateReview = (reviewData) => {
  const errors = {};

  if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5) {
    errors.rating = 'Rating must be between 1 and 5';
  }

  if (!reviewData.review || reviewData.review.trim().length < 10) {
    errors.review = 'Review must be at least 10 characters';
  }

  if (reviewData.review.length > 2000) {
    errors.review = 'Review cannot exceed 2000 characters';
  }

  return errors;
};
```

### 7. Debouncing Search
Debounce search inputs to reduce API calls:
```javascript
import { useCallback, useEffect, useState } from 'react';

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// Usage
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearchTerm = useDebounce(searchTerm, 500);

useEffect(() => {
  if (debouncedSearchTerm) {
    searchAPI(debouncedSearchTerm);
  }
}, [debouncedSearchTerm]);
```

---

## Display Rating on Profile

### Where Ratings are Stored

**Players:**
```javascript
playerProfile.ratingStats.averageRating  // 0-5
playerProfile.ratingStats.totalReviews   // Number
```

**Coaches, Specialists, Clubs:**
```javascript
profile.rating.average  // 0-5
profile.rating.count    // Number
```

### Example Profile Component

```javascript
const UserProfile = ({ userId, role }) => {
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    fetchProfileData();
  }, [userId]);

  const fetchProfileData = async () => {
    try {
      // Fetch profile
      const profileResponse = await fetch(`/api/v1/${role}s/${userId}`);
      const profileData = await profileResponse.json();
      setProfile(profileData.data);

      // Fetch reviews
      const reviewsResponse = await fetch(`/api/v1/reviews/${role}/${userId}`);
      const reviewsData = await reviewsResponse.json();
      setReviews(reviewsData.data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const getRating = () => {
    if (role === 'player') {
      return {
        average: profile?.ratingStats?.averageRating || 0,
        count: profile?.ratingStats?.totalReviews || 0
      };
    } else {
      return {
        average: profile?.rating?.average || 0,
        count: profile?.rating?.count || 0
      };
    }
  };

  const rating = getRating();

  return (
    <div className="user-profile">
      <div className="profile-header">
        <img src={profile?.avatar} alt={profile?.name} />
        <h1>{profile?.name}</h1>

        {/* Display Rating */}
        <div className="rating-display">
          <span className="rating-value">{rating.average.toFixed(1)}</span>
          <div className="stars">
            {[1, 2, 3, 4, 5].map(star => (
              <span key={star} className={star <= rating.average ? 'filled' : 'empty'}>
                ⭐
              </span>
            ))}
          </div>
          <span className="review-count">({rating.count} reviews)</span>
        </div>
      </div>

      {/* Display Reviews */}
      <RatingSystem userId={userId} userRole={role} />
    </div>
  );
};
```

---

## Testing Checklist

### Before Going Live:

- [ ] Test all endpoints with different roles (player, coach, specialist, club)
- [ ] Verify authentication works correctly
- [ ] Test pagination for large datasets
- [ ] Verify rating calculations are accurate
- [ ] Test error handling for all edge cases
- [ ] Verify responsive design on mobile devices
- [ ] Test form validation
- [ ] Verify Arabic text displays correctly (if using)
- [ ] Test helpful/not helpful votes
- [ ] Test review responses
- [ ] Test report functionality
- [ ] Verify notifications are sent when reviews are created

---

## Support & Questions

If you encounter any issues or have questions:

1. Check the error message in the API response
2. Verify your authentication token is valid
3. Check the request payload matches the required format
4. Review the browser console for errors
5. Check the server logs for detailed error information

For additional help, contact the backend team or refer to the API documentation at:
`/Users/hazem/Desktop/Projects/Websites/SportsPlatform-BE/REVIEW-API-DOCUMENTATION.md`

---

## Changelog

### Version 1.0 (2025-10-21)
- ✅ Added universal rating system (all roles can rate all roles)
- ✅ Added player review endpoints
- ✅ Added top-rated players endpoint
- ✅ Added recent jobs endpoint
- ✅ Updated rating calculation for all roles
- ✅ Added comprehensive frontend integration examples

---

**Happy Coding! 🚀**
