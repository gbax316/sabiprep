-- SABIPREP Storage Bucket Configuration
-- Bucket for question images with proper access controls
-- Date: 2025-01-17

-- ============================================
-- CREATE STORAGE BUCKET
-- ============================================

-- Create the question-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'question-images',
  'question-images',
  true, -- Public bucket for reading
  5242880, -- 5MB file size limit (5 * 1024 * 1024 bytes)
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on storage.objects for the question-images bucket
-- Note: RLS is enabled by default on storage.objects

-- Policy 1: Allow public SELECT (read) access to all images
DROP POLICY IF EXISTS "Public read access for question images" ON storage.objects;
CREATE POLICY "Public read access for question images"
ON storage.objects FOR SELECT
USING (bucket_id = 'question-images');

-- Policy 2: Allow authenticated admin users to INSERT (upload) images
DROP POLICY IF EXISTS "Admin insert access for question images" ON storage.objects;
CREATE POLICY "Admin insert access for question images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'question-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Policy 3: Allow authenticated admin users to UPDATE images
DROP POLICY IF EXISTS "Admin update access for question images" ON storage.objects;
CREATE POLICY "Admin update access for question images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'question-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'question-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Policy 4: Allow authenticated admin users to DELETE images
DROP POLICY IF EXISTS "Admin delete access for question images" ON storage.objects;
CREATE POLICY "Admin delete access for question images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'question-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- ============================================
-- HELPER FUNCTION FOR IMAGE URL GENERATION
-- ============================================

-- Function to generate public URL for question images
CREATE OR REPLACE FUNCTION public.get_question_image_url(image_path TEXT)
RETURNS TEXT AS $$
DECLARE
  base_url TEXT;
BEGIN
  -- Get the Supabase project URL from settings
  -- In production, this should be configured via environment variables
  SELECT current_setting('app.settings.supabase_url', true) INTO base_url;
  
  -- If not set, return a relative path
  IF base_url IS NULL OR base_url = '' THEN
    RETURN '/storage/v1/object/public/question-images/' || image_path;
  END IF;
  
  -- Return full public URL
  RETURN base_url || '/storage/v1/object/public/question-images/' || image_path;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON FUNCTION public.get_question_image_url(TEXT) IS 
'Generates a public URL for a question image stored in the question-images bucket. Accepts the image path/filename and returns the full public URL.';

-- ============================================
-- BUCKET CONFIGURATION VERIFICATION
-- ============================================

DO $$
DECLARE
  bucket_exists BOOLEAN;
  bucket_config RECORD;
BEGIN
  -- Check if bucket exists
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'question-images'
  ) INTO bucket_exists;
  
  IF NOT bucket_exists THEN
    RAISE EXCEPTION 'Storage bucket creation failed: question-images bucket does not exist';
  END IF;
  
  -- Verify bucket configuration
  SELECT public, file_size_limit, allowed_mime_types
  INTO bucket_config
  FROM storage.buckets
  WHERE id = 'question-images';
  
  -- Verify settings
  IF NOT bucket_config.public THEN
    RAISE WARNING 'Bucket is not public - read access may be restricted';
  END IF;
  
  IF bucket_config.file_size_limit != 5242880 THEN
    RAISE WARNING 'File size limit is % bytes, expected 5242880 bytes (5MB)', bucket_config.file_size_limit;
  END IF;
  
  RAISE NOTICE 'Storage bucket configuration successful:';
  RAISE NOTICE '  - Bucket: question-images';
  RAISE NOTICE '  - Public: %', bucket_config.public;
  RAISE NOTICE '  - File size limit: % bytes (%.2f MB)', bucket_config.file_size_limit, bucket_config.file_size_limit::NUMERIC / 1048576;
  RAISE NOTICE '  - Allowed MIME types: %', bucket_config.allowed_mime_types;
END $$;