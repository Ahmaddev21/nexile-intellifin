-- CRITICAL FIX: Add project_id to credit_notes if missing
-- This will fix the "Could not find the 'project_id' column" error.

DO $$ 
BEGIN
    -- 1. Ensure project_id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'credit_notes' 
        AND column_name = 'project_id'
    ) THEN
        ALTER TABLE public.credit_notes 
        ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added project_id column';
    END IF;

    -- 2. Ensure invoice_id column is NOT NULL (if not already)
    -- This ensures relational integrity for the new standalone model.
    ALTER TABLE public.credit_notes ALTER COLUMN invoice_id SET NOT NULL;

    -- 3. Ensure user_id column exists and is NOT NULL
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'credit_notes' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.credit_notes 
        ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

END $$;

-- Verify the result
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'credit_notes'
ORDER BY ordinal_position;
