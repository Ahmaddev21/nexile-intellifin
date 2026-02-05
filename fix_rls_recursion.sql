-- FIX RLS RECURSION causing API failures
-- The previous policy on company_users caused infinite recursion, causing queries to return null/fail.

-- 1. Drop the problematic recursive policy
drop policy if exists "Users can view members of their company" on public.company_users;

-- 2. Create the Security Definer helper to bypass RLS safely
-- This function runs as the database owner, bypassing RLS checks to prevent recursion
create or replace function public.check_is_member_safe(lookup_company_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.company_users cu
    where cu.company_id = lookup_company_id
    and cu.user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- 3. create the new non-recursive policy
create policy "Users can view members of their company"
on public.company_users for select
using (
    -- You can always see YOURSELF
    user_id = auth.uid() 
    OR 
    -- You can see others if you are a member of the same company (via safe function)
    public.check_is_member_safe(company_id)
);

-- 4. Also ensure 'companies' policy is robust
drop policy if exists "Company members can view company" on public.companies;
create policy "Company members can view company"
on public.companies for select
using (
    public.check_is_member_safe(id)
);
