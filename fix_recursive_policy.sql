-- ============================================
-- FIX RECURSIVE RLS ON COMPANY_USERS
-- ============================================
-- Run this in Supabase SQL Editor

-- 1. Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view members of their company" ON company_users;

-- 2. Create a simpler, non-recursive policy
-- Only allow users to view their OWN mapping.
-- This is sufficient for login (finding their own company) and avoids infinite loops.
CREATE POLICY "Users can view own company membership" 
ON company_users 
FOR SELECT 
USING ( auth.uid() = user_id );

-- 3. Also allow viewing members IF user is a verified admin (via function)
-- Note: 'is_company_admin' must NOT query company_users directly in a way that recurses
-- For now, the simple policy above is safest to unblock login.

-- 4. Verify policies
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies 
WHERE tablename = 'company_users';
