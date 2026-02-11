-- 1. Add attachment_url column to tables if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'attachment_url') THEN
        ALTER TABLE invoices ADD COLUMN attachment_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'attachment_url') THEN
        ALTER TABLE expenses ADD COLUMN attachment_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payable_invoices' AND column_name = 'attachment_url') THEN
        ALTER TABLE payable_invoices ADD COLUMN attachment_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'credit_notes' AND column_name = 'attachment_url') THEN
        ALTER TABLE credit_notes ADD COLUMN attachment_url TEXT;
    END IF;
END $$;

-- 2. Create Storage Bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('finance_attachments', 'finance_attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS for Storage
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated view" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;

-- Policy: INSERT
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
CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'finance_attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM public.company_users WHERE user_id = auth.uid()
  )
);
