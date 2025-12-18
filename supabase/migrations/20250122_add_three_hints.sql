-- SABIPREP Three Hints Enhancement Migration
-- Add support for progressive hints (hint1, hint2, hint3) in practice mode
-- Date: 2025-01-22

-- ============================================
-- ADD THREE HINT COLUMNS TO QUESTIONS TABLE
-- ============================================

-- Add hint1, hint2, hint3 columns for progressive hint system
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS hint1 TEXT;

ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS hint2 TEXT;

ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS hint3 TEXT;

-- ============================================
-- MIGRATE EXISTING HINT DATA
-- ============================================

-- Migrate existing hint data to hint1 for backward compatibility
-- Only migrate if hint1 is NULL and hint has a value
UPDATE public.questions
SET hint1 = hint
WHERE hint1 IS NULL 
  AND hint IS NOT NULL 
  AND hint != '';

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Index for questions with hints (useful for filtering)
CREATE INDEX IF NOT EXISTS idx_questions_with_hints 
ON public.questions(hint1, hint2, hint3) 
WHERE hint1 IS NOT NULL OR hint2 IS NOT NULL OR hint3 IS NOT NULL;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN public.questions.hint1 IS 
'First level hint - provides broad guidance to help students get started. This is the least specific hint.';

COMMENT ON COLUMN public.questions.hint2 IS 
'Second level hint - provides more specific guidance. Students should see hint1 before accessing hint2.';

COMMENT ON COLUMN public.questions.hint3 IS 
'Third level hint - provides near-complete guidance. Students should see hint1 and hint2 before accessing hint3.';

-- ============================================
-- MIGRATION VERIFICATION
-- ============================================

-- Verify all new columns exist
DO $$
DECLARE
  missing_columns TEXT[];
BEGIN
  SELECT ARRAY_AGG(column_name)
  INTO missing_columns
  FROM (
    SELECT unnest(ARRAY['hint1', 'hint2', 'hint3']) AS column_name
  ) expected
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'questions'
    AND information_schema.columns.column_name = expected.column_name
  );
  
  IF missing_columns IS NOT NULL THEN
    RAISE EXCEPTION 'Migration failed: Missing columns: %', array_to_string(missing_columns, ', ');
  ELSE
    RAISE NOTICE 'Migration successful: All hint columns added to questions table';
  END IF;
END $$;
