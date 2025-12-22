-- SABIPREP Question Reviews Migration
-- Add support for AI-powered question review system
-- Date: 2025-01-24

-- ============================================
-- CREATE QUESTION_REVIEWS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.question_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  reviewed_by UUID NOT NULL REFERENCES public.users(id),
  review_type TEXT NOT NULL CHECK (review_type IN ('single', 'batch')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'failed')),
  
  -- Generated content (stored before approval)
  proposed_hint1 TEXT,
  proposed_hint2 TEXT,
  proposed_hint3 TEXT,
  proposed_solution TEXT,
  proposed_explanation TEXT,
  
  -- Approval metadata
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  -- LLM metadata
  model_used TEXT DEFAULT 'claude-3-5-sonnet-20241022',
  tokens_used INTEGER,
  review_duration_ms INTEGER,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_question_reviews_question_id ON public.question_reviews(question_id);
CREATE INDEX IF NOT EXISTS idx_question_reviews_status ON public.question_reviews(status);
CREATE INDEX IF NOT EXISTS idx_question_reviews_reviewed_by ON public.question_reviews(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_question_reviews_approved_by ON public.question_reviews(approved_by);
CREATE INDEX IF NOT EXISTS idx_question_reviews_created_at ON public.question_reviews(created_at DESC);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.question_reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all reviews
CREATE POLICY "Admins can view all reviews"
  ON public.question_reviews
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Admins can insert reviews
CREATE POLICY "Admins can insert reviews"
  ON public.question_reviews
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    AND reviewed_by = auth.uid()
  );

-- Policy: Admins can update reviews
CREATE POLICY "Admins can update reviews"
  ON public.question_reviews
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================
-- CREATE TRIGGER FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_question_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER question_reviews_updated_at
  BEFORE UPDATE ON public.question_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_question_reviews_updated_at();

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE public.question_reviews IS 
'Stores AI-generated review proposals for questions, including hints, solutions, and explanations. Reviews must be approved before being applied to questions.';

COMMENT ON COLUMN public.question_reviews.proposed_hint1 IS 
'First level hint - broad guidance (proposed by AI, pending approval)';

COMMENT ON COLUMN public.question_reviews.proposed_hint2 IS 
'Second level hint - more specific guidance (proposed by AI, pending approval)';

COMMENT ON COLUMN public.question_reviews.proposed_hint3 IS 
'Third level hint - near-complete guidance (proposed by AI, pending approval)';

COMMENT ON COLUMN public.question_reviews.proposed_solution IS 
'Step-by-step solution (proposed by AI, pending approval)';

COMMENT ON COLUMN public.question_reviews.proposed_explanation IS 
'Detailed explanation for non-mathematics subjects (proposed by AI, pending approval)';

COMMENT ON COLUMN public.question_reviews.status IS 
'Review status: pending (awaiting approval), approved (applied to question), rejected (not applied), failed (AI generation failed)';

