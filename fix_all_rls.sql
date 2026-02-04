-- COMPREHENSIVE RLS FIX
-- Run this to reset and fix all permission issues with Company Creation & Updates

-- 1. Reset Policies for COMPANIES table
alter table public.companies enable row level security;

-- Allow reading companies if you are a member
drop policy if exists "Company members can view company" on public.companies;
create policy "Company members can view company"
on public.companies for select
using (
    id in (
        select company_id from public.company_users 
        where user_id = auth.uid()
    )
);

-- Allow admins to UPDATE their company (This was likely the missing one)
drop policy if exists "Company admins can update company" on public.companies;
create policy "Company admins can update company"
on public.companies for update
using (
    id in (
        select company_id from public.company_users 
        where user_id = auth.uid() 
        and role = 'admin'
    )
);

-- Allow initially creating a company (The RPC function 'create_company_with_admin' handles this with 'security definer', so strictly speaking an INSERT policy isn't needed for the table if going through RPC, but good to have for direct access if logic changes)
drop policy if exists "Users can create companies" on public.companies;
create policy "Users can create companies"
on public.companies for insert
with check ( auth.uid() = user_id );


-- 2. Reset Policies for COMPANY_USERS table
alter table public.company_users enable row level security;

-- Allow reading members of your own company
drop policy if exists "Users can view members of their company" on public.company_users;
create policy "Users can view members of their company"
on public.company_users for select
using (
    company_id in (
        select company_id from public.company_users 
        where user_id = auth.uid()
    )
);

-- Note: Inserting into company_users is handled by the 'security definer' functions (join/create), so we don't need open INSERT policies, which is safer.
