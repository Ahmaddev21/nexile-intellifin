-- PART 1: UPDATE RLS POLICIES
-- Run this first.

-- 1. Helper Function: Check if user is an ADMIN
create or replace function public.is_app_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.company_users 
    where user_id = auth.uid() 
    and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- 2. Update Policies for Invoices
-- Drop OLD name if it exists
drop policy if exists "Admins can update invoices" on public.invoices;
-- Drop NEW name if it exists (to prevent 'policy already exists' error)
drop policy if exists "Users can update invoices" on public.invoices;

create policy "Users can update invoices"
on public.invoices for update
using ( auth.uid() = user_id or public.is_app_admin() OR exists (select 1 from public.company_users where user_id = auth.uid()) );

-- 3. Update Policies for Expenses
drop policy if exists "Admins can update expenses" on public.expenses;
drop policy if exists "Users can update expenses" on public.expenses;

create policy "Users can update expenses"
on public.expenses for update
using ( auth.uid() = user_id or public.is_app_admin() OR exists (select 1 from public.company_users where user_id = auth.uid()) );

-- 4. Update Policies for Payable Invoices
drop policy if exists "Admins can update payable invoices" on public.payable_invoices;
drop policy if exists "Users can update payable invoices" on public.payable_invoices;

create policy "Users can update payable invoices"
on public.payable_invoices for update
using ( auth.uid() = user_id or public.is_app_admin() OR exists (select 1 from public.company_users where user_id = auth.uid()) );

-- 5. Update Policies for Credit Notes
drop policy if exists "Admins can update credit notes" on public.credit_notes;
drop policy if exists "Users can update credit notes" on public.credit_notes;

create policy "Users can update credit notes"
on public.credit_notes for update
using ( auth.uid() = user_id or public.is_app_admin() OR exists (select 1 from public.company_users where user_id = auth.uid()) );
