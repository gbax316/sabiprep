-- Add import_report_id to questions table to link questions to their import batch
-- This allows tracking which questions came from which import

-- Add import_report_id column
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS import_report_id UUID REFERENCES public.import_reports(id) ON DELETE SET NULL;

-- Create index for efficient batch queries
CREATE INDEX IF NOT EXISTS idx_questions_import_report_id 
ON public.questions(import_report_id);

-- Add comment
COMMENT ON COLUMN public.questions.import_report_id IS 
'Links question to the import batch that created it. NULL for manually created questions.';
