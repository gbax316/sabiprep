-- ============================================
-- USER ATTEMPTED QUESTIONS TABLE
-- Tracks which questions each user has attempted per subject
-- to prevent question repetition until all questions are exhausted
-- ============================================

-- Create the user_attempted_questions table
CREATE TABLE IF NOT EXISTS public.user_attempted_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  first_attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  attempt_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Unique constraint to prevent duplicates
  UNIQUE(user_id, subject_id, question_id)
);

-- Create optimized indexes for fast lookups
-- Primary lookup: Get all attempted questions for a user in a subject
CREATE INDEX IF NOT EXISTS idx_user_attempted_questions_lookup 
ON public.user_attempted_questions(user_id, subject_id);

-- Secondary index: For counting attempts per question
CREATE INDEX IF NOT EXISTS idx_user_attempted_questions_question 
ON public.user_attempted_questions(question_id);

-- Index for cleanup/admin queries by subject
CREATE INDEX IF NOT EXISTS idx_user_attempted_questions_subject 
ON public.user_attempted_questions(subject_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.user_attempted_questions ENABLE ROW LEVEL SECURITY;

-- Users can view their own attempted questions
CREATE POLICY "Users can view their own attempted questions" 
ON public.user_attempted_questions
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own attempted questions
CREATE POLICY "Users can insert their own attempted questions" 
ON public.user_attempted_questions
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own attempted questions (for attempt_count increment)
CREATE POLICY "Users can update their own attempted questions" 
ON public.user_attempted_questions
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own attempted questions (for pool reset)
CREATE POLICY "Users can delete their own attempted questions" 
ON public.user_attempted_questions
FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get unattempted question IDs for a user in a subject
CREATE OR REPLACE FUNCTION get_unattempted_questions(
  p_user_id UUID,
  p_subject_id UUID,
  p_topic_ids UUID[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(question_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT q.id
  FROM public.questions q
  WHERE q.subject_id = p_subject_id
    AND q.status = 'published'
    AND (p_topic_ids IS NULL OR q.topic_id = ANY(p_topic_ids))
    AND NOT EXISTS (
      SELECT 1 
      FROM public.user_attempted_questions uaq
      WHERE uaq.user_id = p_user_id
        AND uaq.subject_id = p_subject_id
        AND uaq.question_id = q.id
    )
  ORDER BY RANDOM()
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset attempted questions for a user in a subject
CREATE OR REPLACE FUNCTION reset_user_attempted_questions(
  p_user_id UUID,
  p_subject_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.user_attempted_questions
  WHERE user_id = p_user_id
    AND subject_id = p_subject_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to bulk upsert attempted questions
CREATE OR REPLACE FUNCTION record_attempted_questions(
  p_user_id UUID,
  p_subject_id UUID,
  p_question_ids UUID[]
)
RETURNS INTEGER AS $$
DECLARE
  inserted_count INTEGER;
BEGIN
  INSERT INTO public.user_attempted_questions (user_id, subject_id, question_id)
  SELECT p_user_id, p_subject_id, unnest(p_question_ids)
  ON CONFLICT (user_id, subject_id, question_id) 
  DO UPDATE SET 
    attempt_count = public.user_attempted_questions.attempt_count + 1,
    last_attempted_at = NOW();
  
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get attempted question count for a user in a subject
CREATE OR REPLACE FUNCTION get_attempted_question_count(
  p_user_id UUID,
  p_subject_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  count_result INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO count_result
  FROM public.user_attempted_questions
  WHERE user_id = p_user_id
    AND subject_id = p_subject_id;
  
  RETURN count_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.user_attempted_questions IS 
'Tracks which questions each user has attempted per subject to prevent repetition';

COMMENT ON FUNCTION get_unattempted_questions IS 
'Returns random unattempted question IDs for a user in a subject, optionally filtered by topics';

COMMENT ON FUNCTION reset_user_attempted_questions IS 
'Clears all attempted question tracking for a user in a subject (used when pool is exhausted)';

COMMENT ON FUNCTION record_attempted_questions IS 
'Bulk upsert to record questions as attempted, incrementing count for repeats';

COMMENT ON FUNCTION get_attempted_question_count IS 
'Returns the count of attempted questions for a user in a subject';

