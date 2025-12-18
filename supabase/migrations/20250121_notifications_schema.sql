-- SABIPREP Notifications Schema
-- Migration for user notifications system

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'achievement_unlocked',
    'streak_milestone',
    'session_completed',
    'goal_achieved',
    'daily_reminder',
    'new_content',
    'student_progress',
    'student_achievement',
    'new_signup',
    'import_completed',
    'system_alert',
    'content_review'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Additional data (e.g., session_id, achievement_id, etc.)
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- RLS Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- System can create notifications for users
CREATE POLICY "System can create notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.notifications
  SET read = TRUE,
      read_at = NOW()
  WHERE id = notification_uuid AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.notifications
  SET read = TRUE,
      read_at = NOW()
  WHERE user_id = user_uuid AND read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE public.notifications IS 'User notifications for achievements, milestones, and system updates';
COMMENT ON COLUMN public.notifications.type IS 'Type of notification (achievement_unlocked, streak_milestone, etc.)';
COMMENT ON COLUMN public.notifications.data IS 'Additional JSON data for the notification (session_id, achievement_id, etc.)';
