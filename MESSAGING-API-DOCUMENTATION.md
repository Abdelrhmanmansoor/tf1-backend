# Real-Time Messaging API Documentation

## Overview

The SportX Platform includes a complete real-time messaging system similar to WhatsApp, featuring direct conversations, group chats, message reactions, typing indicators, read receipts, and online status tracking.

**Base URL:** `http://localhost:4000/api/v1/messages`

**Real-Time Connection:** Socket.io on the same port as HTTP server

---

## Table of Contents

1. [Authentication](#authentication)
2. [Conversation Management](#conversation-management)
3. [Message Operations](#message-operations)
4. [Real-Time Events (Socket.io)](#real-time-events-socketio)
5. [Models Reference](#models-reference)
6. [Usage Examples](#usage-examples)
7. [Client Implementation Guide](#client-implementation-guide)

---

## Authentication

All endpoints require JWT authentication via the `Authorization` header:

```bash
Authorization: Bearer <your_jwt_token>
```

Socket.io connections also require authentication via token in the handshake.

---

## Conversation Management

### 1. Get All Conversations

**GET** `/conversations`

Get all conversations for the authenticated user.

**Query Parameters:**
- `archived` - Filter archived conversations (true/false)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20)

**Example Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:4000/api/v1/messages/conversations?page=1&limit=20"
```

**Response (200):**
```json
{
  "success": true,
  "conversations": [
    {
      "_id": "conv123",
      "type": "direct",
      "participants": [
        {
          "userId": {
            "_id": "user123",
            "firstName": "Ahmed",
            "lastName": "Hassan",
            "profileImage": "https://...",
            "role": "coach"
          },
          "role": "coach",
          "joinedAt": "2025-10-01T10:00:00Z",
          "isActive": true,
          "lastReadAt": "2025-10-04T14:00:00Z",
          "isMuted": false
        },
        {
          "userId": {
            "_id": "user456",
            "firstName": "Mohamed",
            "lastName": "Ali",
            "profileImage": "https://...",
            "role": "player"
          },
          "role": "player",
          "joinedAt": "2025-10-01T10:00:00Z",
          "isActive": true,
          "lastReadAt": "2025-10-04T13:00:00Z",
          "isMuted": false
        }
      ],
      "lastMessage": {
        "content": "See you at training tomorrow!",
        "senderId": "user123",
        "sentAt": "2025-10-04T14:30:00Z",
        "messageType": "text"
      },
      "unreadCount": 2,
      "isArchived": false,
      "createdAt": "2025-10-01T10:00:00Z",
      "updatedAt": "2025-10-04T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pages": 3,
    "total": 45
  }
}
```

---

### 2. Get Conversation by ID

**GET** `/conversations/:id`

Get detailed conversation information.

**Response (200):**
```json
{
  "success": true,
  "conversation": {
    "_id": "conv123",
    "type": "group",
    "name": "U18 Football Team",
    "nameAr": "فريق كرة القدم تحت 18",
    "avatar": "https://...",
    "participants": [...],
    "createdBy": "user123",
    "admins": ["user123", "user789"],
    "lastMessage": {...},
    "unreadCount": 5,
    "relatedTo": {
      "entityType": "club",
      "entityId": "club123"
    }
  }
}
```

---

### 3. Create Conversation

**POST** `/conversations`

Create a new conversation (direct or group).

**Request Body (Direct Conversation):**
```json
{
  "type": "direct",
  "participantIds": ["user456"],
  "participantRoles": ["coach"]
}
```

**Request Body (Group Conversation):**
```json
{
  "type": "group",
  "name": "Team Training Group",
  "nameAr": "مجموعة التدريب الجماعي",
  "participantIds": ["user456", "user789", "user101"],
  "participantRoles": ["coach", "player", "player"]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Conversation ready",
  "conversation": {
    "_id": "conv123",
    "type": "direct",
    "participants": [...],
    "createdAt": "2025-10-04T15:00:00Z"
  }
}
```

**Notes:**
- For direct conversations, if one already exists between the two users, it returns the existing conversation
- For group conversations, the creator becomes admin automatically
- System message is created when group is formed

---

### 4. Update Conversation

**PUT** `/conversations/:id`

Update group conversation details (name, avatar).

**Access:** Admin only

**Request Body:**
```json
{
  "name": "Updated Team Name",
  "nameAr": "اسم الفريق المحدث",
  "avatar": "https://new-avatar-url.jpg"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Conversation updated",
  "conversation": {...}
}
```

---

### 5. Delete/Leave Conversation

**DELETE** `/conversations/:id`

Delete a direct conversation or leave a group.

**Response (200):**
```json
{
  "success": true,
  "message": "Left conversation successfully"
}
```

**Notes:**
- Direct conversations are soft deleted
- Group conversations remove the user from participants
- System message is created when user leaves group

---

### 6. Mute/Unmute Conversation

**PUT** `/conversations/:id/mute`

Toggle mute status for a conversation.

**Response (200):**
```json
{
  "success": true,
  "message": "Conversation muted",
  "isMuted": true
}
```

---

### 7. Archive Conversation

**PUT** `/conversations/:id/archive`

Archive a conversation.

**Response (200):**
```json
{
  "success": true,
  "message": "Conversation archived"
}
```

---

### 8. Unarchive Conversation

**PUT** `/conversations/:id/unarchive`

Unarchive a conversation.

**Response (200):**
```json
{
  "success": true,
  "message": "Conversation unarchived"
}
```

---

### 9. Add Participant to Group

**POST** `/conversations/:id/participants`

Add a participant to a group conversation.

**Access:** Admin only

**Request Body:**
```json
{
  "userId": "user999",
  "role": "player"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Participant added",
  "conversation": {...}
}
```

**Real-Time:** All participants receive `participant_added` event via Socket.io

---

### 10. Remove Participant from Group

**DELETE** `/conversations/:id/participants/:userId`

Remove a participant from a group conversation.

**Access:** Admin only (or user can remove themselves)

**Response (200):**
```json
{
  "success": true,
  "message": "Participant removed"
}
```

**Real-Time:** All participants receive `participant_removed` event via Socket.io

---

## Message Operations

### 11. Get Messages in Conversation

**GET** `/conversations/:id/messages`

Get messages in a conversation with pagination.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Messages per page (default: 50)
- `before` - Get messages before this timestamp (for infinite scroll)

**Example Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:4000/api/v1/messages/conversations/conv123/messages?page=1&limit=50"
```

**Response (200):**
```json
{
  "success": true,
  "messages": [
    {
      "_id": "msg123",
      "conversationId": "conv123",
      "senderId": {
        "_id": "user123",
        "firstName": "Ahmed",
        "lastName": "Hassan",
        "profileImage": "https://..."
      },
      "senderRole": "coach",
      "messageType": "text",
      "content": "Great training session today!",
      "contentAr": "جلسة تدريب رائعة اليوم!",
      "readBy": [
        {
          "userId": "user456",
          "readAt": "2025-10-04T14:35:00Z"
        }
      ],
      "reactions": [
        {
          "userId": "user456",
          "emoji": "👍",
          "createdAt": "2025-10-04T14:36:00Z"
        }
      ],
      "isEdited": false,
      "isDeleted": false,
      "sentAt": "2025-10-04T14:30:00Z",
      "createdAt": "2025-10-04T14:30:00Z"
    }
  ],
  "total": 234,
  "page": 1,
  "hasMore": true
}
```

---

### 12. Send Message

**POST** `/conversations/:id/messages`

Send a message in a conversation.

**Request Body (Text Message):**
```json
{
  "messageType": "text",
  "content": "Hello, how are you?",
  "contentAr": "مرحبا، كيف حالك؟"
}
```

**Request Body (Message with Reply):**
```json
{
  "messageType": "text",
  "content": "Yes, I agree!",
  "replyTo": "msg123"
}
```

**Request Body (Message with Attachments):**
```json
{
  "messageType": "image",
  "content": "Check out this photo!",
  "attachments": [
    {
      "fileType": "image",
      "fileName": "training_photo.jpg",
      "fileUrl": "https://cloudinary.com/...",
      "fileSize": 245678,
      "mimeType": "image/jpeg"
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Message sent",
  "data": {
    "_id": "msg456",
    "conversationId": "conv123",
    "senderId": {...},
    "content": "Hello, how are you?",
    "sentAt": "2025-10-04T15:00:00Z"
  }
}
```

**Real-Time:** All participants receive `new_message` event via Socket.io instantly

**Message Types:**
- `text` - Regular text message
- `image` - Image attachment
- `video` - Video attachment
- `file` - Document attachment
- `audio` - Voice message
- `system` - System-generated message (auto-created)

---

### 13. Edit Message

**PUT** `/messages/:messageId`

Edit a text message.

**Access:** Sender only

**Request Body:**
```json
{
  "content": "Updated message content"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Message updated",
  "data": {
    "_id": "msg123",
    "content": "Updated message content",
    "isEdited": true,
    "editHistory": [
      {
        "content": "Original message",
        "editedAt": "2025-10-04T15:05:00Z"
      }
    ]
  }
}
```

**Real-Time:** All participants receive `message_edited` event

**Notes:**
- Only text messages can be edited
- Edit history is preserved
- Message shows "edited" indicator

---

### 14. Delete Message

**DELETE** `/messages/:messageId`

Delete a message (soft delete).

**Access:** Sender only

**Response (200):**
```json
{
  "success": true,
  "message": "Message deleted"
}
```

**Real-Time:** All participants receive `message_deleted` event

**Notes:**
- Messages are soft deleted (marked as deleted, not removed from DB)
- Content is replaced with "This message was deleted"
- Attachments are hidden

---

### 15. Add Reaction to Message

**POST** `/messages/:messageId/react`

Add an emoji reaction to a message.

**Request Body:**
```json
{
  "emoji": "👍"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Reaction added",
  "reactions": [
    {
      "userId": "user123",
      "emoji": "👍",
      "createdAt": "2025-10-04T15:10:00Z"
    },
    {
      "userId": "user456",
      "emoji": "❤️",
      "createdAt": "2025-10-04T15:11:00Z"
    }
  ]
}
```

**Real-Time:** All participants receive `message_reaction` event

**Notes:**
- User can only have one reaction per message
- Changing emoji updates the existing reaction
- Popular emojis: 👍 ❤️ 😂 😮 😢 🙏

---

### 16. Remove Reaction from Message

**DELETE** `/messages/:messageId/react`

Remove your reaction from a message.

**Response (200):**
```json
{
  "success": true,
  "message": "Reaction removed",
  "reactions": [...]
}
```

**Real-Time:** All participants receive `message_reaction_removed` event

---

### 17. Mark Messages as Read

**PUT** `/conversations/:id/read`

Mark all messages in a conversation as read.

**Response (200):**
```json
{
  "success": true,
  "message": "Messages marked as read"
}
```

**Real-Time:** Sender receives `messages_read` event with your user ID

**Notes:**
- Updates conversation's unread count to 0
- Updates lastReadAt timestamp
- Triggers read receipt for all unread messages

---

### 18. Get Total Unread Count

**GET** `/unread-count`

Get total unread messages across all conversations.

**Response (200):**
```json
{
  "success": true,
  "unreadCount": 15
}
```

**Use Case:** Display badge on messaging icon in app navigation

---

## Real-Time Events (Socket.io)

### Connection Setup

**Client-Side Example (JavaScript):**
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:4000', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});

socket.on('connect', () => {
  console.log('✅ Connected to Socket.io');
});

socket.on('authenticated', () => {
  console.log('✅ Authenticated successfully');
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});
```

---

### Events You Can Emit (Client → Server)

#### 1. Typing Indicators

**Start Typing:**
```javascript
socket.emit('typing_start', {
  conversationId: 'conv123'
});
```

**Stop Typing:**
```javascript
socket.emit('typing_stop', {
  conversationId: 'conv123'
});
```

---

#### 2. Join Conversation Room

```javascript
socket.emit('join_conversation', {
  conversationId: 'conv123'
});
```

**Leave Conversation Room:**
```javascript
socket.emit('leave_conversation', {
  conversationId: 'conv123'
});
```

---

#### 3. Check Online Status

```javascript
socket.emit('check_online_status', {
  userIds: ['user123', 'user456', 'user789']
});

socket.on('online_statuses', (statuses) => {
  console.log(statuses);
  // { user123: true, user456: false, user789: true }
});
```

---

#### 4. Voice/Video Call Signaling

**Initiate Call:**
```javascript
socket.emit('call_user', {
  conversationId: 'conv123',
  targetUserId: 'user456',
  signalData: peerConnectionSignal,
  callType: 'video' // or 'voice'
});
```

**Answer Call:**
```javascript
socket.emit('answer_call', {
  to: 'user123',
  signalData: answerSignal
});
```

**Reject Call:**
```javascript
socket.emit('reject_call', {
  to: 'user123'
});
```

**End Call:**
```javascript
socket.emit('end_call', {
  to: 'user456'
});
```

**ICE Candidate Exchange:**
```javascript
socket.emit('ice_candidate', {
  to: 'user456',
  candidate: iceCandidate
});
```

---

### Events You Receive (Server → Client)

#### 1. User Presence

**User Came Online:**
```javascript
socket.on('user_online', (data) => {
  console.log(`${data.firstName} is now online`);
  // data: { userId, firstName, lastName, profileImage }
});
```

**User Went Offline:**
```javascript
socket.on('user_offline', (data) => {
  console.log(`User ${data.userId} is now offline`);
  // data: { userId, lastSeen }
});
```

---

#### 2. New Messages

**New Message Received:**
```javascript
socket.on('new_message', (data) => {
  console.log('New message:', data.message);
  // Add message to conversation UI
  // Play notification sound
  // Update conversation list

  // data: { conversationId, message }
});
```

---

#### 3. Message Updates

**Message Edited:**
```javascript
socket.on('message_edited', (data) => {
  // data: { conversationId, messageId, newContent, isEdited }
  // Update message in UI
});
```

**Message Deleted:**
```javascript
socket.on('message_deleted', (data) => {
  // data: { conversationId, messageId }
  // Remove or hide message in UI
});
```

**Message Reaction Added:**
```javascript
socket.on('message_reaction', (data) => {
  // data: { conversationId, messageId, userId, emoji, reactions }
  // Update reactions in UI
});
```

**Message Reaction Removed:**
```javascript
socket.on('message_reaction_removed', (data) => {
  // data: { conversationId, messageId, userId, reactions }
});
```

---

#### 4. Read Receipts

**Messages Read:**
```javascript
socket.on('messages_read', (data) => {
  // data: { conversationId, readBy, readAt }
  // Show double checkmarks (✓✓) in blue
});
```

---

#### 5. Typing Indicators

**User Started Typing:**
```javascript
socket.on('user_typing', (data) => {
  // data: { conversationId, userId, firstName }
  // Show "Ahmed is typing..." indicator
});
```

**User Stopped Typing:**
```javascript
socket.on('user_stopped_typing', (data) => {
  // data: { conversationId, userId }
  // Hide typing indicator
});
```

---

#### 6. Conversation Updates

**New Conversation Created:**
```javascript
socket.on('new_conversation', (conversation) => {
  // Add conversation to list
  // Show notification
});
```

**Conversation Updated:**
```javascript
socket.on('conversation_updated', (conversation) => {
  // Update conversation name/avatar in UI
});
```

**Participant Added to Group:**
```javascript
socket.on('participant_added', (data) => {
  // data: { conversationId, participant }
  // Show "Ahmed joined the group"
});
```

**Participant Removed from Group:**
```javascript
socket.on('participant_removed', (data) => {
  // data: { conversationId, userId }
  // Show "Mohamed left the group"
});
```

**Removed from Group:**
```javascript
socket.on('removed_from_group', (data) => {
  // data: { conversationId }
  // Remove conversation from your list
  // Show notification
});
```

---

#### 7. Call Events

**Incoming Call:**
```javascript
socket.on('incoming_call', (data) => {
  // data: { conversationId, from, fromUser, signalData, callType }
  // Show incoming call UI
  // Ring tone
});
```

**Call Answered:**
```javascript
socket.on('call_answered', (data) => {
  // data: { from, signalData }
  // Establish WebRTC connection
});
```

**Call Rejected:**
```javascript
socket.on('call_rejected', (data) => {
  // data: { from }
  // Show "Call declined" message
});
```

**Call Ended:**
```javascript
socket.on('call_ended', (data) => {
  // data: { from }
  // End call, show duration
});
```

**ICE Candidate:**
```javascript
socket.on('ice_candidate', (data) => {
  // data: { from, candidate }
  // Add ICE candidate to peer connection
});
```

---

## Models Reference

### Conversation Model

```javascript
{
  _id: ObjectId,
  type: "direct" | "group",

  participants: [
    {
      userId: ObjectId (ref: User),
      role: "player" | "coach" | "club" | "specialist",
      joinedAt: Date,
      isActive: Boolean,
      lastReadAt: Date,
      isMuted: Boolean
    }
  ],

  // Group chat specific
  name: String,
  nameAr: String,
  avatar: String,
  createdBy: ObjectId (ref: User),
  admins: [ObjectId],

  lastMessage: {
    content: String,
    senderId: ObjectId,
    sentAt: Date,
    messageType: String
  },

  unreadCounts: Map<userId, count>,

  relatedTo: {
    entityType: "training_session" | "consultation" | "job" | "club",
    entityId: ObjectId
  },

  isArchived: Boolean,
  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

### Message Model

```javascript
{
  _id: ObjectId,
  conversationId: ObjectId (ref: Conversation),

  senderId: ObjectId (ref: User),
  senderRole: "player" | "coach" | "club" | "specialist",

  messageType: "text" | "image" | "video" | "file" | "audio" | "system",

  content: String,
  contentAr: String,

  attachments: [
    {
      fileType: "image" | "video" | "audio" | "document",
      fileName: String,
      fileUrl: String,
      fileSize: Number,
      mimeType: String,
      thumbnail: String
    }
  ],

  readBy: [
    {
      userId: ObjectId,
      readAt: Date
    }
  ],

  reactions: [
    {
      userId: ObjectId,
      emoji: String,
      createdAt: Date
    }
  ],

  replyTo: ObjectId (ref: Message),

  isEdited: Boolean,
  editHistory: [
    {
      content: String,
      editedAt: Date
    }
  ],

  isDeleted: Boolean,
  deletedAt: Date,
  deletedBy: ObjectId,

  systemMessageType: "user_joined" | "user_left" | "session_booked" | "payment_received",

  sentAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Usage Examples

### Example 1: Complete Chat Flow

```javascript
// 1. Connect to Socket.io
const socket = io('http://localhost:4000', {
  auth: { token: userToken }
});

// 2. Get conversations
const conversations = await fetch('/api/v1/messages/conversations', {
  headers: { 'Authorization': `Bearer ${userToken}` }
}).then(r => r.json());

// 3. Open a conversation
const conversationId = conversations.conversations[0]._id;

// Join the conversation room for real-time updates
socket.emit('join_conversation', { conversationId });

// 4. Get messages
const messages = await fetch(`/api/v1/messages/conversations/${conversationId}/messages`, {
  headers: { 'Authorization': `Bearer ${userToken}` }
}).then(r => r.json());

// 5. Listen for new messages
socket.on('new_message', (data) => {
  if (data.conversationId === conversationId) {
    appendMessageToUI(data.message);
  }
});

// 6. Send typing indicator
inputField.addEventListener('input', () => {
  socket.emit('typing_start', { conversationId });

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing_stop', { conversationId });
  }, 1000);
});

// 7. Send a message
async function sendMessage(content) {
  const response = await fetch(`/api/v1/messages/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messageType: 'text',
      content
    })
  });

  return response.json();
}

// 8. Mark as read when user views messages
await fetch(`/api/v1/messages/conversations/${conversationId}/read`, {
  method: 'PUT',
  headers: { 'Authorization': `Bearer ${userToken}` }
});
```

---

### Example 2: Create Group Chat

```javascript
// Create a group for team communication
const createTeamGroup = async () => {
  const response = await fetch('/api/v1/messages/conversations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'group',
      name: 'U18 Football Team',
      nameAr: 'فريق كرة القدم تحت 18',
      participantIds: ['player1', 'player2', 'coach1', 'specialist1'],
      participantRoles: ['player', 'player', 'coach', 'specialist']
    })
  });

  const { conversation } = await response.json();

  // Send first message
  await fetch(`/api/v1/messages/conversations/${conversation._id}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messageType: 'text',
      content: 'Welcome to the team chat! 🎉',
      contentAr: 'مرحبا بكم في دردشة الفريق! 🎉'
    })
  });
};
```

---

### Example 3: Message with Image Attachment

```javascript
// First, upload image to Cloudinary or your storage
const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/v1/upload/image', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${userToken}` },
    body: formData
  });

  return response.json();
};

// Then send message with attachment
const sendImageMessage = async (conversationId, file, caption) => {
  const { url, publicId } = await uploadImage(file);

  const response = await fetch(`/api/v1/messages/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messageType: 'image',
      content: caption,
      attachments: [
        {
          fileType: 'image',
          fileName: file.name,
          fileUrl: url,
          fileSize: file.size,
          mimeType: file.type
        }
      ]
    })
  });

  return response.json();
};
```

---

### Example 4: React to Message

```javascript
const reactToMessage = async (messageId, emoji) => {
  const response = await fetch(`/api/v1/messages/${messageId}/react`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ emoji })
  });

  return response.json();
};

// Usage
await reactToMessage('msg123', '👍');
await reactToMessage('msg456', '❤️');
```

---

## Client Implementation Guide

### React/React Native Example

```jsx
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const MessagingComponent = () => {
  const [socket, setSocket] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(null);

  useEffect(() => {
    // Connect to Socket.io
    const newSocket = io('http://localhost:4000', {
      auth: { token: localStorage.getItem('token') }
    });

    newSocket.on('connect', () => {
      console.log('Connected');
    });

    // Listen for new messages
    newSocket.on('new_message', (data) => {
      setMessages(prev => [...prev, data.message]);
      updateConversationsList(data.conversationId, data.message);
    });

    // Listen for typing indicators
    newSocket.on('user_typing', (data) => {
      setTyping(`${data.firstName} is typing...`);
    });

    newSocket.on('user_stopped_typing', () => {
      setTyping(null);
    });

    // Listen for read receipts
    newSocket.on('messages_read', (data) => {
      updateReadReceipts(data);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  const sendMessage = async (content) => {
    const response = await fetch(`/api/v1/messages/conversations/${currentConv}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messageType: 'text', content })
    });

    const data = await response.json();
    // Message will arrive via socket, no need to manually add
  };

  const handleTyping = () => {
    socket.emit('typing_start', { conversationId: currentConv });

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit('typing_stop', { conversationId: currentConv });
    }, 1000);
  };

  return (
    <div>
      {/* Your chat UI here */}
      <input onChange={handleTyping} onKeyDown={(e) => {
        if (e.key === 'Enter') sendMessage(e.target.value);
      }} />
      {typing && <div>{typing}</div>}
    </div>
  );
};
```

---

## Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Invalid conversation type"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "Only admins can add participants"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Conversation not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Error sending message",
  "error": "Detailed error message"
}
```

---

## Testing

### Using cURL

**Create Direct Conversation:**
```bash
curl -X POST http://localhost:4000/api/v1/messages/conversations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "direct",
    "participantIds": ["user456"],
    "participantRoles": ["coach"]
  }'
```

**Send Message:**
```bash
curl -X POST http://localhost:4000/api/v1/messages/conversations/CONV_ID/messages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageType": "text",
    "content": "Hello from API!"
  }'
```

### Using Socket.io Test Client

```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:4000', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

socket.on('connect', () => {
  console.log('✅ Connected!');

  // Test typing
  socket.emit('typing_start', { conversationId: 'conv123' });

  setTimeout(() => {
    socket.emit('typing_stop', { conversationId: 'conv123' });
  }, 2000);
});

socket.on('new_message', (data) => {
  console.log('📨 New message:', data);
});
```

---

## Performance Considerations

1. **Message Pagination:** Always use pagination when fetching messages to avoid loading thousands of messages at once
2. **Socket.io Rooms:** Users are automatically joined to their personal room (userId) and can join conversation rooms
3. **Online Status:** Online user tracking is maintained in-memory for fast lookups
4. **Read Receipts:** Read receipts are batched when marking multiple messages as read
5. **Typing Indicators:** Implement debouncing on client-side to avoid excessive socket emissions

---

## Security Features

✅ JWT authentication for both HTTP and Socket.io
✅ Users can only access conversations they're part of
✅ Admin-only operations for group management
✅ Message ownership verification for edit/delete
✅ Soft deletes preserve data integrity
✅ Encrypted attachments via secure cloud storage

---

## Future Enhancements

- [ ] Voice messages (audio recording)
- [ ] Video messages
- [ ] Message forwarding
- [ ] Message search within conversations
- [ ] Pinned messages
- [ ] Custom notification sounds
- [ ] Message scheduling
- [ ] Auto-delete messages (ephemeral)
- [ ] Broadcast lists
- [ ] Story/Status feature

---

**API Version:** v1
**Last Updated:** October 2025
**Status:** Production Ready ✅
**Real-Time:** Enabled via Socket.io 💬
