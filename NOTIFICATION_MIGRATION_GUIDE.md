# Notification Models Unification Guide

## Overview

The codebase currently has **two separate notification models**:

1. **Legacy Model**: `src/models/Notification.js`
   - Used by global platform features
   - Schema uses `userId`, `userRole`, basic structure
   - Limited feature set

2. **Modern Model**: `src/modules/notifications/models/Notification.js`
   - Used by job publisher module
   - Schema uses `recipientId`, `senderId`, richer metadata
   - Multi-channel support (email, SMS, push, in-app)
   - Better structured for modern features

## Problem

Having two notification models causes:
- ❌ Inconsistent notification storage
- ❌ Lost notifications when switching contexts
- ❌ Difficult to track notification history
- ❌ Code duplication and confusion
- ❌ Poor user experience

## Solution

**Unify on the Modern Model** as the single source of truth.

### Why Modern Model?

✅ More feature-rich (multi-channel support)
✅ Better structured for job publisher features
✅ Includes sender tracking
✅ Supports metadata and customization
✅ Designed for scalability

## Migration Steps

### Phase 1: Backup (30 minutes)

```bash
# Set to dry run mode first
export DRY_RUN=true

# Run migration script
node src/scripts/migrations/unifyNotificationModels.js
```

**Expected Output:**
- Backup JSON files created in `backups/` directory
- Legacy notifications count
- Modern notifications count
- No actual changes (dry run mode)

### Phase 2: Test Migration (1 hour)

```bash
# Run in dry run mode to preview changes
export DRY_RUN=true
node src/scripts/migrations/unifyNotificationModels.js

# Review the output
# - Check mapping of notification types
# - Verify data transformation
# - Review import update report
```

### Phase 3: Execute Migration (30 minutes)

```bash
# ⚠️ IMPORTANT: Database backup first!
# mongodump --db sportx-platform --out backups/db-$(date +%Y%m%d)

# Run live migration
export DRY_RUN=false
node src/scripts/migrations/unifyNotificationModels.js
```

**What Happens:**
1. Backs up both notification collections to JSON
2. Migrates legacy notifications to modern schema
3. Verifies data integrity
4. Generates import update report

### Phase 4: Update Imports (2 hours)

Find all files importing the legacy model:

```bash
# Search for legacy imports
grep -r "require.*models/Notification" src/ --exclude-dir=node_modules

# Or use ripgrep (faster)
rg "require.*models/Notification" src/
```

**Files to Update** (example):

#### Before:
```javascript
const Notification = require('../../models/Notification');
```

#### After:
```javascript
const Notification = require('../../modules/notifications/models/Notification');
```

**Common Files Needing Updates:**
- `src/modules/job-publisher/controllers/applicationController.js` ✅ (Already uses modern)
- `src/modules/job-publisher/controllers/jobPublisherController.js` ✅ (Already uses modern)
- `src/middleware/notificationHandler.js` (Needs verification)
- `src/modules/shared/services/notificationService.js` (If exists)
- Any other controllers/services using notifications

### Phase 5: Test (2 hours)

#### Unit Tests
```bash
npm test -- notification
```

#### Integration Tests
1. Create a job posting
   - Verify applicants receive notification
   - Check notification appears in modern collection

2. Update application status
   - Verify status change notification
   - Check notification channels (in-app, email, etc.)

3. Send message
   - Verify message notification
   - Check read/unread status

#### Manual Testing
1. Login as job publisher
2. Create a new job
3. Check notifications sent to applicants
4. Login as applicant
5. Verify notifications appear correctly
6. Test marking as read/unread

### Phase 6: Archive Legacy Model (15 minutes)

Once all tests pass:

```bash
# Create archive directory
mkdir -p src/models/archived

# Move legacy model to archive
mv src/models/Notification.js src/models/archived/Notification.legacy.js

# Add README to archived folder
cat > src/models/archived/README.md << 'EOF'
# Archived Models

This directory contains legacy models that have been replaced.

## Notification.legacy.js
- **Archived Date**: 2026-01-17
- **Reason**: Unified with modern notification model
- **Replacement**: src/modules/notifications/models/Notification.js
- **Migration Script**: src/scripts/migrations/unifyNotificationModels.js

DO NOT USE THESE MODELS IN NEW CODE.
EOF

# Commit changes
git add -A
git commit -m "chore: Archive legacy Notification model after unification"
```

## Schema Comparison

### Legacy Schema

```javascript
{
  userId: ObjectId,              // Recipient
  userRole: String,              // Recipient role
  type: String,                  // Limited types
  title: String,
  titleAr: String,
  message: String,
  messageAr: String,
  priority: String,
  relatedTo: {
    entityType: String,
    entityId: ObjectId
  },
  actionUrl: String,
  metadata: Object,
  read: Boolean,
  readAt: Date,
  delivered: Boolean,
  deliveredAt: Date
}
```

### Modern Schema (Unified)

```javascript
{
  recipientId: ObjectId,         // Recipient (replaces userId)
  senderId: ObjectId,            // NEW: Track who sent it
  type: String,                  // Extended types
  title: String,
  titleAr: String,
  message: String,
  messageAr: String,
  priority: String,              // normal, high, urgent
  relatedTo: {
    entityType: String,
    entityId: ObjectId
  },
  actionUrl: String,
  metadata: Object,
  channels: [String],            // NEW: ['in_app', 'email', 'sms', 'push']
  read: Boolean,
  readAt: Date,
  delivered: Boolean,
  deliveredAt: Date,

  // NEW: Email tracking
  emailSent: Boolean,
  emailSentAt: Date,
  emailError: String,

  // NEW: SMS tracking
  smsSent: Boolean,
  smsSentAt: Date,
  smsError: String,

  // NEW: Push tracking
  pushSent: Boolean,
  pushSentAt: Date,
  pushError: String
}
```

## Type Mapping

The migration script automatically maps legacy types to modern equivalents:

| Legacy Type | Modern Type | Notes |
|------------|-------------|-------|
| `training_offer` | `system_notification` | General system notification |
| `training_accepted` | `system_notification` | General system notification |
| `training_rejected` | `system_notification` | General system notification |
| `session_reminder` | `system_notification` | General system notification |
| `session_cancelled` | `system_notification` | General system notification |
| `session_completed` | `system_notification` | General system notification |
| `job_match` | `job_posted` | Job-related notification |
| `job_application` | `job_application` | Direct mapping |
| `application_status_change` | `application_status_change` | Direct mapping |
| `interview_scheduled` | `interview_scheduled` | Direct mapping |
| `club_accepted` | `system_notification` | General system notification |
| `club_rejected` | `system_notification` | General system notification |

## API Changes

No API changes required if using the static methods:

```javascript
// Both work the same way
await Notification.createNotification(userId, type, title, message, relatedTo, metadata, priority);
```

The method signature remains compatible.

## Rollback Plan

If issues arise after migration:

### Step 1: Stop Application
```bash
pm2 stop all
# or
docker-compose down
```

### Step 2: Restore from Backup
```bash
# Restore database
mongorestore --db sportx-platform backups/db-YYYYMMDD/sportx-platform

# Or restore specific collections
mongorestore --db sportx-platform \
  --collection notifications \
  backups/db-YYYYMMDD/sportx-platform/notifications.bson
```

### Step 3: Revert Code Changes
```bash
# Revert to previous commit
git revert HEAD

# Or reset to specific commit
git reset --hard <commit-hash>
```

### Step 4: Restart Application
```bash
pm2 restart all
# or
docker-compose up -d
```

## Testing Checklist

- [ ] Backup completed successfully
- [ ] Dry run migration completed without errors
- [ ] Live migration completed successfully
- [ ] Verification passed (no missing notifications)
- [ ] All imports updated
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
  - [ ] Create job notification works
  - [ ] Application status notification works
  - [ ] Message notification works
  - [ ] Read/unread status works
  - [ ] Notification list displays correctly
- [ ] Legacy model archived
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] Staging tests pass
- [ ] Production deployment approved

## Monitoring

After deployment, monitor:

1. **Error Logs**
   ```bash
   tail -f logs/error.log | grep -i notification
   ```

2. **Notification Creation Rate**
   ```javascript
   // In MongoDB
   db.notifications.aggregate([
     {
       $match: {
         createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) }
       }
     },
     {
       $group: {
         _id: { $hour: "$createdAt" },
         count: { $sum: 1 }
       }
     },
     { $sort: { _id: 1 } }
   ])
   ```

3. **Failed Notifications**
   ```javascript
   db.notifications.find({
     delivered: false,
     createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) }
   }).count()
   ```

4. **User Complaints**
   - Monitor support tickets for notification issues
   - Check user feedback channels

## Timeline

| Phase | Duration | Team Members |
|-------|----------|--------------|
| Planning & Review | 2 hours | Senior Engineer + Architect |
| Backup & Test Migration | 1.5 hours | Backend Engineer |
| Execute Migration | 0.5 hours | Backend Engineer (with DBA support) |
| Update Imports | 2 hours | Backend Engineer |
| Testing | 2 hours | Backend Engineer + QA |
| Archive & Cleanup | 0.5 hours | Backend Engineer |
| Documentation | 1 hour | Backend Engineer |
| **Total** | **9.5 hours** | **~1.5 dev days** |

## Success Criteria

✅ All legacy notifications migrated to modern schema
✅ Zero data loss (verified)
✅ All imports updated and working
✅ All tests passing
✅ No error spike in production
✅ User experience unchanged or improved
✅ Legacy model archived (not deleted initially)
✅ Documentation complete

## Support

If you encounter issues:

1. **Check logs**: `logs/migration.log` and `logs/error.log`
2. **Review backup files**: `backups/` directory
3. **Contact team**: Senior Backend Engineer or Architect
4. **Emergency rollback**: Follow rollback plan above

## Related Documents

- [BUG_LIST_AND_FIXES.md](BUG_LIST_AND_FIXES.md) - See BUG-005
- [ARCHITECTURE_MAP.md](ARCHITECTURE_MAP.md) - Notification system architecture
- [ROADMAP.md](ROADMAP.md) - See Sprint 1, Day 5

---

**Last Updated**: 2026-01-17
**Status**: Ready for execution
**Approved By**: [Pending]
