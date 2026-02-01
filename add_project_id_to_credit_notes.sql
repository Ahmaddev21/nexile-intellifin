-- Migration to add project_id column to credit_notes table
-- Run this in Supabase SQL Editor

-- Add project_id column to credit_notes if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'credit_notes' 
        AND column_name = 'project_id'
    ) THEN
        ALTER TABLE public.credit_notes 
        ADD COLUMN project_id uuid REFERENCES public.projects ON DELETE SET NULL;
        
        RAISE NOTICE 'Added project_id column to credit_notes table';
    ELSE
        RAISE NOTICE 'project_id column already exists in credit_notes table';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'credit_notes'
ORDER BY ordinal_position;
