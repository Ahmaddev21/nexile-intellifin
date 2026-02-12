-- Step 1: Force Create the 'finance_attachments' bucket
-- We use ON CONFLICT to avoid errors if it miraculously exists but is broken
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
    'finance_attachments', 
    'finance_attachments', 
    false, -- Private bucket (authenticated only)
    false,
    2097152, -- 2MB limit (just in case, though frontend limits to 200KB)
    ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET 
    public = false,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'application/pdf'];

-- IMPORTANT: The previous script failed because it tried to ENABLE RLS on storage.objects, which is a system table.
-- RLS is already enabled by default on storage.objects in Supabase. We skip that step.

-- Step 2: Re-apply Policies
-- We wrap DROP in a block to avoid errors if policies don't exist
DO $$
BEGIN
    BEGIN
        DROP POLICY "Allow authenticated uploads" ON storage.objects;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
        DROP POLICY "Allow authenticated view" ON storage.objects;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
        DROP POLICY "Allow authenticated delete" ON storage.objects;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
END $$;

-- Policy: INSERT
-- Users can only upload to their company's folder: {company_id}/{record_type}/{record_id}/{filename}
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'finance_attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM public.company_users WHERE user_id = auth.uid()
  )
);

-- Policy: SELECT
-- Users can view files in their company's folder
CREATE POLICY "Allow authenticated view"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'finance_attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM public.company_users WHERE user_id = auth.uid()
  )
);

-- Policy: DELETE
-- Users can delete files in their company's folder
CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'finance_attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM public.company_users WHERE user_id = auth.uid()
  )
);
