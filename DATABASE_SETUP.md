# SABIPREP - Database Setup Guide

This guide explains how to set up the Supabase database for the SABIPREP application.

---

## Overview

The database schema includes:
- **Users**: User profiles and statistics
- **Subjects**: Academic subjects (Mathematics, English, Physics, etc.)
- **Topics**: Topics within each subject
- **Questions**: Question bank with multiple-choice options
- **Sessions**: Learning sessions (practice, test, timed modes)
- **Session Answers**: User answers for each question
- **User Progress**: Progress tracking per topic
- **Achievements**: Gamification achievements
- **User Achievements**: Achievements earned by users

---

## Prerequisites

1. **Supabase Account**: Create an account at [supabase.com](https://supabase.com)
2. **Supabase Project**: Create a new project in your Supabase dashboard
3. **Environment Variables**: Set up `.env.local` with your Supabase credentials

---

## Step 1: Set Up Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

You can find these values in your Supabase project settings under **API**.

---

## Step 2: Run Database Migrations

### Option A: Using Supabase CLI (Recommended)

1. **Install Supabase CLI**:
   
   **Windows (PowerShell)**:
   ```powershell
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```
   
   **macOS (Homebrew)**:
   ```bash
   brew install supabase/tap/supabase
   ```
   
   **Linux**:
   ```bash
   brew install supabase/tap/supabase
   ```
   
   Or download from: https://github.com/supabase/cli/releases

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. **Run migrations**:
   ```bash
   supabase db push
   ```

### Option B: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of [`supabase/migrations/20231216_initial_schema.sql`](supabase/migrations/20231216_initial_schema.sql)
4. Paste and run the SQL
5. Copy the contents of [`supabase/migrations/20231216_seed_data.sql`](supabase/migrations/20231216_seed_data.sql)
6. Paste and run the SQL

---

## Step 3: Verify Database Setup

Run these queries in the SQL Editor to verify:

```sql
-- Check table counts
SELECT 'Subjects' as table_name, COUNT(*) as count FROM public.subjects
UNION ALL
SELECT 'Topics', COUNT(*) FROM public.topics
UNION ALL
SELECT 'Questions', COUNT(*) FROM public.questions
UNION ALL
SELECT 'Achievements', COUNT(*) FROM public.achievements;

-- Check questions per subject
SELECT s.name as subject, COUNT(q.id) as question_count
FROM public.subjects s
LEFT JOIN public.questions q ON q.subject_id = s.id
GROUP BY s.name
ORDER BY s.name;
```

Expected results:
- 8 Subjects
- 16+ Topics
- 15+ Questions
- 10 Achievements

---

## Database Schema Details

### Core Tables

#### 1. **users**
Extends Supabase `auth.users` with additional profile information.

**Columns:**
- `id` (UUID, Primary Key)
- `email` (TEXT, Unique)
- `full_name` (TEXT)
- `grade` (TEXT: SS1, SS2, SS3, Graduate)
- `avatar_url` (TEXT)
- `streak_count` (INTEGER)
- `last_active_date` (DATE)
- `total_questions_answered` (INTEGER)
- `total_correct_answers` (INTEGER)
- `total_study_time_minutes` (INTEGER)
- `created_at`, `updated_at` (TIMESTAMP)

#### 2. **subjects**
Academic subjects available in the app.

**Columns:**
- `id` (UUID, Primary Key)
- `name` (TEXT, Unique)
- `slug` (TEXT, Unique)
- `description` (TEXT)
- `icon` (TEXT)
- `color` (TEXT)
- `exam_types` (TEXT[])
- `total_questions` (INTEGER)
- `created_at`, `updated_at` (TIMESTAMP)

#### 3. **topics**
Topics within each subject.

**Columns:**
- `id` (UUID, Primary Key)
- `subject_id` (UUID, Foreign Key)
- `name` (TEXT)
- `slug` (TEXT)
- `description` (TEXT)
- `difficulty` (TEXT: Easy, Medium, Hard)
- `total_questions` (INTEGER)
- `created_at`, `updated_at` (TIMESTAMP)

#### 4. **questions**
Question bank with multiple-choice options.

**Columns:**
- `id` (UUID, Primary Key)
- `subject_id` (UUID, Foreign Key)
- `topic_id` (UUID, Foreign Key)
- `question_text` (TEXT)
- `question_image_url` (TEXT)
- `option_a`, `option_b`, `option_c`, `option_d` (TEXT)
- `correct_answer` (TEXT: A, B, C, D)
- `explanation` (TEXT)
- `hint` (TEXT)
- `difficulty` (TEXT: Easy, Medium, Hard)
- `exam_type` (TEXT: JAMB, WAEC, NECO)
- `exam_year` (INTEGER)
- `created_at`, `updated_at` (TIMESTAMP)

#### 5. **sessions**
Learning sessions for practice, test, and timed modes.

**Columns:**
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key)
- `subject_id` (UUID, Foreign Key)
- `topic_id` (UUID, Foreign Key)
- `mode` (TEXT: practice, test, timed)
- `total_questions` (INTEGER)
- `questions_answered` (INTEGER)
- `correct_answers` (INTEGER)
- `score_percentage` (DECIMAL)
- `time_spent_seconds` (INTEGER)
- `status` (TEXT: in_progress, completed, abandoned)
- `started_at`, `completed_at` (TIMESTAMP)
- `created_at`, `updated_at` (TIMESTAMP)

#### 6. **session_answers**
User answers for each question in a session.

**Columns:**
- `id` (UUID, Primary Key)
- `session_id` (UUID, Foreign Key)
- `question_id` (UUID, Foreign Key)
- `user_answer` (TEXT: A, B, C, D)
- `is_correct` (BOOLEAN)
- `time_spent_seconds` (INTEGER)
- `hint_used` (BOOLEAN)
- `solution_viewed` (BOOLEAN)
- `answered_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)

#### 7. **user_progress**
Progress tracking per topic.

**Columns:**
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key)
- `subject_id` (UUID, Foreign Key)
- `topic_id` (UUID, Foreign Key)
- `questions_attempted` (INTEGER)
- `questions_correct` (INTEGER)
- `accuracy_percentage` (DECIMAL)
- `last_practiced_at` (TIMESTAMP)
- `created_at`, `updated_at` (TIMESTAMP)

---

## Row Level Security (RLS)

All tables have RLS enabled with appropriate policies:

- **Users**: Can only view/update their own profile
- **Subjects, Topics, Questions**: Public read access
- **Sessions, Session Answers**: Users can only access their own data
- **User Progress**: Users can only access their own progress
- **Achievements**: Public read, users can earn their own

---

## Functions and Triggers

### 1. **handle_new_user()**
Automatically creates a user profile when a new user signs up.

### 2. **update_user_streak(user_uuid)**
Updates the user's streak count based on daily activity.

### 3. **update_updated_at_column()**
Automatically updates the `updated_at` timestamp on row updates.

---

## Adding More Questions

To add more questions, use this SQL template:

```sql
INSERT INTO public.questions (
  subject_id, 
  topic_id, 
  question_text, 
  option_a, 
  option_b, 
  option_c, 
  option_d, 
  correct_answer, 
  explanation, 
  hint, 
  difficulty, 
  exam_type, 
  exam_year
)
SELECT 
  s.id AS subject_id,
  t.id AS topic_id,
  'Your question text here',
  'Option A',
  'Option B',
  'Option C',
  'Option D',
  'A', -- Correct answer
  'Explanation of the answer',
  'Hint for the question',
  'Medium', -- Easy, Medium, or Hard
  'JAMB', -- JAMB, WAEC, or NECO
  2023
FROM public.subjects s
JOIN public.topics t ON t.subject_id = s.id
WHERE s.slug = 'mathematics' AND t.slug = 'algebra';

-- Update question counts
UPDATE public.topics t
SET total_questions = (
  SELECT COUNT(*) FROM public.questions q WHERE q.topic_id = t.id
);

UPDATE public.subjects s
SET total_questions = (
  SELECT COUNT(*) FROM public.questions q WHERE q.subject_id = s.id
);
```

---

## Backup and Restore

### Backup
```bash
supabase db dump -f backup.sql
```

### Restore
```bash
supabase db reset
supabase db push
```

---

## Troubleshooting

### Issue: Migration fails
**Solution**: Check that you're running migrations in order. The initial schema must be run before seed data.

### Issue: RLS policies blocking access
**Solution**: Verify that the user is authenticated and the `auth.uid()` matches the user_id in the table.

### Issue: Questions not showing up
**Solution**: Check that the subject and topic IDs match correctly in the questions table.

---

## Next Steps

After setting up the database:

1. ✅ Test authentication flow
2. ✅ Verify data is accessible from the frontend
3. ✅ Create API functions in `lib/api.ts`
4. ✅ Build dashboard components
5. ✅ Implement learning modes

---

**Last Updated**: 2025-12-16  
**Status**: Ready for Use  
**Maintainer**: SABIPREP Development Team
