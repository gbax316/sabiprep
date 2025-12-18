-- SABIPREP User Goals Schema
-- Migration for user goal tracking

-- ============================================
-- USER_GOALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL CHECK (goal_type IN (
    'weekly_study_time',
    'daily_questions',
    'weekly_questions',
    'accuracy_target',
    'streak_target'
  )),
  target_value INTEGER NOT NULL, -- Target value (minutes for study_time, count for questions, percentage for accuracy, days for streak)
  current_value INTEGER DEFAULT 0, -- Current progress value
  period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- When this goal period started
  period_end TIMESTAMP WITH TIME ZONE, -- When this goal period ends (null for ongoing goals)
  achieved BOOLEAN DEFAULT FALSE,
  achieved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, goal_type) -- One goal per type per user
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON public.user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_type ON public.user_goals(user_id, goal_type);
CREATE INDEX IF NOT EXISTS idx_user_goals_achieved ON public.user_goals(user_id, achieved);

-- RLS Policies
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

-- Users can view their own goals
CREATE POLICY "Users can view their own goals"
  ON public.user_goals
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own goals
CREATE POLICY "Users can insert their own goals"
  ON public.user_goals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own goals
CREATE POLICY "Users can update their own goals"
  ON public.user_goals
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to update goal progress
CREATE OR REPLACE FUNCTION public.update_goal_progress(
  user_uuid UUID,
  goal_type_param TEXT,
  increment_value INTEGER DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
  current_goal RECORD;
  new_value INTEGER;
BEGIN
  -- Get current goal
  SELECT * INTO current_goal
  FROM public.user_goals
  WHERE user_id = user_uuid AND goal_type = goal_type_param;

  -- If goal doesn't exist, return
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- If already achieved, return
  IF current_goal.achieved THEN
    RETURN;
  END IF;

  -- Update current value
  new_value := current_goal.current_value + increment_value;

  UPDATE public.user_goals
  SET current_value = new_value,
      updated_at = NOW()
  WHERE id = current_goal.id;

  -- Check if goal is achieved
  IF new_value >= current_goal.target_value THEN
    UPDATE public.user_goals
    SET achieved = TRUE,
        achieved_at = NOW()
    WHERE id = current_goal.id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset weekly/daily goals
CREATE OR REPLACE FUNCTION public.reset_periodic_goals()
RETURNS VOID AS $$
BEGIN
  -- Reset weekly goals (study_time, weekly_questions) - runs on Monday
  UPDATE public.user_goals
  SET current_value = 0,
      achieved = FALSE,
      achieved_at = NULL,
      period_start = NOW(),
      period_end = NOW() + INTERVAL '7 days',
      updated_at = NOW()
  WHERE goal_type IN ('weekly_study_time', 'weekly_questions')
    AND (period_end IS NULL OR period_end < NOW());

  -- Reset daily goals (daily_questions) - runs daily
  UPDATE public.user_goals
  SET current_value = 0,
      achieved = FALSE,
      achieved_at = NULL,
      period_start = NOW(),
      period_end = NOW() + INTERVAL '1 day',
      updated_at = NOW()
  WHERE goal_type = 'daily_questions'
    AND (period_end IS NULL OR period_end < NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE public.user_goals IS 'User-defined learning goals (study time, questions, accuracy, streaks)';
COMMENT ON COLUMN public.user_goals.goal_type IS 'Type of goal (weekly_study_time, daily_questions, etc.)';
COMMENT ON COLUMN public.user_goals.target_value IS 'Target value (minutes for study_time, count for questions, percentage for accuracy, days for streak)';
COMMENT ON COLUMN public.user_goals.current_value IS 'Current progress toward goal';
