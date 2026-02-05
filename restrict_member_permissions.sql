-- RESTRICT MEMBER PERMISSIONS
-- Goal: Members can VIEW and INSERT (Data Entry), but cannot UPDATE or DELETE financial records.
-- Admins retain full access.

-- 1. Helper Function: Check if user is an ADMIN of the company
create or replace function public.is_company_admin(lookup_company_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.company_users cu
    where cu.company_id = lookup_company_id
    and cu.user_id = auth.uid()
    and cu.role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- 2. Update Policies for INVOICES
-- DROP existing update/delete policies to be safe
drop policy if exists "Company members can update invoices" on public.invoices;
drop policy if exists "Company members can delete invoices" on public.invoices;

-- CREATE new restricted policies
create policy "Company admins can update invoices"
on public.invoices for update
using ( public.is_company_admin(company_id) );

create policy "Company admins can delete invoices"
on public.invoices for delete
using ( public.is_company_admin(company_id) );

-- 3. Update Policies for EXPENSES
drop policy if exists "Company members can update expenses" on public.expenses;
drop policy if exists "Company members can delete expenses" on public.expenses;

create policy "Company admins can update expenses"
on public.expenses for update
using ( public.is_company_admin(company_id) );

create policy "Company admins can delete expenses"
on public.expenses for delete
using ( public.is_company_admin(company_id) );

-- 4. Update Policies for PROJECTS
drop policy if exists "Company members can update projects" on public.projects;
drop policy if exists "Company members can delete projects" on public.projects;

create policy "Company admins can update projects"
on public.projects for update
using ( public.is_company_admin(company_id) );

create policy "Company admins can delete projects"
on public.projects for delete
using ( public.is_company_admin(company_id) );

-- 5. Update Policies for PAYABLE INVOICES
drop policy if exists "Company members can update payable_invoices" on public.payable_invoices;
drop policy if exists "Company members can delete payable_invoices" on public.payable_invoices;

create policy "Company admins can update payable_invoices"
on public.payable_invoices for update
using ( public.is_company_admin(company_id) );

create policy "Company admins can delete payable_invoices"
on public.payable_invoices for delete
using ( public.is_company_admin(company_id) );

-- 6. Update Policies for CREDIT NOTES
drop policy if exists "Company members can update credit_notes" on public.credit_notes;
drop policy if exists "Company members can delete credit_notes" on public.credit_notes;

create policy "Company admins can update credit_notes"
on public.credit_notes for update
using ( public.is_company_admin(company_id) );

create policy "Company admins can delete credit_notes"
on public.credit_notes for delete
using ( public.is_company_admin(company_id) );

-- 7. Ensure Join Code is only visible/generating for Admins via Company Table
-- (Already handled by "Company admins can update company" policy, but let's double check SELECT)
-- We typically allow members to SEE the company (name, currency), but maybe we want to hide Join Code column?
-- Postgres RLS is row-level, not column-level usually.
-- For now, we trust the UI to hide it, and the 'update' policy protects regeneration.
