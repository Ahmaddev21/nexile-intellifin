-- ============================================
-- FIX: Allow users to READ their company's subscription
-- ============================================
-- Run this in Supabase SQL Editor

-- First, ensure RLS is enabled on subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing select policy if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their company subscription" ON subscriptions;

-- Allow any authenticated user to read subscriptions for their company
CREATE POLICY "Users can view their company subscription"
ON subscriptions
FOR SELECT
USING (
    company_id IN (
        SELECT cu.company_id 
        FROM company_users cu 
        WHERE cu.user_id = auth.uid()
    )
);

-- Verify: check that policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'subscriptions';
