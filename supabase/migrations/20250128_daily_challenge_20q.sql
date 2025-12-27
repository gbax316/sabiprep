-- Migration: Update Daily Challenge to 20 Questions / 20 Minutes
-- Also adds fallback for subjects with fewer questions and improves generation

-- ============================================
-- UPDATE DAILY CHALLENGE DEFAULTS
-- ============================================

-- Update default values in the daily_challenges table
ALTER TABLE public.daily_challenges
ALTER COLUMN time_limit_seconds SET DEFAULT 1200,
ALTER COLUMN question_count SET DEFAULT 20;

-- ============================================
-- IMPROVED GENERATE DAILY CHALLENGES FUNCTION
-- ============================================
-- This function generates daily challenges for all subjects with questions
-- Updated to: 20 questions, 20 minutes, lower threshold for subjects

CREATE OR REPLACE FUNCTION public.generate_daily_challenges(challenge_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
  subject_record RECORD;
  question_ids_arr UUID[];
  challenge_count INTEGER := 0;
  questions_to_select INTEGER := 20;
  min_questions INTEGER := 10; -- Minimum to create a challenge
  actual_question_count INTEGER;
BEGIN
  -- Loop through all active subjects that have published questions
  FOR subject_record IN 
    SELECT DISTINCT s.id, s.name, s.status
    FROM public.subjects s
    INNER JOIN public.topics t ON t.subject_id = s.id
    INNER JOIN public.questions q ON q.topic_id = t.id
    WHERE q.status = 'published'
    AND s.status = 'active'
    GROUP BY s.id, s.name, s.status
    HAVING COUNT(q.id) >= min_questions -- Subjects with at least min_questions
  LOOP
    -- Check if challenge already exists for this date
    IF NOT EXISTS (
      SELECT 1 FROM public.daily_challenges 
      WHERE subject_id = subject_record.id 
      AND challenge_date = generate_daily_challenges.challenge_date
    ) THEN
      -- Get up to 20 random questions from this subject (across all topics)
      -- Prioritize variety: spread across topics and difficulties
      SELECT ARRAY_AGG(q.id) INTO question_ids_arr
      FROM (
        SELECT q.id
        FROM public.questions q
        INNER JOIN public.topics t ON q.topic_id = t.id
        WHERE t.subject_id = subject_record.id
        AND q.status = 'published'
        ORDER BY 
          t.id, -- Group by topic first
          RANDOM() -- Then randomize within each topic
        LIMIT questions_to_select
      ) q;
      
      -- Get actual question count
      actual_question_count := COALESCE(array_length(question_ids_arr, 1), 0);
      
      -- Create challenge if we have at least minimum questions
      IF actual_question_count >= min_questions THEN
        -- Shuffle the questions to mix topics
        SELECT ARRAY_AGG(unnest ORDER BY RANDOM()) INTO question_ids_arr
        FROM unnest(question_ids_arr);
        
        INSERT INTO public.daily_challenges (
          subject_id,
          challenge_date,
          question_ids,
          time_limit_seconds,
          question_count
        ) VALUES (
          subject_record.id,
          generate_daily_challenges.challenge_date,
          question_ids_arr,
          1200, -- 20 minutes
          actual_question_count
        );
        challenge_count := challenge_count + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN challenge_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION TO FORCE GENERATE CHALLENGE FOR SUBJECT
-- ============================================
-- Manual generation for a specific subject

CREATE OR REPLACE FUNCTION public.force_generate_daily_challenge(
  p_subject_id UUID,
  p_challenge_date DATE DEFAULT CURRENT_DATE,
  p_question_count INTEGER DEFAULT 20
)
RETURNS UUID AS $$
DECLARE
  question_ids_arr UUID[];
  actual_count INTEGER;
  challenge_id UUID;
BEGIN
  -- Delete existing challenge for this date if any
  DELETE FROM public.daily_challenges 
  WHERE subject_id = p_subject_id 
  AND challenge_date = p_challenge_date;
  
  -- Get random questions from this subject
  SELECT ARRAY_AGG(q.id ORDER BY RANDOM()) INTO question_ids_arr
  FROM (
    SELECT q.id
    FROM public.questions q
    INNER JOIN public.topics t ON q.topic_id = t.id
    WHERE t.subject_id = p_subject_id
    AND q.status = 'published'
    ORDER BY RANDOM()
    LIMIT p_question_count
  ) q;
  
  actual_count := COALESCE(array_length(question_ids_arr, 1), 0);
  
  IF actual_count = 0 THEN
    RETURN NULL;
  END IF;
  
  -- Create the challenge
  INSERT INTO public.daily_challenges (
    subject_id,
    challenge_date,
    question_ids,
    time_limit_seconds,
    question_count
  ) VALUES (
    p_subject_id,
    p_challenge_date,
    question_ids_arr,
    p_question_count * 60, -- 1 minute per question
    actual_count
  )
  RETURNING id INTO challenge_id;
  
  RETURN challenge_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- UPDATE EXISTING CHALLENGES TO NEW FORMAT
-- ============================================
-- Update any existing 10-question challenges to 20-question format
-- (Only if they haven't been attempted yet)

UPDATE public.daily_challenges dc
SET 
  time_limit_seconds = 1200,
  question_count = 20,
  question_ids = (
    SELECT ARRAY_AGG(q.id ORDER BY RANDOM())
    FROM (
      SELECT q.id
      FROM public.questions q
      INNER JOIN public.topics t ON q.topic_id = t.id
      WHERE t.subject_id = dc.subject_id
      AND q.status = 'published'
      LIMIT 20
    ) q
  )
WHERE dc.challenge_date = CURRENT_DATE
AND dc.question_count = 10
AND NOT EXISTS (
  SELECT 1 FROM public.user_daily_challenges udc
  WHERE udc.daily_challenge_id = dc.id
);

-- ============================================
-- ADD ACHIEVEMENT BADGE ICONS (Enhanced)
-- ============================================
-- Update mastery badges with better icons

UPDATE public.mastery_badges SET 
  icon = '🌱', description = 'Taking your first steps on the learning journey', color = 'from-slate-400 to-slate-600'
WHERE level = 1 AND icon IS NULL OR icon = '🌱';

UPDATE public.mastery_badges SET 
  icon = '📖', description = 'Building a strong foundation', color = 'from-blue-400 to-blue-600'
WHERE level = 2;

UPDATE public.mastery_badges SET 
  icon = '🎓', description = 'Committed to learning excellence', color = 'from-cyan-400 to-cyan-600'
WHERE level = 3;

UPDATE public.mastery_badges SET 
  icon = '📚', description = 'Developing deep subject knowledge', color = 'from-teal-400 to-teal-600'
WHERE level = 4;

UPDATE public.mastery_badges SET 
  icon = '⭐', description = 'Demonstrating consistent skill', color = 'from-emerald-400 to-emerald-600'
WHERE level = 5;

UPDATE public.mastery_badges SET 
  icon = '🏆', description = 'Achieving remarkable proficiency', color = 'from-yellow-400 to-yellow-600'
WHERE level = 6;

UPDATE public.mastery_badges SET 
  icon = '👑', description = 'Mastering the art of learning', color = 'from-amber-400 to-amber-600'
WHERE level = 7;

UPDATE public.mastery_badges SET 
  icon = '💎', description = 'Exceptional dedication and skill', color = 'from-orange-400 to-orange-600'
WHERE level = 8;

UPDATE public.mastery_badges SET 
  icon = '🌟', description = 'Wisdom that inspires others', color = 'from-rose-400 to-rose-600'
WHERE level = 9;

UPDATE public.mastery_badges SET 
  icon = '✨', description = 'Extraordinary talent unleashed', color = 'from-pink-400 to-pink-600'
WHERE level = 10;

UPDATE public.mastery_badges SET 
  icon = '🔥', description = 'Legendary status achieved', color = 'from-red-400 to-red-600'
WHERE level = 11;

UPDATE public.mastery_badges SET 
  icon = '💫', description = 'Transcending all limits of knowledge', color = 'from-violet-400 to-violet-600'
WHERE level = 12;

-- ============================================
-- ENSURE ACHIEVEMENTS TABLE HAS DATA
-- ============================================

-- Insert base achievements if they don't exist
INSERT INTO public.achievements (name, description, icon, requirement_type, requirement_value) VALUES
('First Steps', 'Answer your first 10 questions', '🎯', 'questions_answered', 10),
('Getting Started', 'Answer 50 questions', '📝', 'questions_answered', 50),
('Century Club', 'Answer 100 questions', '💯', 'questions_answered', 100),
('Question Master', 'Answer 500 questions', '🎓', 'questions_answered', 500),
('Knowledge Seeker', 'Answer 1000 questions', '📚', 'questions_answered', 1000),
('Streak Starter', 'Maintain a 3-day streak', '🔥', 'streak', 3),
('Week Warrior', 'Maintain a 7-day streak', '⚡', 'streak', 7),
('Streak Champion', 'Maintain a 14-day streak', '🏆', 'streak', 14),
('Unstoppable', 'Maintain a 30-day streak', '💪', 'streak', 30),
('Sharp Shooter', 'Achieve 80% accuracy (min 20 questions)', '🎯', 'accuracy', 80),
('Precision Master', 'Achieve 90% accuracy (min 20 questions)', '✨', 'accuracy', 90),
('Perfectionist', 'Achieve 100% accuracy (min 10 questions)', '🌟', 'accuracy', 100)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Ensure RLS is enabled
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_challenges ENABLE ROW LEVEL SECURITY;

-- Public read access to daily challenges
DROP POLICY IF EXISTS "Anyone can view daily challenges" ON public.daily_challenges;
CREATE POLICY "Anyone can view daily challenges" ON public.daily_challenges
  FOR SELECT USING (true);

-- Users can view their own challenge completions
DROP POLICY IF EXISTS "Users can view their own challenge completions" ON public.user_daily_challenges;
CREATE POLICY "Users can view their own challenge completions" ON public.user_daily_challenges
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own challenge completions
DROP POLICY IF EXISTS "Users can insert their own challenge completions" ON public.user_daily_challenges;
CREATE POLICY "Users can insert their own challenge completions" ON public.user_daily_challenges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION public.generate_daily_challenges IS 
'Generates daily challenges for all subjects with at least 10 questions. Creates 20-question, 20-minute challenges.';

COMMENT ON FUNCTION public.force_generate_daily_challenge IS 
'Force generates a daily challenge for a specific subject, replacing any existing challenge for that date.';

