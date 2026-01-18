# Auto-Create Free Subscription Fix - January 18, 2026

## Problem

Users were unable to create jobs with error:
```
Error: No active subscription found
POST /api/v1/job-publisher/jobs 403
```

## Root Cause

New job-publisher users don't have a subscription record in the database by default. The `subscriptionCheck` middleware was blocking all requests from users without subscriptions.

## Solution

Modified the subscription middleware to **automatically create a free tier subscription** for new users.

### Changes Made

#### File: `src/middleware/subscriptionCheck.js`

1. **Added helper function `createFreeSubscription(publisherId)`:**
   - Creates a free tier subscription automatically
   - Sets tier to 'free' with 100-year duration
   - Includes default free tier features:
     - ✅ Job posting (max 3 jobs)
     - ✅ Email notifications
     - ✅ Messaging (max 100 threads)
     - ✅ File attachments
     - ✅ Basic analytics
     - ❌ Custom branding (paid feature)
     - ❌ API access (paid feature)
     - ❌ Automation rules (paid feature)

2. **Modified `requireFeature()` middleware:**
   ```javascript
   // Before
   if (!subscription) {
     return next(new AppError('No active subscription found', 403));
   }

   // After
   if (!subscription) {
     logger.warn(`No subscription found, creating free tier...`);
     subscription = await createFreeSubscription(publisherId);
   }
   ```

3. **Modified `checkUsageLimit()` middleware:**
   ```javascript
   // Before
   if (!subscription) {
     return next(new AppError('No active subscription found', 403));
   }

   // After
   if (!subscription) {
     logger.warn(`No subscription found, creating free tier...`);
     subscription = await createFreeSubscription(publisherId);
   }
   ```

## Free Tier Features

### Default Subscription Details
```javascript
{
  tier: 'free',
  status: 'active',
  billingCycle: 'lifetime',
  isFree: true,
  autoRenew: false,
  price: { amount: 0, currency: 'SAR' }
}
```

### Features Included (Free Tier)
| Feature | Enabled | Limit |
|---------|---------|-------|
| Job Posting | ✅ | 3 jobs max |
| Email Notifications | ✅ | Unlimited |
| Messaging | ✅ | 100 threads |
| File Attachments | ✅ | Yes |
| Basic Analytics | ✅ | Yes |
| Custom Branding | ❌ | Paid only |
| Priority Support | ❌ | Paid only |
| API Access | ❌ | Paid only |
| Automation Rules | ❌ | Paid only |
| Advanced Analytics | ❌ | Paid only |
| Bulk Actions | ❌ | Paid only |
| Team Members | ❌ | 1 only (owner) |

### Usage Tracking
```javascript
{
  jobsThisMonth: 0,
  applicationsThisMonth: 0,
  messagesThisMonth: 0,
  emailsSentThisMonth: 0,
  lastResetDate: new Date()
}
```

## Benefits

### 1. Better User Experience
- ✅ New users can start using the platform immediately
- ✅ No manual subscription creation required
- ✅ Seamless onboarding process

### 2. Automatic Upgrade Path
- Users start with free tier (3 jobs)
- When they reach the limit, they see upgrade prompts
- Clear monetization path

### 3. Logging & Monitoring
```javascript
logger.warn(`⚠️  No subscription found for publisher ${publisherId}, creating free tier...`);
logger.info(`✅ Created free subscription for publisher ${publisherId}`);
```

## Testing

### Test Case 1: New User Creates Job
1. Register as job-publisher
2. Try to create a job
3. **Expected:** Subscription auto-created, job created successfully
4. **Result:** ✅ Pass

### Test Case 2: Existing User (No Subscription)
1. Login as existing job-publisher without subscription
2. Try to create a job
3. **Expected:** Subscription auto-created, job created successfully
4. **Result:** ✅ Pass

### Test Case 3: User with Existing Subscription
1. Login as user with active subscription
2. Try to create a job
3. **Expected:** Uses existing subscription, job created
4. **Result:** ✅ Pass

### Test Case 4: Free Tier Limit (3 Jobs)
1. Create 3 jobs (free tier limit)
2. Try to create 4th job
3. **Expected:** Error "You have reached your Jobs limit (3)"
4. **Result:** ✅ Pass

## Migration Note

**No database migration required!**

Subscriptions are created on-demand when users try to use features. Existing users with subscriptions are unaffected.

## Logs Example

### Successful Auto-Creation
```
[2026-01-18 00:55:00] WARN ⚠️  No subscription found for publisher 69690e461989841449f369ca, creating free tier...
[2026-01-18 00:55:00] INFO ✅ Created free subscription for publisher 69690e461989841449f369ca
[2026-01-18 00:55:01] INFO POST /api/v1/job-publisher/jobs 201 - Job created successfully
```

### When Limit Reached
```
[2026-01-18 00:56:00] ERROR You have reached your Jobs limit (3). Please upgrade your subscription.
[2026-01-18 00:56:00] INFO POST /api/v1/job-publisher/jobs 403
```

## Impact

### Fixed Routes
1. ✅ `POST /api/v1/job-publisher/jobs` - Create job
2. ✅ `PUT /api/v1/job-publisher/applications/:id/status` - Update application status
3. ✅ All routes using `requireFeature()` middleware
4. ✅ All routes using `checkUsageLimit()` middleware

### Unaffected Routes
- Routes without subscription middleware work as before
- Existing users with subscriptions unchanged
- Admin routes unchanged

## Future Enhancements

### Option 1: Create Subscription on Registration
Add subscription creation to the registration process:
```javascript
// In auth/register controller
const subscription = await Subscription.create({
  publisherId: newUser._id,
  tier: 'free',
  // ... rest of config
});
```

### Option 2: Subscription Dashboard
Create admin panel to:
- View all subscriptions
- Manually upgrade/downgrade users
- View usage statistics
- Set custom limits per user

### Option 3: Tiered Upgrade Prompts
Show smart upgrade prompts:
- "You've used 2/3 jobs. Upgrade to get 10 jobs!"
- "Unlock automation with Pro plan"
- In-app subscription management

## Files Changed
- `src/middleware/subscriptionCheck.js` (67 lines added)

**Total:** 1 file, 67 lines added

---

**Status:** ✅ Fixed
**Date:** January 18, 2026
**Breaking Changes:** None
**Migration Required:** No
