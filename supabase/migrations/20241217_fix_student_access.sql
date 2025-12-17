-- SABIPREP Fix Student Access Migration
-- Migration: 20241217_fix_student_access.sql
-- 
-- This migration fixes a critical issue where students cannot view questions.
-- The admin schema migration (20241216_admin_schema.sql) dropped the original
-- "Anyone can view questions" policy but only created a policy for admins/tutors,
-- leaving students unable to access any questions.
--
-- This migration:
-- 1. Drops the existing admin-only view policy
-- 2. Creates a policy for students to view published questions
-- 3. Creates a policy for admins/tutors to view all questions
-- 4. Updates existing questions from 'draft' to 'published' status
-- 5. Ensures all subjects and topics have 'active' status

-- ============================================
-- FIX QUESTIONS RLS POLICIES
-- ============================================

-- Drop existing view policy (if exists) to recreate with proper permissions
DROP POLICY IF EXISTS "Admins can view all questions" ON public.questions;
DROP POLICY IF EXISTS "Students can view published questions" ON public.questions;
DROP POLICY IF EXISTS "Anyone can view questions" ON public.questions;

-- Create policy for students (and all authenticated users) to view PUBLISHED questions only
-- This allows students to access questions that have been reviewed and published
CREATE POLICY "Students can view published questions" ON public.questions
  FOR SELECT
  USING (status = 'published');

-- Create policy for admins and tutors to view ALL questions (draft, published, archived)
-- This allows content managers to review and manage all questions regardless of status
CREATE POLICY "Admins can view all questions" ON public.questions
  FOR SELECT
  USING (public.is_admin_or_tutor());

-- ============================================
-- UPDATE EXISTING DATA TO PUBLISHED STATUS
-- ============================================

-- Update all existing questions from 'draft' to 'published'
-- This ensures seed data and any existing questions are visible to students
UPDATE public.questions 
SET status = 'published' 
WHERE status = 'draft';

-- ============================================
-- ENSURE SUBJECTS HAVE ACTIVE STATUS
-- ============================================

-- Update subjects that have NULL status or non-active status to 'active'
-- This ensures all subjects are visible to students
UPDATE public.subjects 
SET status = 'active' 
WHERE status IS NULL OR status != 'active';

-- ============================================
-- ENSURE TOPICS HAVE ACTIVE STATUS
-- ============================================

-- Update topics that have NULL status or non-active status to 'active'
-- This ensures all topics are visible to students
UPDATE public.topics 
SET status = 'active' 
WHERE status IS NULL OR status != 'active';

-- ============================================
-- VERIFICATION COMMENT
-- ============================================
-- After running this migration, verify with:
-- SELECT COUNT(*) FROM public.questions WHERE status = 'published';
-- SELECT COUNT(*) FROM public.subjects WHERE status = 'active';
-- SELECT COUNT(*) FROM public.topics WHERE status = 'active';