-- Migration: Fix streak counting logic and add XP system
-- This fixes the broken streak calculation and adds XP tracking columns

-- ============================================
-- FIX STREAK FUNCTION
-- ============================================
-- The original function had inverted logic. Fix it to properly:
-- - Increment if last active was yesterday
-- - Reset if gap > 1 day
-- - Do nothing if already active today

CREATE OR REPLACE FUNCTION public.update_user_streak(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
  last_active DATE;
  current_streak INTEGER;
BEGIN
  SELECT last_active_date, streak_count INTO last_active, current_streak
  FROM public.users WHERE id = user_uuid;
  
  -- If no previous activity, start streak at 1
  IF last_active IS NULL THEN
    UPDATE public.users
    SET streak_count = 1,
        last_active_date = CURRENT_DATE
    WHERE id = user_uuid;
    RETURN;
  END IF;
  
  -- If already active today, do nothing
  IF last_active = CURRENT_DATE THEN
    RETURN;
  END IF;
  
  -- If last active was yesterday, increment streak
  IF last_active = CURRENT_DATE - INTERVAL '1 day' THEN
    UPDATE public.users
    SET streak_count = COALESCE(current_streak, 0) + 1,
        last_active_date = CURRENT_DATE
    WHERE id = user_uuid;
    RETURN;
  END IF;
  
  -- If gap is more than 1 day, reset streak to 1
  IF last_active < CURRENT_DATE - INTERVAL '1 day' THEN
    UPDATE public.users
    SET streak_count = 1,
        last_active_date = CURRENT_DATE
    WHERE id = user_uuid;
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ADD XP SYSTEM COLUMNS
-- ============================================
-- Add XP tracking columns to users table

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS xp_points INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS daily_xp_claimed_at DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS daily_xp_streak_bonus_claimed BOOLEAN DEFAULT FALSE NOT NULL;

-- Add index for XP queries
CREATE INDEX IF NOT EXISTS idx_users_xp_points ON public.users(xp_points DESC);

-- ============================================
-- DAILY CHALLENGES TABLES
-- ============================================

-- Table to store daily challenges (one per subject per day)
CREATE TABLE IF NOT EXISTS public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  challenge_date DATE NOT NULL,
  question_ids UUID[] NOT NULL, -- Array of question IDs for this challenge
  time_limit_seconds INTEGER DEFAULT 600 NOT NULL, -- 10 minutes
  question_count INTEGER DEFAULT 10 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subject_id, challenge_date)
);

-- Table to track user completions of daily challenges
CREATE TABLE IF NOT EXISTS public.user_daily_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  daily_challenge_id UUID NOT NULL REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  score_percentage DECIMAL(5,2),
  correct_answers INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  time_spent_seconds INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  xp_earned INTEGER DEFAULT 0,
  UNIQUE(user_id, daily_challenge_id)
);

-- Indexes for daily challenges
CREATE INDEX IF NOT EXISTS idx_daily_challenges_subject_date ON public.daily_challenges(subject_id, challenge_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_daily_challenges_user ON public.user_daily_challenges(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_daily_challenges_challenge ON public.user_daily_challenges(daily_challenge_id);

-- ============================================
-- MASTERY BADGES TABLE
-- ============================================

-- Mastery badges for global and per-subject levels
CREATE TABLE IF NOT EXISTS public.mastery_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- e.g., "Novice", "Apprentice", etc.
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 12),
  xp_requirement INTEGER NOT NULL, -- For global badges
  correct_answers_requirement INTEGER NOT NULL, -- For per-subject badges (10% of global XP)
  icon TEXT, -- Icon/emoji for the badge
  description TEXT,
  color TEXT, -- Color scheme for the badge
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, level)
);

-- User mastery badges (global and per-subject)
CREATE TABLE IF NOT EXISTS public.user_mastery_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mastery_badge_id UUID NOT NULL REFERENCES public.mastery_badges(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE, -- NULL for global badges
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, mastery_badge_id, subject_id)
);

-- Indexes for mastery badges
CREATE INDEX IF NOT EXISTS idx_user_mastery_badges_user ON public.user_mastery_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mastery_badges_subject ON public.user_mastery_badges(subject_id);

-- ============================================
-- SEED MASTERY BADGES
-- ============================================

INSERT INTO public.mastery_badges (name, level, xp_requirement, correct_answers_requirement, icon, description, color) VALUES
('Novice', 1, 0, 0, '🌱', 'Just getting started on your learning journey', 'from-gray-400 to-gray-600'),
('Apprentice', 2, 50, 5, '📚', 'Learning the basics', 'from-blue-400 to-blue-600'),
('Student', 3, 150, 15, '🎓', 'Making steady progress', 'from-cyan-400 to-cyan-600'),
('Scholar', 4, 300, 30, '📖', 'Developing expertise', 'from-green-400 to-green-600'),
('Adept', 5, 500, 50, '⭐', 'Showing real skill', 'from-yellow-400 to-yellow-600'),
('Expert', 6, 800, 80, '🏆', 'Highly proficient', 'from-orange-400 to-orange-600'),
('Master', 7, 1200, 120, '👑', 'True mastery achieved', 'from-purple-400 to-purple-600'),
('Grandmaster', 8, 1800, 180, '💎', 'Exceptional mastery', 'from-indigo-400 to-indigo-600'),
('Sage', 9, 2500, 250, '🌟', 'Wisdom beyond measure', 'from-pink-400 to-pink-600'),
('Virtuoso', 10, 3500, 350, '✨', 'Extraordinary talent', 'from-rose-400 to-rose-600'),
('Legend', 11, 5000, 500, '🔥', 'Legendary status', 'from-red-400 to-red-600'),
('Transcendent', 12, 7500, 750, '💫', 'Transcending all limits', 'from-violet-400 to-violet-600')
ON CONFLICT (name, level) DO NOTHING;

-- ============================================
-- FUNCTION TO GENERATE DAILY CHALLENGES
-- ============================================
-- This function generates daily challenges for all subjects with questions

CREATE OR REPLACE FUNCTION public.generate_daily_challenges(challenge_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
  subject_record RECORD;
  question_ids UUID[];
  challenge_count INTEGER := 0;
BEGIN
  -- Loop through all subjects that have questions
  FOR subject_record IN 
    SELECT DISTINCT s.id, s.name
    FROM public.subjects s
    INNER JOIN public.topics t ON t.subject_id = s.id
    INNER JOIN public.questions q ON q.topic_id = t.id
    WHERE q.status = 'published'
    GROUP BY s.id, s.name
    HAVING COUNT(q.id) >= 10 -- Only subjects with at least 10 questions
  LOOP
    -- Check if challenge already exists for this date
    IF NOT EXISTS (
      SELECT 1 FROM public.daily_challenges 
      WHERE subject_id = subject_record.id 
      AND challenge_date = generate_daily_challenges.challenge_date
    ) THEN
      -- Get 10 random questions from this subject (across all topics)
      SELECT ARRAY_AGG(q.id) INTO question_ids
      FROM (
        SELECT q.id
        FROM public.questions q
        INNER JOIN public.topics t ON q.topic_id = t.id
        WHERE t.subject_id = subject_record.id
        AND q.status = 'published'
        ORDER BY RANDOM()
        LIMIT 10
      ) q;
      
      -- Only create challenge if we have exactly 10 questions
      IF array_length(question_ids, 1) = 10 THEN
        INSERT INTO public.daily_challenges (
          subject_id,
          challenge_date,
          question_ids,
          time_limit_seconds,
          question_count
        ) VALUES (
          subject_record.id,
          generate_daily_challenges.challenge_date,
          question_ids,
          600, -- 10 minutes
          10
        );
        challenge_count := challenge_count + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN challenge_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION TO AWARD XP
-- ============================================
-- Awards XP based on correct answers, daily bonus, and streak bonus

CREATE OR REPLACE FUNCTION public.award_xp(
  user_uuid UUID,
  correct_answers_count INTEGER,
  is_daily_challenge BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER AS $$
DECLARE
  xp_earned INTEGER := 0;
  user_record RECORD;
  daily_bonus INTEGER := 0;
  streak_bonus INTEGER := 0;
  current_date_local DATE;
BEGIN
  -- Get current user data
  SELECT xp_points, daily_xp_claimed_at, daily_xp_streak_bonus_claimed, streak_count, last_active_date
  INTO user_record
  FROM public.users
  WHERE id = user_uuid;
  
  current_date_local := CURRENT_DATE;
  
  -- 1 XP per correct answer
  xp_earned := correct_answers_count;
  
  -- Daily bonus: 2 XP for completing any session (once per day)
  IF user_record.daily_xp_claimed_at IS NULL OR user_record.daily_xp_claimed_at < current_date_local THEN
    daily_bonus := 2;
    xp_earned := xp_earned + daily_bonus;
  END IF;
  
  -- Streak bonus: +1 XP per consecutive day (once per day, only if streak > 1)
  IF user_record.streak_count > 1 THEN
    IF user_record.daily_xp_streak_bonus_claimed = FALSE OR 
       (user_record.daily_xp_claimed_at IS NOT NULL AND user_record.daily_xp_claimed_at < current_date_local) THEN
      streak_bonus := 1;
      xp_earned := xp_earned + streak_bonus;
    END IF;
  END IF;
  
  -- Update user XP and daily claim status
  UPDATE public.users
  SET xp_points = xp_points + xp_earned,
      daily_xp_claimed_at = current_date_local,
      daily_xp_streak_bonus_claimed = CASE 
        WHEN streak_bonus > 0 THEN TRUE 
        ELSE daily_xp_streak_bonus_claimed 
      END
  WHERE id = user_uuid;
  
  RETURN xp_earned;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION TO CHECK AND AWARD MASTERY BADGES
-- ============================================

CREATE OR REPLACE FUNCTION public.check_and_award_mastery_badges(
  user_uuid UUID,
  subject_uuid UUID DEFAULT NULL -- NULL for global badges
)
RETURNS INTEGER AS $$
DECLARE
  badge_count INTEGER := 0;
  user_xp INTEGER;
  user_correct_answers INTEGER;
  badge_record RECORD;
BEGIN
  IF subject_uuid IS NULL THEN
    -- Check global badges (based on total XP)
    SELECT xp_points INTO user_xp
    FROM public.users
    WHERE id = user_uuid;
    
    -- Find highest badge user qualifies for
    FOR badge_record IN
      SELECT id, level, xp_requirement
      FROM public.mastery_badges
      WHERE xp_requirement <= user_xp
      ORDER BY level DESC
    LOOP
      -- Check if user already has this badge
      IF NOT EXISTS (
        SELECT 1 FROM public.user_mastery_badges
        WHERE user_id = user_uuid
        AND mastery_badge_id = badge_record.id
        AND subject_id IS NULL
      ) THEN
        INSERT INTO public.user_mastery_badges (user_id, mastery_badge_id, subject_id)
        VALUES (user_uuid, badge_record.id, NULL);
        badge_count := badge_count + 1;
      END IF;
    END LOOP;
  ELSE
    -- Check per-subject badges (based on correct answers for this subject)
    SELECT COALESCE(SUM(questions_correct), 0) INTO user_correct_answers
    FROM public.user_progress
    WHERE user_id = user_uuid
    AND subject_id = subject_uuid;
    
    -- Find highest badge user qualifies for
    FOR badge_record IN
      SELECT id, level, correct_answers_requirement
      FROM public.mastery_badges
      WHERE correct_answers_requirement <= user_correct_answers
      ORDER BY level DESC
    LOOP
      -- Check if user already has this badge
      IF NOT EXISTS (
        SELECT 1 FROM public.user_mastery_badges
        WHERE user_id = user_uuid
        AND mastery_badge_id = badge_record.id
        AND subject_id = subject_uuid
      ) THEN
        INSERT INTO public.user_mastery_badges (user_id, mastery_badge_id, subject_id)
        VALUES (user_uuid, badge_record.id, subject_uuid);
        badge_count := badge_count + 1;
      END IF;
    END LOOP;
  END IF;
  
  RETURN badge_count;
END;
$$ LANGUAGE plpgsql;

