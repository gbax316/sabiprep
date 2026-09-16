-- Migration: close the write-side authorization holes as one pattern
-- Task AUTH-01 in blueprint/TASKS.md. Findings SABI-REV-069, 002, 070, 018, 019.
-- Written 2026-09-16. Apply through the Supabase Dashboard SQL Editor.
--
-- THE PATTERN, which v2 is expected to copy:
--   1. Every RPC that writes on behalf of a user asserts auth.uid() = the user it writes for.
--   2. Every SECURITY DEFINER function pins its search_path.
--   3. EXECUTE on those functions is revoked from PUBLIC and anon, granted to authenticated.
--   4. Every table carrying user rows has RLS on, with owner-scoped read.
--   5. Client write access is granted only where the client is the legitimate author.
--      Anything the system awards is written by a SECURITY DEFINER function, never by the
--      browser, because a policy can check ownership but cannot check eligibility.
--
-- HONEST LIMIT, stated so nobody reads more into this than it does:
-- section 1 stops one student writing for another, and bounds self-inflation. It does not
-- eliminate self-inflation, because award_xp still trusts a client-supplied answer count.
-- Only server-side grading removes that, which is v2's job and the reason for the rebuild.
-- Decision D2 discards every number this touches at cutover, which is what makes a bound
-- proportionate here rather than a full fix.

BEGIN;

-- ============================================
-- 1. SCORING RPCs: assert the caller is who they claim to be
-- ============================================

-- award_xp: stays SECURITY INVOKER. It only writes the caller's own users row, and the
-- existing owner-scoped policy on public.users is the second layer. Signature is unchanged
-- so lib/api.ts:1529 and :2296 keep working.
CREATE OR REPLACE FUNCTION public.award_xp(
  user_uuid UUID,
  correct_answers_count INTEGER,
  is_daily_challenge BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  xp_earned INTEGER := 0;
  user_record RECORD;
  daily_bonus INTEGER := 0;
  streak_bonus INTEGER := 0;
  current_date_local DATE;
  safe_correct INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> user_uuid THEN
    RAISE EXCEPTION 'award_xp: not authorised to award XP for another user'
      USING ERRCODE = '42501';
  END IF;

-- Bound, not a rule. The question slider caps at maxQuestions, default 100
-- (components/learn/QuestionSlider.tsx:24), so 200 sits clear of any real session and still
-- turns unlimited forgery into grinding. Clamped rather than raised, so a legitimate oversized
-- call degrades instead of failing a student's session.
  safe_correct := LEAST(GREATEST(COALESCE(correct_answers_count, 0), 0), 200);

  SELECT xp_points, daily_xp_claimed_at, daily_xp_streak_bonus_claimed, streak_count, last_active_date
  INTO user_record
  FROM public.users
  WHERE id = user_uuid;

  current_date_local := CURRENT_DATE;

  xp_earned := safe_correct;

  IF user_record.daily_xp_claimed_at IS NULL OR user_record.daily_xp_claimed_at < current_date_local THEN
    daily_bonus := 2;
    xp_earned := xp_earned + daily_bonus;
  END IF;

  IF user_record.streak_count > 1 THEN
    IF user_record.daily_xp_streak_bonus_claimed = FALSE OR
       (user_record.daily_xp_claimed_at IS NOT NULL AND user_record.daily_xp_claimed_at < current_date_local) THEN
      streak_bonus := 1;
      xp_earned := xp_earned + streak_bonus;
    END IF;
  END IF;

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
$$;

-- check_and_award_mastery_badges: becomes SECURITY DEFINER on purpose. Section 4 below takes
-- INSERT on user_mastery_badges away from the client, so the award has to happen inside a
-- function that owns the eligibility check. Body is otherwise unchanged.
CREATE OR REPLACE FUNCTION public.check_and_award_mastery_badges(
  user_uuid UUID,
  subject_uuid UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  badge_count INTEGER := 0;
  user_xp INTEGER;
  user_correct_answers INTEGER;
  badge_record RECORD;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> user_uuid THEN
    RAISE EXCEPTION 'check_and_award_mastery_badges: not authorised to award badges for another user'
      USING ERRCODE = '42501';
  END IF;

  IF subject_uuid IS NULL THEN
    SELECT xp_points INTO user_xp
    FROM public.users
    WHERE id = user_uuid;

    FOR badge_record IN
      SELECT id, level, xp_requirement
      FROM public.mastery_badges
      WHERE xp_requirement <= user_xp
      ORDER BY level DESC
    LOOP
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
    SELECT COALESCE(SUM(questions_correct), 0) INTO user_correct_answers
    FROM public.user_progress
    WHERE user_id = user_uuid
    AND subject_id = subject_uuid;

    FOR badge_record IN
      SELECT id, level, correct_answers_requirement
      FROM public.mastery_badges
      WHERE correct_answers_requirement <= user_correct_answers
      ORDER BY level DESC
    LOOP
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
$$;

-- update_goal_progress: already SECURITY DEFINER, which is why it was the worst of the three.
-- It bypassed RLS entirely and took any user_uuid. Body otherwise unchanged.
CREATE OR REPLACE FUNCTION public.update_goal_progress(
  user_uuid UUID,
  goal_type_param TEXT,
  increment_value INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_goal RECORD;
  new_value INTEGER;
  safe_increment INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> user_uuid THEN
    RAISE EXCEPTION 'update_goal_progress: not authorised to update goals for another user'
      USING ERRCODE = '42501';
  END IF;

-- Non-negative only, deliberately not capped. weekly_study_time passes minutes
-- (lib/api.ts:1162), which can legitimately exceed any small ceiling, and a silent truncation
-- there would under-count real study. The auth.uid() assertion above is the actual fix.
  safe_increment := GREATEST(COALESCE(increment_value, 0), 0);

  SELECT * INTO current_goal
  FROM public.user_goals
  WHERE user_id = user_uuid AND goal_type = goal_type_param;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF current_goal.achieved THEN
    RETURN;
  END IF;

  new_value := current_goal.current_value + safe_increment;

  UPDATE public.user_goals
  SET current_value = new_value,
      updated_at = NOW()
  WHERE id = current_goal.id;

  IF new_value >= current_goal.target_value THEN
    UPDATE public.user_goals
    SET achieved = TRUE,
        achieved_at = NOW()
    WHERE id = current_goal.id;
  END IF;
END;
$$;

-- ============================================
-- 2. FUNCTION GRANTS: the first GRANT or REVOKE in this repo's 16 migrations
-- ============================================
-- Postgres grants EXECUTE on a new function to PUBLIC by default, so until now an anonymous
-- visitor could call update_goal_progress, a SECURITY DEFINER function, with no session.

REVOKE ALL ON FUNCTION public.award_xp(UUID, INTEGER, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.check_and_award_mastery_badges(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_goal_progress(UUID, TEXT, INTEGER) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.award_xp(UUID, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_award_mastery_badges(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_goal_progress(UUID, TEXT, INTEGER) TO authenticated;

-- ============================================
-- 3. SABI-REV-002: the two tables that never had RLS at all
-- ============================================
-- Re-confirmed live on 2026-09-16: an anonymous GET on user_mastery_badges returned real rows
-- carrying user_id values.

ALTER TABLE public.mastery_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mastery_badges ENABLE ROW LEVEL SECURITY;

-- mastery_badges is reference data: names, levels, XP thresholds. Public read, no client write.
DROP POLICY IF EXISTS "Anyone can view mastery badges" ON public.mastery_badges;
CREATE POLICY "Anyone can view mastery badges" ON public.mastery_badges
  FOR SELECT USING (true);

-- user_mastery_badges: owner reads, nobody writes from a client. The award path is
-- check_and_award_mastery_badges, which is SECURITY DEFINER as of section 1.
DROP POLICY IF EXISTS "Users can view their own mastery badges" ON public.user_mastery_badges;
CREATE POLICY "Users can view their own mastery badges" ON public.user_mastery_badges
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- 4. SABI-REV-070: achievements were self-awardable
-- ============================================
-- The INSERT policy checked ownership, not eligibility, so a student could insert any
-- achievement for themselves from dev tools. Dropping it costs nothing today: awardAchievement
-- and checkAndAwardAchievements at lib/api.ts:1597-1674 have zero callers (SABI-REV-073), so
-- no account has ever been awarded an achievement. v2 awards these from the server.

DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.user_achievements;

-- ============================================
-- 5. SABI-REV-018: any signed-in user could write into any other user's feed
-- ============================================
-- The INSERT policy was WITH CHECK (true). Owner-scoped now. This keeps the streak-milestone
-- notifications working, since those are written by the signed-in user for themselves. It does
-- break the daily-reminders cron's insert, which runs unauthenticated through the browser
-- client (SABI-REV-048). That cron has never delivered a notification anyway (SABI-REV-015),
-- and fixing it only partially would spam every student (SABI-REV-051), so it stays inert
-- deliberately. When it is fixed it moves to the service role, which bypasses RLS.

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Users can create their own notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 6. SABI-REV-019: a student could delete a daily challenge and cascade away
--    every other student's completion record
-- ============================================
-- user_daily_challenges.daily_challenge_id is ON DELETE CASCADE, so one student's regeneration
-- wiped everyone's completions for that challenge.
--
-- Removing UPDATE and DELETE needs no application change. forceGenerateDailyChallenge
-- (lib/api.ts:2430) is reachable from the student daily-challenge page and deletes before
-- inserting. Under RLS a DELETE with no policy removes zero rows and raises nothing, so the
-- function continues past its own warning at :2503, the INSERT then hits the
-- UNIQUE(subject_id, challenge_date) constraint, and the existing 23505 handler at :2575
-- fetches and returns the existing challenge. The page shows today's challenge instead of
-- regenerating it, which is the behaviour it should have had.
--
-- INSERT stays open to authenticated users because first generation of the day depends on it,
-- and the UNIQUE constraint already bounds it. It cascades nothing.

DROP POLICY IF EXISTS "Authenticated users can update daily challenges" ON public.daily_challenges;
DROP POLICY IF EXISTS "Authenticated users can delete daily challenges" ON public.daily_challenges;

COMMIT;

-- ============================================
-- VERIFICATION: run this after the migration and paste the result back
-- ============================================
-- Every row should read pass.
--
-- select * from (
--   select 1 as n, 'rls on mastery_badges' as check_name,
--     case when (select rowsecurity from pg_tables where schemaname='public' and tablename='mastery_badges') then 'pass' else 'FAIL' end as result
--   union all select 2, 'rls on user_mastery_badges',
--     case when (select rowsecurity from pg_tables where schemaname='public' and tablename='user_mastery_badges') then 'pass' else 'FAIL' end
--   union all select 3, 'no table left without rls',
--     case when not exists (select 1 from pg_tables where schemaname='public' and rowsecurity = false) then 'pass' else 'FAIL: see AUTH-02' end
--   union all select 4, 'user_achievements has no insert policy',
--     case when not exists (select 1 from pg_policies where schemaname='public' and tablename='user_achievements' and cmd='INSERT') then 'pass' else 'FAIL' end
--   union all select 5, 'notifications insert is owner-scoped',
--     case when exists (select 1 from pg_policies where schemaname='public' and tablename='notifications' and cmd='INSERT' and with_check like '%uid()%') then 'pass' else 'FAIL' end
--   union all select 6, 'daily_challenges has no update or delete policy',
--     case when not exists (select 1 from pg_policies where schemaname='public' and tablename='daily_challenges' and cmd in ('UPDATE','DELETE')) then 'pass' else 'FAIL' end
--   union all select 7, 'anon cannot execute the three scoring rpcs',
--     case when not exists (
--       select 1 from information_schema.role_routine_grants
--       where grantee in ('anon','PUBLIC') and specific_schema='public'
--         and routine_name in ('award_xp','check_and_award_mastery_badges','update_goal_progress')
--     ) then 'pass' else 'FAIL' end
--   union all select 8, 'all three rpcs pin search_path',
--     case when (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--                where n.nspname='public' and p.proname in ('award_xp','check_and_award_mastery_badges','update_goal_progress')
--                and p.proconfig::text like '%search_path%') = 3 then 'pass' else 'FAIL' end
-- ) checks order by n;
--
-- Then the probe that actually matters, from any terminal. It should return [] where it
-- previously returned rows carrying user_id values:
--
--   curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/user_mastery_badges?select=*" \
--        -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"

-- ============================================
-- DOWN: restores the prior state exactly, holes included
-- ============================================
-- BEGIN;
--   GRANT EXECUTE ON FUNCTION public.award_xp(UUID, INTEGER, BOOLEAN) TO PUBLIC, anon;
--   GRANT EXECUTE ON FUNCTION public.check_and_award_mastery_badges(UUID, UUID) TO PUBLIC, anon;
--   GRANT EXECUTE ON FUNCTION public.update_goal_progress(UUID, TEXT, INTEGER) TO PUBLIC, anon;
--   ALTER TABLE public.mastery_badges DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.user_mastery_badges DISABLE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS "Anyone can view mastery badges" ON public.mastery_badges;
--   DROP POLICY IF EXISTS "Users can view their own mastery badges" ON public.user_mastery_badges;
--   CREATE POLICY "Users can insert their own achievements" ON public.user_achievements
--     FOR INSERT WITH CHECK (auth.uid() = user_id);
--   DROP POLICY IF EXISTS "Users can create their own notifications" ON public.notifications;
--   CREATE POLICY "System can create notifications" ON public.notifications
--     FOR INSERT WITH CHECK (true);
--   CREATE POLICY "Authenticated users can update daily challenges" ON public.daily_challenges
--     FOR UPDATE USING (auth.role() = 'authenticated');
--   CREATE POLICY "Authenticated users can delete daily challenges" ON public.daily_challenges
--     FOR DELETE USING (auth.role() = 'authenticated');
-- COMMIT;
-- The three function bodies revert by re-running 20250125_fix_streak_and_add_xp.sql and
-- 20250121_user_goals_schema.sql, both of which are idempotent for these definitions.
