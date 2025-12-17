-- SABIPREP Questions Enhancement Migration
-- Phase 1: Add support for comprehension passages and images
-- Date: 2025-01-17

-- ============================================
-- ADD NEW COLUMNS TO QUESTIONS TABLE
-- ============================================

-- Add passage_id for grouping questions that share a comprehension passage
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS passage_id TEXT;

-- Add image accessibility and dimension fields
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS image_alt_text TEXT;

ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS image_width INTEGER;

ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS image_height INTEGER;

-- Add passage field if it doesn't exist (backward compatibility check)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'questions' 
    AND column_name = 'passage'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN passage TEXT;
  END IF;
END $$;

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Index on passage_id for efficient grouping of related questions
CREATE INDEX IF NOT EXISTS idx_questions_passage_id 
ON public.questions(passage_id) 
WHERE passage_id IS NOT NULL;

-- Composite index for filtered queries (subject + topic + passage)
CREATE INDEX IF NOT EXISTS idx_questions_subject_topic_passage 
ON public.questions(subject_id, topic_id, passage_id) 
WHERE passage_id IS NOT NULL;

-- Index for questions with images (useful for image management queries)
CREATE INDEX IF NOT EXISTS idx_questions_with_images 
ON public.questions(question_image_url) 
WHERE question_image_url IS NOT NULL;

-- ============================================
-- ADD CONSTRAINTS FOR DATA INTEGRITY
-- ============================================

-- Ensure image dimensions are positive if provided
ALTER TABLE public.questions 
ADD CONSTRAINT check_image_width_positive 
CHECK (image_width IS NULL OR image_width > 0);

ALTER TABLE public.questions 
ADD CONSTRAINT check_image_height_positive 
CHECK (image_height IS NULL OR image_height > 0);

-- Ensure alt text is provided when image URL exists (accessibility requirement)
-- Note: This is a soft constraint via a check that allows NULL or requires both
ALTER TABLE public.questions 
ADD CONSTRAINT check_image_alt_text 
CHECK (
  (question_image_url IS NULL AND image_alt_text IS NULL) OR
  (question_image_url IS NOT NULL)
);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN public.questions.passage_id IS 
'Identifier for grouping questions that share a comprehension passage. Questions with the same passage_id belong to the same passage-based question set.';

COMMENT ON COLUMN public.questions.passage IS 
'The comprehension passage text that questions may reference. Multiple questions can share the same passage via passage_id.';

COMMENT ON COLUMN public.questions.image_alt_text IS 
'Accessibility text describing the question image for screen readers and when images fail to load.';

COMMENT ON COLUMN public.questions.image_width IS 
'Original width of the question image in pixels, used for responsive rendering and aspect ratio calculation.';

COMMENT ON COLUMN public.questions.image_height IS 
'Original height of the question image in pixels, used for responsive rendering and aspect ratio calculation.';

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
    SELECT unnest(ARRAY['passage_id', 'image_alt_text', 'image_width', 'image_height', 'passage']) AS column_name
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
    RAISE NOTICE 'Migration successful: All columns added to questions table';
  END IF;
END $$;