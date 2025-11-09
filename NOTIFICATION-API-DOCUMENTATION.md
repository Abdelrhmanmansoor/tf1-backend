# Notification API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Base URL](#base-url)
3. [Authentication](#authentication)
4. [Notification Types](#notification-types)
5. [REST API Endpoints](#rest-api-endpoints)
6. [Real-Time Events (Socket.io)](#real-time-events-socketio)
7. [Notification Preferences](#notification-preferences)
8. [Request Examples](#request-examples)
9. [Response Examples](#response-examples)
10. [Error Handling](#error-handling)

---

## Overview

The Notification System provides comprehensive real-time and multi-channel notifications for all users on the SportX Platform. It supports:

- **Real-time in-app notifications** via Socket.io
- **Multi-channel delivery** (in-app, email, push, SMS)
- **User preferences** with granular control
- **Quiet hours** to prevent notifications during sleep
- **Priority-based** notification delivery
- **Notification grouping** for better organization
- **Automatic expiry** to keep the system clean
- **Language support** (English and Arabic)

---

## Base URL

```
http://localhost:4000/api/v1/notifications
```

---

## Authentication

All notification endpoints require authentication. Include your JWT token in the Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

---

## Notification Types

The system supports different notification types for each user role:

### For Players
| Type | Description | Priority |
|------|-------------|----------|
| `training_offer` | New training offer from coach | normal |
| `training_accepted` | Coach accepted your training request | high |
| `training_rejected` | Coach rejected your training request | normal |
| `session_reminder` | Session starting soon (1 hour before) | high |
| `session_cancelled` | Coach cancelled session | high |
| `session_completed` | Session completed - please rate coach | normal |
| `job_match` | New job matches your profile | normal |
| `club_accepted` | Club accepted your membership | high |
| `club_rejected` | Club rejected your membership | normal |
| `message_received` | New message from coach/club | normal |
| `review_received` | Coach reviewed your progress | normal |

### For Coaches
| Type | Description | Priority |
|------|-------------|----------|
| `training_request` | New training request from player | high |
| `session_booked` | Player booked a session | high |
| `session_cancelled` | Player cancelled session | normal |
| `payment_received` | Payment received for session | normal |
| `review_received` | Player left a review | normal |
| `club_invitation` | Club invited you to apply | normal |
| `message_received` | New message from player/club | normal |

### For Specialists
| Type | Description | Priority |
|------|-------------|----------|
| `consultation_request` | New consultation request | high |
| `session_booked` | Client booked session | high |
| `session_cancelled` | Client cancelled session | normal |
| `payment_received` | Payment received | normal |
| `review_received` | Client left review | normal |
| `club_invitation` | Club offered you position | normal |
| `message_received` | New message | normal |

### For Clubs
| Type | Description | Priority |
|------|-------------|----------|
| `membership_request` | New membership request | high |
| `job_application` | New application for job posting | high |
| `payment_received` | Membership fee received | normal |
| `review_received` | Member left review | normal |
| `facility_booking` | New facility booking request | normal |
| `message_received` | New message | normal |

### Common Notifications (All Roles)
| Type | Description | Priority |
|------|-------------|----------|
| `new_follower` | Someone followed you | low |
| `profile_verified` | Your profile has been verified | high |
| `account_warning` | Account warning from admin | urgent |
| `system_update` | Platform system update | normal |

---

## REST API Endpoints

### 1. Get All Notifications

Retrieve all notifications for the authenticated user with pagination and filtering.

**Endpoint:** `GET /notifications`

**Query Parameters:**
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| page | number | Page number | 1 |
| limit | number | Results per page | 20 |
| unreadOnly | boolean | Show only unread notifications | false |
| priority | string | Filter by priority (low, normal, high, urgent) | - |
| type | string | Filter by notification type | - |

**Example Request:**
```bash
curl -X GET "http://localhost:4000/api/v1/notifications?page=1&limit=10&unreadOnly=false" \
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
      "_id": "notif123",
      "type": "training_request",
      "title": "New Training Request",
      "message": "Ahmed Mohamed has requested a training session",
      "relatedTo": {
        "entityType": "training_request",
        "entityId": "req456"
      },
      "actionUrl": "/training-requests/req456",
      "isRead": false,
      "priority": "high",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### 2. Get Unread Notifications

Retrieve only unread notifications.

**Endpoint:** `GET /notifications/unread`

**Query Parameters:**
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| page | number | Page number | 1 |
| limit | number | Results per page | 20 |

**Example Request:**
```bash
curl -X GET "http://localhost:4000/api/v1/notifications/unread?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 3. Get Unread Count

Get the count of unread notifications (useful for badge display).

**Endpoint:** `GET /notifications/unread/count`

**Example Request:**
```bash
curl -X GET "http://localhost:4000/api/v1/notifications/unread/count" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "count": 5
}
```

---

### 4. Get Grouped Notifications

Get notifications grouped by a specific key (e.g., all notifications for a specific month).

**Endpoint:** `GET /notifications/group/:groupKey`

**Example Request:**
```bash
curl -X GET "http://localhost:4000/api/v1/notifications/group/training_requests_2025-01" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 5. Mark Notification as Read

Mark a single notification as read.

**Endpoint:** `PUT /notifications/:id/read`

**Example Request:**
```bash
curl -X PUT "http://localhost:4000/api/v1/notifications/notif123/read" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "_id": "notif123",
    "isRead": true,
    "readAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### 6. Mark All as Read

Mark all notifications as read for the authenticated user.

**Endpoint:** `PUT /notifications/read-all`

**Example Request:**
```bash
curl -X PUT "http://localhost:4000/api/v1/notifications/read-all" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "modifiedCount": 15
}
```

---

### 7. Mark Multiple as Read

Mark specific notifications as read.

**Endpoint:** `PUT /notifications/read-multiple`

**Request Body:**
```json
{
  "notificationIds": ["notif123", "notif456", "notif789"]
}
```

**Example Request:**
```bash
curl -X PUT "http://localhost:4000/api/v1/notifications/read-multiple" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notificationIds": ["notif123", "notif456", "notif789"]
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Notifications marked as read",
  "modifiedCount": 3
}
```

---

### 8. Delete Notification

Delete a single notification.

**Endpoint:** `DELETE /notifications/:id`

**Example Request:**
```bash
curl -X DELETE "http://localhost:4000/api/v1/notifications/notif123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

---

### 9. Clear All Notifications

Delete all notifications for the authenticated user.

**Endpoint:** `DELETE /notifications/clear-all`

**Example Request:**
```bash
curl -X DELETE "http://localhost:4000/api/v1/notifications/clear-all" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "All notifications cleared",
  "deletedCount": 45
}
```

---

## Notification Preferences

### 1. Get Notification Settings

Retrieve user's notification preferences.

**Endpoint:** `GET /notifications/settings`

**Example Request:**
```bash
curl -X GET "http://localhost:4000/api/v1/notifications/settings" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "pref123",
    "userId": "user456",
    "preferences": {
      "email": {
        "enabled": true,
        "frequency": "instant"
      },
      "push": {
        "enabled": true
      },
      "sms": {
        "enabled": false
      },
      "trainingRequests": {
        "inApp": true,
        "email": true,
        "push": true
      },
      "messages": {
        "inApp": true,
        "email": false,
        "push": true
      },
      "sessionReminders": {
        "inApp": true,
        "email": false,
        "push": true
      }
    },
    "quietHours": {
      "enabled": true,
      "start": "22:00",
      "end": "08:00",
      "timezone": "Africa/Cairo"
    }
  }
}
```

---

### 2. Update Notification Settings

Update notification preferences.

**Endpoint:** `PUT /notifications/settings`

**Request Body:**
```json
{
  "preferences": {
    "email": {
      "enabled": true,
      "frequency": "daily_digest"
    },
    "trainingRequests": {
      "inApp": true,
      "email": true,
      "push": false
    }
  },
  "quietHours": {
    "enabled": true,
    "start": "23:00",
    "end": "07:00"
  }
}
```

**Example Request:**
```bash
curl -X PUT "http://localhost:4000/api/v1/notifications/settings" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "preferences": {
      "email": {
        "frequency": "daily_digest"
      }
    },
    "quietHours": {
      "enabled": true,
      "start": "23:00",
      "end": "07:00"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Notification settings updated successfully",
  "data": {
    "_id": "pref123",
    "preferences": {...},
    "quietHours": {...}
  }
}
```

---

### 3. Toggle All Notifications

Enable or disable all notifications at once.

**Endpoint:** `PUT /notifications/settings/toggle-all`

**Request Body:**
```json
{
  "enabled": false
}
```

**Example Request:**
```bash
curl -X PUT "http://localhost:4000/api/v1/notifications/settings/toggle-all" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": false
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "All notifications disabled",
  "data": {
    "_id": "pref123",
    "preferences": {
      "email": { "enabled": false },
      "push": { "enabled": false },
      "sms": { "enabled": false }
    }
  }
}
```

---

## Real-Time Events (Socket.io)

The notification system uses Socket.io for real-time delivery of notifications.

### Connection Setup

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:4000', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to notification service');
});

socket.on('authenticated', () => {
  console.log('Socket authenticated successfully');
});

socket.on('disconnect', () => {
  console.log('Disconnected from notification service');
});
```

### Listening for New Notifications

```javascript
// Listen for new notifications
socket.on('new_notification', (notification) => {
  console.log('New notification received:', notification);

  // Update UI - show notification badge
  updateNotificationBadge();

  // Show toast/banner
  showNotificationToast({
    title: notification.title,
    message: notification.message,
    type: notification.type,
    priority: notification.priority
  });

  // Play notification sound (if enabled)
  if (notification.priority === 'high' || notification.priority === 'urgent') {
    playNotificationSound();
  }
});
```

### React Integration Example

```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');

    // Connect to Socket.io
    const newSocket = io('http://localhost:4000', {
      auth: { token }
    });

    // Listen for new notifications
    newSocket.on('new_notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show notification
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/logo.png'
        });
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      socket
    }}>
      {children}
    </NotificationContext.Provider>
  );
}
```

---

## Request Examples

### Example 1: Get Recent Notifications

```bash
curl -X GET "http://localhost:4000/api/v1/notifications?page=1&limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 2: Get High Priority Notifications

```bash
curl -X GET "http://localhost:4000/api/v1/notifications?priority=high&unreadOnly=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 3: Get Training Request Notifications

```bash
curl -X GET "http://localhost:4000/api/v1/notifications?type=training_request" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 4: Enable Quiet Hours

```bash
curl -X PUT "http://localhost:4000/api/v1/notifications/settings" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quietHours": {
      "enabled": true,
      "start": "22:00",
      "end": "08:00",
      "timezone": "Africa/Cairo"
    }
  }'
```

### Example 5: Disable Email Notifications

```bash
curl -X PUT "http://localhost:4000/api/v1/notifications/settings" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "preferences": {
      "email": {
        "enabled": false
      }
    }
  }'
```

---

## Response Examples

### Success Response (Get Notifications)

```json
{
  "success": true,
  "count": 5,
  "total": 25,
  "page": 1,
  "pages": 5,
  "hasMore": true,
  "data": [
    {
      "_id": "notif001",
      "type": "training_request",
      "title": "New Training Request",
      "message": "Ahmed Mohamed has requested a training session",
      "relatedTo": {
        "entityType": "training_request",
        "entityId": "req123"
      },
      "actionUrl": "/training-requests/req123",
      "isRead": false,
      "readAt": null,
      "priority": "high",
      "metadata": {
        "playerName": "Ahmed Mohamed",
        "sport": "Football"
      },
      "createdAt": "2024-01-15T10:00:00Z"
    },
    {
      "_id": "notif002",
      "type": "session_reminder",
      "title": "Session Reminder",
      "message": "You have a training session in 1 hour with Sarah Ali",
      "relatedTo": {
        "entityType": "training_session",
        "entityId": "session456"
      },
      "actionUrl": "/sessions/session456",
      "isRead": true,
      "readAt": "2024-01-15T09:30:00Z",
      "priority": "high",
      "metadata": {
        "sessionTime": "11:00 AM",
        "location": "Cairo Sports Academy"
      },
      "createdAt": "2024-01-15T09:00:00Z"
    }
  ]
}
```

---

### Success Response (Unread Count)

```json
{
  "success": true,
  "count": 12
}
```

---

### Success Response (Mark as Read)

```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "_id": "notif123",
    "isRead": true,
    "readAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## Error Handling

### Common Error Responses

#### 400 Bad Request - Missing Required Field
```json
{
  "success": false,
  "message": "Please provide an array of notification IDs"
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

#### 404 Not Found - Notification Not Found
```json
{
  "success": false,
  "message": "Notification not found"
}
```

#### 500 Server Error
```json
{
  "success": false,
  "message": "Error fetching notifications",
  "error": "Detailed error message"
}
```

---

## Features Summary

### Notification Delivery
- ✅ Real-time in-app notifications via Socket.io
- ✅ Multi-channel support (in-app, email, push, SMS)
- ✅ Priority-based delivery (low, normal, high, urgent)
- ✅ Automatic expiry after 30 days
- ✅ Language support (English and Arabic)

### User Control
- ✅ Granular notification preferences
- ✅ Quiet hours configuration
- ✅ Channel-specific settings (email, push, SMS)
- ✅ Notification type preferences
- ✅ Enable/disable all notifications toggle

### Organization
- ✅ Notification grouping by key
- ✅ Filtering by type and priority
- ✅ Pagination support
- ✅ Unread count tracking
- ✅ Bulk mark as read

### Smart Features
- ✅ Preference-based delivery (respects quiet hours)
- ✅ Automatic notification type to preference mapping
- ✅ Delivery status tracking
- ✅ Read/unread tracking
- ✅ Action URLs for deep linking

---

## Best Practices

### For Frontend Integration

1. **Initialize Socket Connection Once**
```javascript
// Create socket connection when user logs in
const socket = io('http://localhost:4000', {
  auth: { token: authToken }
});

// Store in context/redux for app-wide access
```

2. **Request Browser Notification Permission**
```javascript
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}
```

3. **Show Unread Badge**
```javascript
// Fetch unread count on app load
const fetchUnreadCount = async () => {
  const response = await fetch('/api/v1/notifications/unread/count', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const { count } = await response.json();
  setBadgeCount(count);
};
```

4. **Mark as Read When Viewed**
```javascript
// When user clicks notification or views details
const markAsRead = async (notificationId) => {
  await fetch(`/api/v1/notifications/${notificationId}/read`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  // Update UI
  setUnreadCount(prev => prev - 1);
};
```

5. **Implement Notification Panel**
```javascript
const NotificationPanel = () => {
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);

  const loadMore = async () => {
    const response = await fetch(
      `/api/v1/notifications?page=${page + 1}&limit=10`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const data = await response.json();
    setNotifications([...notifications, ...data.data]);
    setPage(page + 1);
  };

  return (
    <div className="notification-panel">
      {notifications.map(notif => (
        <NotificationItem key={notif._id} notification={notif} />
      ))}
      {hasMore && <button onClick={loadMore}>Load More</button>}
    </div>
  );
};
```

---

## Testing Commands

### Test Get Notifications
```bash
curl -X GET "http://localhost:4000/api/v1/notifications" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Get Unread Count
```bash
curl -X GET "http://localhost:4000/api/v1/notifications/unread/count" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Mark as Read
```bash
curl -X PUT "http://localhost:4000/api/v1/notifications/NOTIFICATION_ID/read" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Get Settings
```bash
curl -X GET "http://localhost:4000/api/v1/notifications/settings" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Update Settings
```bash
curl -X PUT "http://localhost:4000/api/v1/notifications/settings" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "preferences": {
      "email": { "enabled": false }
    }
  }'
```

---

## Notes

- Notifications automatically expire after 30 days
- Quiet hours prevent email, push, and SMS notifications (in-app still works)
- Socket.io authentication uses JWT tokens from HTTP API
- Language preference is taken from user profile
- Notification delivery respects user preferences and quiet hours
- High and urgent priority notifications may bypass some quiet hour settings
- Email frequency can be set to instant, daily_digest, or weekly_digest
- Notification grouping helps organize related notifications together

---

## Related APIs

- [Authentication API](./AUTH-API-DOCUMENTATION.md)
- [Messaging API](./MESSAGING-API-DOCUMENTATION.md)
- [Search API](./SEARCH-API-DOCUMENTATION.md)

---

## Support

For issues or questions, please contact the development team.

**Last Updated:** January 2025
**API Version:** v1
