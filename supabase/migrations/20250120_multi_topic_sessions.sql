-- Migration: Add multi-topic support to sessions
-- This adds a topic_ids JSONB column to support multiple topics per session
-- while maintaining backward compatibility with the existing topic_id column

-- Add topic_ids column for multi-topic sessions
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS topic_ids JSONB DEFAULT NULL;

-- Add index for topic_ids queries
CREATE INDEX IF NOT EXISTS idx_sessions_topic_ids ON public.sessions USING GIN (topic_ids);

-- Add paused_at and last_question_index for pause/resume functionality
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_question_index INTEGER DEFAULT 0;

-- Update status enum to include 'paused'
ALTER TABLE public.sessions
DROP CONSTRAINT IF EXISTS sessions_status_check;

ALTER TABLE public.sessions
ADD CONSTRAINT sessions_status_check 
CHECK (status IN ('in_progress', 'paused', 'completed', 'abandoned'));

-- Add hint_level tracking to session_answers for progressive hints
ALTER TABLE public.session_answers
ADD COLUMN IF NOT EXISTS hint_level INTEGER DEFAULT NULL CHECK (hint_level IN (1, 2, 3)),
ADD COLUMN IF NOT EXISTS solution_viewed_before_attempt BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS first_attempt_correct BOOLEAN DEFAULT NULL;

-- Add index for hint_level queries
CREATE INDEX IF NOT EXISTS idx_session_answers_hint_level ON public.session_answers(hint_level);

-- Add topic_id to session_answers for topic-specific analytics
ALTER TABLE public.session_answers
ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_session_answers_topic_id ON public.session_answers(topic_id);
