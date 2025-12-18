# Goal Tracking System Documentation

## Overview

The SabiPrep goal tracking system allows students to set and track learning goals. Goals are automatically updated when students complete sessions, and notifications are sent when goals are achieved.

## Database Schema

The `user_goals` table stores user-defined goals with the following structure:

- `id`: UUID primary key
- `user_id`: References users table
- `goal_type`: Type of goal (see types below)
- `target_value`: Target value (minutes for study_time, count for questions, percentage for accuracy, days for streak)
- `current_value`: Current progress toward goal
- `period_start`: When this goal period started
- `period_end`: When this goal period ends (null for ongoing goals)
- `achieved`: Boolean flag for achievement status
- `achieved_at`: Timestamp when goal was achieved
- `created_at`: Timestamp when goal was created
- `updated_at`: Timestamp when goal was last updated

## Goal Types

1. **weekly_study_time** - Weekly study time goal (in minutes)
   - Default: 600 minutes (10 hours)
   - Resets every Monday
   - Updated when sessions complete

2. **daily_questions** - Daily questions answered goal
   - Default: 20 questions
   - Resets daily at midnight
   - Updated when sessions complete

3. **weekly_questions** - Weekly questions answered goal
   - Default: 50 questions
   - Resets every Monday
   - Updated when sessions complete

4. **accuracy_target** - Target accuracy percentage (future)
   - Not yet implemented in UI

5. **streak_target** - Target streak days (future)
   - Not yet implemented in UI

## Where Goals Are Set

### Profile Page (`/profile`)

Users can set their goals in the "Learning Goals" section:
- **Weekly Study Time**: Set in hours (converted to minutes)
- **Weekly Questions**: Set number of questions per week
- **Daily Questions**: Set number of questions per day

Goals are saved immediately when the "Save Goals" button is clicked.

## Where Goals Appear

### Home Dashboard (`/home`)

1. **Study Time Goal Card**
   - Shows current weekly study time
   - Displays progress bar toward weekly goal
   - Shows remaining time or "Goal Achieved!" message
   - Link to edit goal in profile

2. **Your Goals Section** (if goals are set)
   - Shows weekly questions progress
   - Shows daily questions progress
   - Progress bars for each goal
   - Link to manage goals in profile

## Automatic Goal Updates

Goals are automatically updated when:
- A session is completed (via `completeSessionWithGoals()`)
- Study time is added to weekly study time goal
- Questions answered are added to weekly and daily question goals

## Goal Achievement Notifications

When a goal is achieved:
1. The `achieved` flag is set to `true`
2. `achieved_at` timestamp is recorded
3. A notification is created via `notifyGoalAchieved()`
4. User sees notification in the notification dropdown

## API Functions

### Core Functions (`lib/api.ts`)

- `getUserGoals(userId)` - Get all user goals
- `getUserGoal(userId, goalType)` - Get specific goal by type
- `setUserGoal(userId, goalType, targetValue)` - Set or update a goal
- `updateGoalProgress(userId, goalType, incrementValue)` - Update goal progress
- `checkGoalAchievements(userId)` - Check for newly achieved goals and create notifications
- `completeSessionWithGoals(...)` - Complete session and update goals

### Database Functions

- `update_goal_progress()` - Updates goal progress and checks for achievement
- `reset_periodic_goals()` - Resets weekly/daily goals (to be called by cron)

## Daily Reminders

### Cron Job Setup

A daily reminder cron job is set up at `/api/cron/daily-reminders`:

**Vercel Cron Configuration** (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-reminders",
      "schedule": "0 8 * * *"
    }
  ]
}
```

This runs daily at 8:00 AM UTC.

**Manual Setup** (if not using Vercel):
- Use a cron service (GitHub Actions, cron-job.org, etc.)
- Call `GET /api/cron/daily-reminders` daily
- Optional: Set `CRON_SECRET` environment variable for security

### Reminder Logic

The cron job:
1. Gets all active student users
2. Checks if they've completed a session today
3. Checks if they've already received a reminder today
4. Sends notification to users who haven't practiced today

## Migration

Run the migration to create the user_goals table:

```bash
# The migration file is at:
supabase/migrations/20250121_user_goals_schema.sql
```

Apply it using Supabase CLI or your database management tool.

## Future Enhancements

1. **Accuracy Goals**: Track and notify when accuracy targets are reached
2. **Streak Goals**: Set target streak days
3. **Goal Templates**: Pre-defined goal templates based on grade level
4. **Goal History**: Track goal achievement history
5. **Adaptive Goals**: Automatically adjust goals based on performance
6. **Email Notifications**: Send email when goals are achieved (in addition to in-app notifications)
