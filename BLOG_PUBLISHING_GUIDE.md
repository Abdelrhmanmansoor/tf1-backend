# 📝 SportX Blog Publishing Guide

## Overview
Complete API documentation for the SportX Platform Blog system. Create, manage, and publish articles about sports news, training tips, nutrition, and more.

---

## 🔐 Authentication
All protected endpoints require:
- **Header:** `Authorization: Bearer {token}`
- **Token Source:** From login endpoint (`/api/v1/auth/login`)

---

## 📚 API Endpoints

### 1️⃣ Create Article
**Create a new draft article**

```
POST /api/v1/blog/articles
```

**Authentication:** ✅ Required

**Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

**Body (Form Data):**
```javascript
{
  "title": "10 Training Tips for Football Players",
  "titleAr": "10 نصائح تدريبية للاعبي كرة القدم",
  "content": "Detailed article content here... (minimum 100 characters)",
  "contentAr": "محتوى المقالة بالعربية...",
  "excerpt": "Quick summary of the article",
  "excerptAr": "ملخص سريع للمقالة",
  "category": "training_tips",
  "categoryAr": "نصائح تدريبية",
  "tags": ["football", "training", "fitness"],
  "coverImage": {file},  // Optional: cover image file
  "seoTitle": "10 Training Tips for Football Players - SportX",
  "seoDescription": "Learn effective training strategies for football",
  "seoKeywords": ["training", "football", "tips"]
}
```

**Categories (enum):**
- `sports_news`
- `training_tips`
- `nutrition`
- `injury_prevention`
- `player_spotlight`
- `coaching`
- `recruitment`
- `event_coverage`
- `other`

**Response (201):**
```json
{
  "success": true,
  "message": "Article created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "10 Training Tips for Football Players",
    "slug": "10-training-tips-for-football-players",
    "content": "Detailed article content...",
    "author": "507f191e810c19729de860ea",
    "status": "draft",
    "isPublished": false,
    "views": 0,
    "likes": [],
    "comments": [],
    "createdAt": "2025-11-24T10:30:00Z",
    "updatedAt": "2025-11-24T10:30:00Z"
  }
}
```

---

### 2️⃣ Get All Articles
**Fetch published articles with pagination**

```
GET /api/v1/blog/articles?page=1&limit=10&category=training_tips&featured=true&search=fitness
```

**Authentication:** ❌ Not Required

**Query Parameters:**
- `page` (number, default: 1) - Page number for pagination
- `limit` (number, default: 10) - Articles per page
- `category` (string, optional) - Filter by category
- `featured` (boolean, optional) - Show only featured articles
- `search` (string, optional) - Search in title, content, and tags

**Response (200):**
```json
{
  "success": true,
  "count": 10,
  "total": 45,
  "page": 1,
  "pages": 5,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "10 Training Tips for Football Players",
      "slug": "10-training-tips-for-football-players",
      "excerpt": "Quick summary...",
      "category": "training_tips",
      "author": {
        "_id": "507f191e810c19729de860ea",
        "firstName": "Ahmed",
        "lastName": "Mohamed",
        "profilePicture": "https://..."
      },
      "coverImage": {
        "url": "https://res.cloudinary.com/...",
        "publicId": "blog/..."
      },
      "views": 324,
      "likes": 45,
      "comments": 12,
      "isFeatured": true,
      "publishedAt": "2025-11-24T10:30:00Z"
    },
    // ... more articles
  ]
}
```

---

### 3️⃣ Get Article by ID or Slug
**Fetch a single article**

```
GET /api/v1/blog/articles/{id-or-slug}
```

**Authentication:** ❌ Not Required (but checks access for drafts)

**URL Parameters:**
- `id-or-slug` - Article MongoDB ID or URL slug

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "10 Training Tips for Football Players",
    "titleAr": "10 نصائح تدريبية للاعبي كرة القدم",
    "slug": "10-training-tips-for-football-players",
    "content": "Full article content...",
    "contentAr": "محتوى المقالة كاملاً...",
    "excerpt": "Quick summary...",
    "category": "training_tips",
    "categoryAr": "نصائح تدريبية",
    "tags": ["football", "training", "fitness"],
    "author": {
      "_id": "507f191e810c19729de860ea",
      "firstName": "Ahmed",
      "lastName": "Mohamed",
      "profilePicture": "https://...",
      "email": "ahmed@example.com"
    },
    "coverImage": {
      "url": "https://res.cloudinary.com/...",
      "publicId": "blog/..."
    },
    "status": "published",
    "isPublished": true,
    "publishedAt": "2025-11-24T10:30:00Z",
    "views": 325,
    "likes": [
      {
        "userId": "507f191e810c19729de860eb",
        "likedAt": "2025-11-24T12:00:00Z"
      }
    ],
    "comments": [
      {
        "_id": "507f191e810c19729de860ec",
        "userId": "507f191e810c19729de860ed",
        "name": "John Doe",
        "text": "Great article!",
        "createdAt": "2025-11-24T11:30:00Z"
      }
    ],
    "seoTitle": "10 Training Tips for Football Players - SportX",
    "seoDescription": "Learn effective training strategies",
    "seoKeywords": ["training", "football", "tips"],
    "createdAt": "2025-11-24T10:30:00Z",
    "updatedAt": "2025-11-24T10:30:00Z"
  }
}
```

**Error (404):**
```json
{
  "success": false,
  "message": "Article not found",
  "code": "NOT_FOUND"
}
```

---

### 4️⃣ Update Article
**Modify article content (draft or published)**

```
PATCH /api/v1/blog/articles/{id}
```

**Authentication:** ✅ Required (Author Only)

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Body:**
```javascript
{
  "title": "Updated Title",
  "titleAr": "العنوان المحدث",
  "content": "Updated content...",
  "contentAr": "المحتوى المحدث...",
  "excerpt": "Updated excerpt",
  "excerptAr": "الملخص المحدث",
  "category": "nutrition",
  "categoryAr": "التغذية",
  "tags": ["nutrition", "health"],
  "seoTitle": "Updated SEO Title",
  "seoDescription": "Updated SEO Description",
  "seoKeywords": ["nutrition", "health", "diet"]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Article updated successfully",
  "data": { /* updated article */ }
}
```

**Error (403):**
```json
{
  "success": false,
  "message": "Only author can update this article",
  "code": "UNAUTHORIZED"
}
```

---

### 5️⃣ Delete Article
**Soft delete an article (can be restored later)**

```
DELETE /api/v1/blog/articles/{id}
```

**Authentication:** ✅ Required (Author Only)

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Article deleted successfully"
}
```

---

### 6️⃣ Publish Article
**Change article status from draft to published**

```
POST /api/v1/blog/articles/{id}/publish
```

**Authentication:** ✅ Required (Author Only)

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Article published successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "status": "published",
    "isPublished": true,
    "publishedAt": "2025-11-24T15:45:00Z"
  }
}
```

---

### 7️⃣ Unpublish Article
**Revert article status from published to draft**

```
POST /api/v1/blog/articles/{id}/unpublish
```

**Authentication:** ✅ Required (Author Only)

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Article unpublished successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "status": "draft",
    "isPublished": false
  }
}
```

---

### 8️⃣ Like Article
**Add your like to an article**

```
POST /api/v1/blog/articles/{id}/like
```

**Authentication:** ✅ Required

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Article liked",
  "likesCount": 46
}
```

---

### 9️⃣ Unlike Article
**Remove your like from an article**

```
POST /api/v1/blog/articles/{id}/unlike
```

**Authentication:** ✅ Required

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Article unliked",
  "likesCount": 45
}
```

---

### 🔟 Add Comment
**Post a comment on an article**

```
POST /api/v1/blog/articles/{id}/comments
```

**Authentication:** ✅ Required

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Body:**
```javascript
{
  "text": "Great article! Very helpful tips."
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Comment added successfully",
  "commentsCount": 13
}
```

---

## 🚀 Quick Start Examples

### Create and Publish an Article

```bash
# Step 1: Create article (draft)
curl -X POST https://api.sportx.app/api/v1/blog/articles \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "title=My First Article" \
  -F "content=This is the content of my article..." \
  -F "category=training_tips" \
  -F "tags=fitness,training" \
  -F "coverImage=@path/to/image.jpg"

# Response includes: "status": "draft", "isPublished": false

# Step 2: Publish the article
curl -X POST https://api.sportx.app/api/v1/blog/articles/ARTICLE_ID/publish \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response: "status": "published", "isPublished": true, "publishedAt": "..."
```

### Search Articles

```bash
curl "https://api.sportx.app/api/v1/blog/articles?search=fitness&category=training_tips&limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Read and Comment on Article

```bash
# Get article
curl "https://api.sportx.app/api/v1/blog/articles/10-training-tips-for-football-players"

# Add comment
curl -X POST https://api.sportx.app/api/v1/blog/articles/ARTICLE_ID/comments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"Great tips! Thanks for sharing."}'
```

---

## 📊 Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `MISSING_REQUIRED_FIELDS` | 400 | Title and/or content not provided |
| `NOT_FOUND` | 404 | Article doesn't exist |
| `UNAUTHORIZED` | 403 | Not author/insufficient permissions |
| `ACCESS_DENIED` | 403 | Cannot access draft article |
| `CREATE_ERROR` | 500 | Server error creating article |
| `FETCH_ERROR` | 500 | Server error fetching article |
| `UPDATE_ERROR` | 500 | Server error updating article |
| `DELETE_ERROR` | 500 | Server error deleting article |
| `PUBLISH_ERROR` | 500 | Server error publishing article |
| `UNPUBLISH_ERROR` | 500 | Server error unpublishing article |
| `LIKE_ERROR` | 500 | Server error liking article |
| `UNLIKE_ERROR` | 500 | Server error unliking article |
| `COMMENT_ERROR` | 500 | Server error adding comment |

---

## 🎯 Article Statuses

| Status | Description | Visibility |
|--------|-------------|-----------|
| `draft` | Work in progress | Author only |
| `published` | Live for readers | Public |
| `archived` | Old content | Restricted |

---

## 📝 Content Guidelines

- **Title:** 5-200 characters (required)
- **Content:** Minimum 100 characters (required)
- **Excerpt:** 0-500 characters (auto-generated from content if not provided)
- **Tags:** Array of lowercase strings (optional)
- **Category:** Must be one of the predefined categories

---

## 🌐 Internationalization (i18n)

All fields support both English and Arabic:
- `title` + `titleAr`
- `content` + `contentAr`
- `excerpt` + `excerptAr`
- `category` + `categoryAr`

The frontend can select which language to display based on user preference.

---

## 📈 SEO Optimization

Each article supports SEO metadata:
- `seoTitle` - Meta title tag (max 60 characters recommended)
- `seoDescription` - Meta description (max 160 characters recommended)
- `seoKeywords` - Array of keywords for search engines

---

## ⚡ Rate Limiting

- **Create Article:** 10 requests per hour
- **Update Article:** 20 requests per hour
- **General Queries:** 100 requests per hour

---

## 🔒 Security Notes

- Only article authors can edit/delete their own articles
- Draft articles are only visible to their author
- All user inputs are sanitized to prevent XSS attacks
- File uploads are scanned for malware
- Comments can be flagged as inappropriate

---

## 📱 Mobile Integration

All endpoints support mobile clients:
- Request body compression
- Pagination support
- Optional field selection
- Image optimization

---

## 🎉 Happy Publishing!

Start creating quality content for the SportX community today! 🚀

For support: support@sportx.app

**Last Updated:** November 24, 2025  
**API Version:** v1  
**Status:** ✅ Active
