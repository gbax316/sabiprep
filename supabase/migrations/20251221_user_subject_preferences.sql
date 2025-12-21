-- SABIPREP User Subject Preferences Schema
-- Migration for user subject preferences

-- ============================================
-- USER_SUBJECT_PREFERENCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_subject_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, subject_id) -- One preference per user per subject
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subject_preferences_user_id ON public.user_subject_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subject_preferences_subject_id ON public.user_subject_preferences(subject_id);

-- RLS Policies
ALTER TABLE public.user_subject_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view their own preferences"
  ON public.user_subject_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert their own preferences"
  ON public.user_subject_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete their own preferences"
  ON public.user_subject_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

