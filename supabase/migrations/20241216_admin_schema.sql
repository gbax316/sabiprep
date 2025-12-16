-- SABIPREP Admin Portal Database Schema
-- Migration: 20241216_admin_schema.sql
-- This migration adds admin functionality to the existing schema

-- ============================================
-- USER ROLE SYSTEM
-- ============================================

-- Create user role enum type
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'tutor', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add role column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'student';

-- Add status column to users table
DO $$ BEGIN
  ALTER TABLE public.users 
  ADD COLUMN status TEXT NOT NULL DEFAULT 'active' 
  CHECK (status IN ('active', 'suspended', 'deleted'));
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

-- ============================================
-- QUESTION STATUS ENHANCEMENT
-- ============================================

-- Add status to questions table
DO $$ BEGIN
  ALTER TABLE public.questions 
  ADD COLUMN status TEXT NOT NULL DEFAULT 'draft' 
  CHECK (status IN ('draft', 'published', 'archived'));
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Add passage column for comprehension questions
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS passage TEXT;

-- Add option_e for 5-option questions (optional)
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS option_e TEXT;

-- Modify correct_answer constraint for E option
-- First drop existing constraint if exists
DO $$ BEGIN
  ALTER TABLE public.questions 
  DROP CONSTRAINT IF EXISTS questions_correct_answer_check;
EXCEPTION
  WHEN undefined_object THEN null;
END $$;

ALTER TABLE public.questions 
ADD CONSTRAINT questions_correct_answer_check 
CHECK (correct_answer IN ('A', 'B', 'C', 'D', 'E'));

-- Add solution field (detailed worked solution)
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS solution TEXT;

-- Add further_study_links
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS further_study_links TEXT[];

-- Add created_by field to track who added the question
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);

-- Create index for question status
CREATE INDEX IF NOT EXISTS idx_questions_status ON public.questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_created_by ON public.questions(created_by);

-- ============================================
-- ADMIN AUDIT LOGS TABLE
-- ============================================

-- Create admin_audit_logs table for tracking all admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'user', 'question', 'subject', 'topic', 'import'
  entity_id UUID,
  details JSONB, -- Stores before/after states or additional context
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON public.admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.admin_audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- IMPORT REPORTS TABLE
-- ============================================

-- Create import_reports table for CSV import history
CREATE TABLE IF NOT EXISTS public.import_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  file_size_bytes INTEGER,
  total_rows INTEGER NOT NULL DEFAULT 0,
  successful_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_details JSONB, -- Array of row-level errors
  import_type TEXT NOT NULL, -- 'questions', 'users', 'subjects', 'topics'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for import queries
CREATE INDEX IF NOT EXISTS idx_import_reports_admin_id ON public.import_reports(admin_id);
CREATE INDEX IF NOT EXISTS idx_import_reports_status ON public.import_reports(status);
CREATE INDEX IF NOT EXISTS idx_import_reports_created_at ON public.import_reports(created_at DESC);

-- Enable RLS
ALTER TABLE public.import_reports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ENHANCED SUBJECT AND TOPIC TABLES
-- ============================================

-- Add status to subjects
DO $$ BEGIN
  ALTER TABLE public.subjects 
  ADD COLUMN status TEXT NOT NULL DEFAULT 'active' 
  CHECK (status IN ('active', 'inactive'));
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Add status to topics
DO $$ BEGIN
  ALTER TABLE public.topics 
  ADD COLUMN status TEXT NOT NULL DEFAULT 'active' 
  CHECK (status IN ('active', 'inactive'));
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Add display_order for sorting
ALTER TABLE public.subjects 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

ALTER TABLE public.topics 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin or tutor
CREATE OR REPLACE FUNCTION public.is_admin_or_tutor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'tutor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to log admin action
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.admin_audit_logs (
    admin_id,
    action,
    entity_type,
    entity_id,
    details,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_details,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FIRST ADMIN SETUP FUNCTION
-- ============================================

-- Create function for first admin setup
CREATE OR REPLACE FUNCTION public.setup_first_admin(admin_email TEXT)
RETURNS VOID AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  -- Check if any admins exist
  SELECT COUNT(*) INTO admin_count 
  FROM public.users 
  WHERE role = 'admin';
  
  IF admin_count > 0 THEN
    RAISE EXCEPTION 'Admin already exists. Use the admin panel to create additional admins.';
  END IF;
  
  -- Promote the user with given email to admin
  UPDATE public.users 
  SET role = 'admin' 
  WHERE email = admin_email;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User with email % not found. Please sign up first.', admin_email;
  END IF;
  
  RAISE NOTICE 'Successfully promoted % to admin', admin_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY POLICIES FOR ADMIN
-- ============================================

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Only admins can view import reports" ON public.import_reports;
DROP POLICY IF EXISTS "Admins can create import reports" ON public.import_reports;
DROP POLICY IF EXISTS "Admins can update import reports" ON public.import_reports;
DROP POLICY IF EXISTS "Admins can insert subjects" ON public.subjects;
DROP POLICY IF EXISTS "Admins can update subjects" ON public.subjects;
DROP POLICY IF EXISTS "Admins can delete subjects" ON public.subjects;
DROP POLICY IF EXISTS "Admins can insert topics" ON public.topics;
DROP POLICY IF EXISTS "Admins can update topics" ON public.topics;
DROP POLICY IF EXISTS "Admins can delete topics" ON public.topics;
DROP POLICY IF EXISTS "Admins can insert questions" ON public.questions;
DROP POLICY IF EXISTS "Admins can update questions" ON public.questions;
DROP POLICY IF EXISTS "Admins can delete questions" ON public.questions;
DROP POLICY IF EXISTS "Users can view published questions" ON public.questions;
DROP POLICY IF EXISTS "Admins can view all questions" ON public.questions;

-- Users table: Admins can view all users
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (public.is_admin());

-- Users table: Admins can update all users
CREATE POLICY "Admins can update all users" ON public.users
  FOR UPDATE USING (public.is_admin());

-- Audit logs table policies
CREATE POLICY "Only admins can view audit logs" ON public.admin_audit_logs
  FOR SELECT USING (public.is_admin());

-- System can insert audit logs (via authenticated users with admin/tutor role)
CREATE POLICY "System can insert audit logs" ON public.admin_audit_logs
  FOR INSERT WITH CHECK (public.is_admin_or_tutor());

-- Import reports table policies
CREATE POLICY "Only admins can view import reports" ON public.import_reports
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can create import reports" ON public.import_reports
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update import reports" ON public.import_reports
  FOR UPDATE USING (public.is_admin());

-- Subjects table: Admins can manage subjects
CREATE POLICY "Admins can insert subjects" ON public.subjects
  FOR INSERT WITH CHECK (public.is_admin_or_tutor());

CREATE POLICY "Admins can update subjects" ON public.subjects
  FOR UPDATE USING (public.is_admin_or_tutor());

CREATE POLICY "Admins can delete subjects" ON public.subjects
  FOR DELETE USING (public.is_admin());

-- Topics table: Admins can manage topics
CREATE POLICY "Admins can insert topics" ON public.topics
  FOR INSERT WITH CHECK (public.is_admin_or_tutor());

CREATE POLICY "Admins can update topics" ON public.topics
  FOR UPDATE USING (public.is_admin_or_tutor());

CREATE POLICY "Admins can delete topics" ON public.topics
  FOR DELETE USING (public.is_admin());

-- Questions table: Admins can manage questions
CREATE POLICY "Admins can insert questions" ON public.questions
  FOR INSERT WITH CHECK (public.is_admin_or_tutor());

CREATE POLICY "Admins can update questions" ON public.questions
  FOR UPDATE USING (public.is_admin_or_tutor());

CREATE POLICY "Admins can delete questions" ON public.questions
  FOR DELETE USING (public.is_admin());

-- Admins can view all questions (draft, published, archived)
CREATE POLICY "Admins can view all questions" ON public.questions
  FOR SELECT USING (public.is_admin_or_tutor());

-- ============================================
-- UPDATE HANDLE NEW USER FUNCTION
-- ============================================

-- Update the handle_new_user function to include role with default 'student'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'student',
    'active'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE public.admin_audit_logs IS 'Audit trail for all admin actions';
COMMENT ON TABLE public.import_reports IS 'CSV import history and reports';
COMMENT ON FUNCTION public.is_admin() IS 'Check if current user is an admin';
COMMENT ON FUNCTION public.is_admin_or_tutor() IS 'Check if current user is an admin or tutor';
COMMENT ON FUNCTION public.log_admin_action(TEXT, TEXT, UUID, JSONB, INET, TEXT) IS 'Log admin action to audit table';
COMMENT ON FUNCTION public.setup_first_admin(TEXT) IS 'Setup the first admin user (can only be run once)';
