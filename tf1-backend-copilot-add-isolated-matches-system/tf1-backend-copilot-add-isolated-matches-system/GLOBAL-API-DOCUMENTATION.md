# Global API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Base URL](#base-url)
3. [Authentication](#authentication)
4. [File Upload & Media Management](#file-upload--media-management)
5. [Location & Geocoding](#location--geocoding)
6. [Language & Localization](#language--localization)
7. [Blocking & Reporting](#blocking--reporting)
8. [Analytics](#analytics)
9. [Request Examples](#request-examples)
10. [Error Handling](#error-handling)

---

## Overview

The Global API provides cross-platform features that work across all user roles (Player, Coach, Club, Specialist). These APIs include:

- **File Upload & Media Management** - Upload and manage images, videos, and documents
- **Location Services** - Geocoding and reverse geocoding
- **Language & Localization** - Multilingual support (English/Arabic)
- **Blocking & Reporting** - User blocking and content reporting
- **Analytics** - Profile views and search appearances

---

## Base URL

```
http://localhost:4000/api/v1/global
```

---

## Authentication

Most endpoints require authentication. Include your JWT token in the Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

**Public Endpoints:**
- Geocoding services

**Protected Endpoints:**
- File uploads
- Media library
- Language preferences
- Blocking/reporting
- Analytics

---

## File Upload & Media Management

### 1. Upload Image

Upload an image file (JPEG, PNG, WebP, GIF).

**Endpoint:** `POST /global/upload/image`

**Authentication:** Required

**Content-Type:** `multipart/form-data`

**Form Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | Image file (max 100MB) |
| caption | String | No | Image caption |
| tags | String | No | Comma-separated tags |

**Example Request:**
```bash
curl -X POST "http://localhost:4000/api/v1/global/upload/image" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg" \
  -F "caption=My training session" \
  -F "tags=football,training"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "/uploads/file-1234567890.jpg",
    "publicId": "file-1234567890.jpg",
    "mediaId": "media123"
  }
}
```

---

### 2. Upload Video

Upload a video file (MP4, MPEG, QuickTime).

**Endpoint:** `POST /global/upload/video`

**Authentication:** Required

**Content-Type:** `multipart/form-data`

**Form Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | Video file (max 100MB) |
| caption | String | No | Video caption |
| tags | String | No | Comma-separated tags |

**Example Request:**
```bash
curl -X POST "http://localhost:4000/api/v1/global/upload/video" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/video.mp4" \
  -F "caption=Training highlights"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "/uploads/file-1234567890.mp4",
    "publicId": "file-1234567890.mp4",
    "mediaId": "media456"
  }
}
```

---

### 3. Upload Document

Upload a document file (PDF, DOC, DOCX).

**Endpoint:** `POST /global/upload/document`

**Authentication:** Required

**Content-Type:** `multipart/form-data`

**Form Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | Document file (max 100MB) |

**Example Request:**
```bash
curl -X POST "http://localhost:4000/api/v1/global/upload/document" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/certificate.pdf"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "/uploads/file-1234567890.pdf",
    "publicId": "file-1234567890.pdf",
    "fileName": "certificate.pdf",
    "mediaId": "media789"
  }
}
```

---

### 4. Get Media Library

Retrieve user's uploaded media files with pagination and filtering.

**Endpoint:** `GET /global/media`

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| page | number | Page number | 1 |
| limit | number | Results per page | 20 |
| fileType | string | Filter by type (image, video, document, audio) | - |
| sortBy | string | Sort field (createdAt, fileSize, fileName) | createdAt |
| sortOrder | string | Sort order (asc, desc) | desc |

**Example Request:**
```bash
curl -X GET "http://localhost:4000/api/v1/global/media?fileType=image&page=1&limit=10" \
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
  "hasMore": true,
  "data": [
    {
      "_id": "media123",
      "fileType": "image",
      "fileName": "file-1234567890.jpg",
      "originalName": "training.jpg",
      "fileUrl": "/uploads/file-1234567890.jpg",
      "publicId": "file-1234567890.jpg",
      "fileSize": 1024000,
      "mimeType": "image/jpeg",
      "caption": "My training session",
      "tags": ["football", "training"],
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### 5. Get Storage Usage

Get user's storage usage statistics.

**Endpoint:** `GET /global/media/storage`

**Authentication:** Required

**Example Request:**
```bash
curl -X GET "http://localhost:4000/api/v1/global/media/storage" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 52428800,
    "byType": {
      "image": {
        "size": 20971520,
        "count": 25
      },
      "video": {
        "size": 31457280,
        "count": 5
      },
      "document": {
        "size": 0,
        "count": 0
      }
    }
  }
}
```

---

### 6. Delete Media

Delete a media file from library.

**Endpoint:** `DELETE /global/media/:id`

**Authentication:** Required

**Example Request:**
```bash
curl -X DELETE "http://localhost:4000/api/v1/global/media/media123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Media deleted successfully"
}
```

---

## Location & Geocoding

### 1. Geocode Address

Convert an address to geographic coordinates.

**Endpoint:** `POST /global/location/geocode`

**Authentication:** Public

**Request Body:**
```json
{
  "address": "Cairo, Egypt"
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:4000/api/v1/global/location/geocode" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "Cairo, Egypt"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "lat": 30.0444,
    "lng": 31.2357,
    "formatted": "Cairo, Egypt"
  }
}
```

---

### 2. Reverse Geocode

Convert geographic coordinates to an address.

**Endpoint:** `POST /global/location/reverse-geocode`

**Authentication:** Public

**Request Body:**
```json
{
  "lat": 30.0444,
  "lng": 31.2357
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:4000/api/v1/global/location/reverse-geocode" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 30.0444,
    "lng": 31.2357
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "city": "Cairo",
    "country": "Egypt",
    "formatted": "Cairo, Egypt"
  }
}
```

---

## Language & Localization

### Update Language Preference

Update user's language preference.

**Endpoint:** `PUT /global/language`

**Authentication:** Required

**Request Body:**
```json
{
  "language": "ar"
}
```

**Language Options:**
- `en` - English
- `ar` - Arabic

**Example Request:**
```bash
curl -X PUT "http://localhost:4000/api/v1/global/language" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "ar"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Language preference updated",
  "data": {
    "language": "ar"
  }
}
```

---

## Blocking & Reporting

### 1. Block User

Block a user to prevent interaction.

**Endpoint:** `POST /global/block/:userId`

**Authentication:** Required

**Request Body (Optional):**
```json
{
  "reason": "Spam or inappropriate behavior"
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:4000/api/v1/global/block/user123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Spam messages"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "User blocked successfully"
}
```

**Effects of Blocking:**
- Cannot send/receive messages
- Cannot send/receive requests
- Cannot view detailed profile
- Hidden from search results

---

### 2. Unblock User

Unblock a previously blocked user.

**Endpoint:** `DELETE /global/block/:userId`

**Authentication:** Required

**Example Request:**
```bash
curl -X DELETE "http://localhost:4000/api/v1/global/block/user123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "User unblocked successfully"
}
```

---

### 3. Get Blocked Users

Retrieve list of blocked users.

**Endpoint:** `GET /global/blocked`

**Authentication:** Required

**Example Request:**
```bash
curl -X GET "http://localhost:4000/api/v1/global/blocked" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "block123",
      "blockedUserId": {
        "_id": "user456",
        "firstName": "John",
        "lastName": "Doe",
        "avatar": "https://...",
        "role": "player"
      },
      "reason": "Spam messages",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### 4. Report Content

Report inappropriate content or behavior.

**Endpoint:** `POST /global/report`

**Authentication:** Required

**Request Body:**
```json
{
  "reportType": "user",
  "reportedEntityId": "user123",
  "reportedEntityModel": "User",
  "reason": "harassment",
  "details": "This user has been sending threatening messages"
}
```

**Report Types:**
- `user` - Report a user
- `review` - Report a review
- `message` - Report a message
- `post` - Report a post
- `job` - Report a job posting
- `other` - Other content

**Reason Options:**
- `spam` - Spam content
- `harassment` - Harassment or bullying
- `inappropriate` - Inappropriate content
- `fake` - Fake or fraudulent
- `scam` - Scam or fraud
- `violence` - Violence or threats
- `hate_speech` - Hate speech
- `other` - Other reason

**Example Request:**
```bash
curl -X POST "http://localhost:4000/api/v1/global/report" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "user",
    "reportedEntityId": "user123",
    "reportedEntityModel": "User",
    "reason": "harassment",
    "details": "Threatening messages"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Report submitted successfully. Our team will review it."
}
```

---

## Analytics

### 1. Get Profile Views

Get profile view statistics.

**Endpoint:** `GET /global/analytics/profile-views`

**Authentication:** Required

**Example Request:**
```bash
curl -X GET "http://localhost:4000/api/v1/global/analytics/profile-views" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "thisWeek": 25,
    "thisMonth": 89,
    "trend": "increasing"
  }
}
```

---

### 2. Get Search Appearances

Get search appearance statistics.

**Endpoint:** `GET /global/analytics/search-appearances`

**Authentication:** Required

**Example Request:**
```bash
curl -X GET "http://localhost:4000/api/v1/global/analytics/search-appearances" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 320,
    "thisWeek": 45,
    "thisMonth": 156
  }
}
```

---

## Request Examples

### Example 1: Upload Profile Picture

```bash
curl -X POST "http://localhost:4000/api/v1/global/upload/image" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@profile.jpg" \
  -F "caption=Profile picture" \
  -F "tags=profile"
```

### Example 2: Upload Training Video

```bash
curl -X POST "http://localhost:4000/api/v1/global/upload/video" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@training-session.mp4" \
  -F "caption=Football training highlights" \
  -F "tags=football,training,highlights"
```

### Example 3: Get Image Files Only

```bash
curl -X GET "http://localhost:4000/api/v1/global/media?fileType=image&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 4: Change Language to Arabic

```bash
curl -X PUT "http://localhost:4000/api/v1/global/language" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"language": "ar"}'
```

### Example 5: Block and Report User

```bash
# Block user
curl -X POST "http://localhost:4000/api/v1/global/block/spammer123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Spam messages"}'

# Report user
curl -X POST "http://localhost:4000/api/v1/global/report" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "user",
    "reportedEntityId": "spammer123",
    "reportedEntityModel": "User",
    "reason": "spam",
    "details": "Sending spam messages repeatedly"
  }'
```

---

## Error Handling

### Common Error Responses

#### 400 Bad Request - Missing File
```json
{
  "success": false,
  "message": "Please upload a file"
}
```

#### 400 Bad Request - Invalid File Type
```json
{
  "success": false,
  "message": "Invalid file type"
}
```

#### 400 Bad Request - Cannot Block Self
```json
{
  "success": false,
  "message": "You cannot block yourself"
}
```

#### 400 Bad Request - Invalid Language
```json
{
  "success": false,
  "message": "Invalid language. Must be \"en\" or \"ar\""
}
```

#### 400 Bad Request - Duplicate Report
```json
{
  "success": false,
  "message": "You have already reported this content"
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

#### 404 Not Found - Media Not Found
```json
{
  "success": false,
  "message": "Media not found"
}
```

#### 404 Not Found - User Not Found
```json
{
  "success": false,
  "message": "User not found"
}
```

#### 413 Payload Too Large
```json
{
  "success": false,
  "message": "File too large. Maximum size is 100MB"
}
```

#### 500 Server Error
```json
{
  "success": false,
  "message": "Error uploading file",
  "error": "Detailed error message"
}
```

---

## Features Summary

### File Upload & Media
- ✅ Image upload (JPEG, PNG, WebP, GIF)
- ✅ Video upload (MP4, MPEG, QuickTime)
- ✅ Document upload (PDF, DOC, DOCX)
- ✅ Audio upload (MP3, WAV, OGG)
- ✅ Media library with pagination
- ✅ Storage usage tracking
- ✅ File metadata (caption, tags)
- ✅ Soft delete functionality
- ✅ File size limit (100MB)

### Location Services
- ✅ Geocoding (address → coordinates)
- ✅ Reverse geocoding (coordinates → address)
- ✅ Public access (no authentication required)
- ✅ Production-ready (integrate Google Maps/Mapbox)

### Language & Localization
- ✅ English and Arabic support
- ✅ User language preference
- ✅ Automatic content translation based on preference
- ✅ Consistent across all APIs

### Blocking & Reporting
- ✅ User blocking with reasons
- ✅ Unblock functionality
- ✅ Blocked users list
- ✅ Content reporting system
- ✅ Multiple report types and reasons
- ✅ Priority-based report handling
- ✅ Duplicate report prevention

### Analytics
- ✅ Profile view statistics
- ✅ Search appearance tracking
- ✅ Weekly and monthly metrics
- ✅ Trend analysis

---

## Best Practices

### File Uploads

1. **Client-Side Validation**
```javascript
const validateFile = (file, type) => {
  const maxSize = 100 * 1024 * 1024; // 100MB

  const allowedTypes = {
    image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    video: ['video/mp4', 'video/mpeg', 'video/quicktime'],
    document: ['application/pdf', 'application/msword',
               'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  };

  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 100MB');
  }

  if (!allowedTypes[type].includes(file.type)) {
    throw new Error(`Invalid file type for ${type}`);
  }

  return true;
};
```

2. **Upload with Progress**
```javascript
const uploadFile = async (file, type) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('caption', caption);
  formData.append('tags', tags.join(','));

  const response = await fetch(`/api/v1/global/upload/${type}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  return response.json();
};
```

3. **Display Media Library**
```javascript
const MediaLibrary = () => {
  const [media, setMedia] = useState([]);
  const [filter, setFilter] = useState('all');

  const fetchMedia = async (fileType) => {
    const url = fileType === 'all'
      ? '/api/v1/global/media'
      : `/api/v1/global/media?fileType=${fileType}`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    setMedia(data.data);
  };

  return (
    <div>
      <select onChange={(e) => fetchMedia(e.target.value)}>
        <option value="all">All Files</option>
        <option value="image">Images</option>
        <option value="video">Videos</option>
        <option value="document">Documents</option>
      </select>

      <div className="media-grid">
        {media.map(item => (
          <MediaItem key={item._id} item={item} />
        ))}
      </div>
    </div>
  );
};
```

### Blocking & Reporting

1. **Block User with Confirmation**
```javascript
const blockUser = async (userId, reason) => {
  if (!confirm('Are you sure you want to block this user?')) {
    return;
  }

  const response = await fetch(`/api/v1/global/block/${userId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ reason })
  });

  const data = await response.json();
  if (data.success) {
    alert('User blocked successfully');
  }
};
```

2. **Report Content Form**
```javascript
const ReportForm = ({ entityId, entityType, entityModel }) => {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    const response = await fetch('/api/v1/global/report', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reportType: entityType,
        reportedEntityId: entityId,
        reportedEntityModel: entityModel,
        reason,
        details
      })
    });

    const data = await response.json();
    if (data.success) {
      alert('Report submitted successfully');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <select value={reason} onChange={(e) => setReason(e.target.value)} required>
        <option value="">Select reason</option>
        <option value="spam">Spam</option>
        <option value="harassment">Harassment</option>
        <option value="inappropriate">Inappropriate Content</option>
        <option value="fake">Fake or Fraudulent</option>
        <option value="scam">Scam</option>
        <option value="violence">Violence or Threats</option>
        <option value="hate_speech">Hate Speech</option>
        <option value="other">Other</option>
      </select>

      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="Provide additional details..."
        required
      />

      <button type="submit">Submit Report</button>
    </form>
  );
};
```

---

## Testing Commands

### Test File Upload
```bash
curl -X POST "http://localhost:4000/api/v1/global/upload/image" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-image.jpg"
```

### Test Media Library
```bash
curl -X GET "http://localhost:4000/api/v1/global/media" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Geocoding
```bash
curl -X POST "http://localhost:4000/api/v1/global/location/geocode" \
  -H "Content-Type: application/json" \
  -d '{"address": "Cairo, Egypt"}'
```

### Test Block User
```bash
curl -X POST "http://localhost:4000/api/v1/global/block/USER_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Test block"}'
```

### Test Report Content
```bash
curl -X POST "http://localhost:4000/api/v1/global/report" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "user",
    "reportedEntityId": "USER_ID",
    "reportedEntityModel": "User",
    "reason": "spam",
    "details": "Test report"
  }'
```

---

## Notes

- File uploads use multipart/form-data encoding
- Maximum file size is 100MB per upload
- Uploaded files are stored locally (in production, use Cloudinary/S3)
- Geocoding is mocked (in production, integrate Google Maps API or Mapbox)
- Blocking prevents all interactions between users
- Reports are prioritized based on severity (violence, hate_speech = high priority)
- Analytics data is currently mocked (implement actual tracking in production)
- All text content supports Arabic translation
- Media files are soft-deleted (not permanently removed)

---

## Related APIs

- [Messaging API](./MESSAGING-API-DOCUMENTATION.md)
- [Search API](./SEARCH-API-DOCUMENTATION.md)
- [Notification API](./NOTIFICATION-API-DOCUMENTATION.md)
- [Review API](./REVIEW-API-DOCUMENTATION.md)

---

## Support

For issues or questions, please contact the development team.

**Last Updated:** January 2025
**API Version:** v1
