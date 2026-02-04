-- FIX: Add missing UPDATE policy for companies
-- This allows Company Admins to update their company details (Name, Currency, etc.)

-- 1. Allow Admins to UPDATE their company
drop policy if exists "Company admins can update company" on public.companies;
create policy "Company admins can update company"
on public.companies for update
using (
    exists (
        select 1 from public.company_users cu
        where cu.company_id = companies.id
        and cu.user_id = auth.uid()
        and cu.role = 'admin'
    )
);

-- 2. Ensure RLS is enabled
alter table public.companies enable row level security;
