# Notifications System Documentation

## Overview

The SabiPrep notification system provides role-based notifications for students, tutors, and admins. Notifications are displayed in a dropdown menu accessible from the header navigation.

## Database Schema

The `notifications` table stores all user notifications with the following structure:

- `id`: UUID primary key
- `user_id`: References users table
- `type`: Notification type (see types below)
- `title`: Notification title
- `message`: Notification message/content
- `data`: JSONB field for additional data (session_id, achievement_id, etc.)
- `read`: Boolean flag for read status
- `read_at`: Timestamp when notification was read
- `created_at`: Timestamp when notification was created
- `updated_at`: Timestamp when notification was last updated

## Notification Types

### Student Notifications

1. **achievement_unlocked** - When a student unlocks an achievement
   - Data: `{ achievement_id: string }`
   - Link: `/achievements`

2. **streak_milestone** - When student reaches streak milestones (7, 14, 30, 50, 100 days)
   - Data: `{ streak_count: number }`

3. **session_completed** - When student completes a session with good scores (≥60%)
   - Data: `{ session_id: string, score_percentage: number }`
   - Link: `/results/{session_id}`

4. **goal_achieved** - When student achieves study goals
   - Data: `{ goal_type: string, achieved_value: number }`

5. **daily_reminder** - Daily practice reminders
   - Data: `{}`

6. **new_content** - When new subjects, topics, or questions are added
   - Data: `{ content_type: string, content_name: string }`

### Tutor Notifications

7. **student_progress** - Updates on student progress
   - Data: `{ student_name: string, streak: number, questionsAnswered: number, accuracy: number }`

8. **student_achievement** - When a student unlocks an achievement
   - Data: `{ student_name: string, achievement_name: string }`

### Admin Notifications

9. **new_signup** - When a new user signs up
   - Data: `{ user_name: string, user_email: string, user_role: string }`

10. **import_completed** - When CSV imports complete
    - Data: `{ filename: string, successful_rows: number, failed_rows: number }`

11. **system_alert** - System-wide alerts
    - Data: `{ ...custom data }`

12. **content_review** - Content that needs review
    - Data: `{ content_type: string, content_id: string, reason: string }`

## API Functions

### Core Functions (`lib/api.ts`)

- `getNotifications(userId, limit, unreadOnly)` - Get user notifications
- `getUnreadNotificationCount(userId)` - Get count of unread notifications
- `markNotificationAsRead(notificationId)` - Mark single notification as read
- `markAllNotificationsAsRead(userId)` - Mark all notifications as read
- `createNotification(userId, type, title, message, data)` - Create a notification

### Helper Functions (`lib/notifications.ts`)

#### Student Notifications
- `notifyAchievementUnlocked(userId, achievement)` - Achievement unlocked
- `notifyStreakMilestone(userId, streakCount)` - Streak milestone
- `notifySessionCompleted(userId, session)` - Session completed
- `notifyGoalAchieved(userId, goalType, achievedValue)` - Goal achieved
- `notifyDailyReminder(userId)` - Daily reminder
- `notifyNewContent(userId, contentType, contentName)` - New content available

#### Tutor Notifications
- `notifyTutorStudentAchievement(tutorId, studentName, achievement)` - Student achievement
- `notifyTutorStudentProgress(tutorId, studentName, progress)` - Student progress

#### Admin Notifications
- `notifyAdminNewSignup(adminId, user)` - New signup
- `notifyAdminImportCompleted(adminId, importReport)` - Import completed
- `notifyAdminSystemAlert(title, message, data)` - System alert (all admins)
- `notifyAdminContentReview(adminId, contentType, contentId, reason)` - Content review needed

## UI Components

### NotificationDropdown (`components/common/NotificationDropdown.tsx`)

A dropdown component that displays notifications with:
- Unread count badge
- Grouped unread/read notifications
- Click to mark as read
- Links to relevant pages (results, achievements)
- Auto-refresh every 30 seconds
- Mark all as read functionality

### Integration in Header (`components/navigation/Header.tsx`)

The notification dropdown is integrated into the header navigation and automatically shows:
- Unread notification count
- Dropdown menu on click
- Real-time updates

## Automatic Notification Creation

Notifications are automatically created in the following scenarios:

1. **Achievement Unlocked**: When `awardAchievement()` is called
2. **Streak Milestones**: When `updateUserStreak()` detects milestone (7, 14, 30, 50, 100 days)
3. **Session Completed**: Should be called after session completion (to be integrated)
4. **Goal Achieved**: Should be called when goals are reached (to be integrated)

## Usage Examples

### Creating a Notification

```typescript
import { createNotification } from '@/lib/api';

// Simple notification
await createNotification(
  userId,
  'achievement_unlocked',
  '🎉 Achievement Unlocked!',
  'You\'ve unlocked "First Steps"!',
  { achievement_id: 'abc123' }
);
```

### Using Helper Functions

```typescript
import { notifyAchievementUnlocked } from '@/lib/notifications';

await notifyAchievementUnlocked(userId, {
  id: 'abc123',
  name: 'First Steps',
  description: 'Answer your first question'
});
```

### For Role-Based Notifications

```typescript
import { createNotificationForRole } from '@/lib/api';

// Notify all admins
await createNotificationForRole(
  'admin',
  'system_alert',
  'System Maintenance',
  'Scheduled maintenance tonight at 2 AM',
  { maintenance_window: '2:00 AM - 4:00 AM' }
);
```

## Future Enhancements

1. **Email Notifications**: Send email for important notifications
2. **Push Notifications**: Browser push notifications
3. **Notification Preferences**: User settings for notification types
4. **Scheduled Notifications**: Daily reminders, weekly summaries
5. **Notification Templates**: Reusable notification templates
6. **Notification Groups**: Group related notifications

## Migration

Run the migration to create the notifications table:

```bash
# The migration file is at:
supabase/migrations/20250121_notifications_schema.sql
```

Apply it using Supabase CLI or your database management tool.
