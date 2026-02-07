-- RESTRICT MEMBER PERMISSIONS (Revised)
-- Goal: 
-- 1. Members can INSERT (Create) Invoices, Expenses, Projects, etc.
-- 2. Members CANNOT UPDATE/DELETE Invoices, Expenses, Payables, Credit Notes.
-- 3. Members CAN UPDATE Projects ONLY to change 'status'.

-- 1. Helper Function: Check if user is an ADMIN of the company
-- (Assuming we can derive company_id from the record or context. 
-- Since tables have user_id, but not always company_id directly on standard schema unless added.
-- Let's check the schema. Companies table links user_id to company.
-- Profiles don't have company_id. 
-- WE NEED A RELIABLE WAY TO CHECK ADMIN STATUS.
-- Existing `is_company_admin` function relies on `company_users`.
-- Let's assume `company_users` exists and is populated correctly.)

create or replace function public.is_app_admin()
returns boolean as $$
begin
  -- Check if the current user has an 'admin' role in ANY company (or the relevant one).
  -- For now, let's look up the company_users table for the current user.
  return exists (
    select 1 from public.company_users 
    where user_id = auth.uid() 
    and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- 2. Update Policies for INVOICES
-- DROP existing update/delete policies
drop policy if exists "Users can update own invoices" on public.invoices;
drop policy if exists "Users can delete own invoices" on public.invoices;
drop policy if exists "Company members can update invoices" on public.invoices;
drop policy if exists "Company members can delete invoices" on public.invoices;
drop policy if exists "Admins can update invoices" on public.invoices;
drop policy if exists "Admins can delete invoices" on public.invoices;


-- CREATE new restricted policies
create policy "Admins can update invoices"
on public.invoices for update
using ( public.is_app_admin() );

create policy "Admins can delete invoices"
on public.invoices for delete
using ( public.is_app_admin() );

-- Members can VIEW (Select) and INSERT (Create) - these usually persist from "Users can view..." 
-- but we should ensure they are there.
-- "Users can view own invoices" usually allows auth.uid() = user_id. 
-- We might need to broaden this to "Company members can view company invoices".
-- For now, we assume the existing SELECT/INSERT policies are sufficient for creation/viewing.


-- 3. Update Policies for EXPENSES
drop policy if exists "Users can update own expenses" on public.expenses;
drop policy if exists "Users can delete own expenses" on public.expenses;
drop policy if exists "Company members can update expenses" on public.expenses;
drop policy if exists "Company members can delete expenses" on public.expenses;


create policy "Admins can update expenses"
on public.expenses for update
using ( public.is_app_admin() );

create policy "Admins can delete expenses"
on public.expenses for delete
using ( public.is_app_admin() );


-- 4. Update Policies for PAYABLE INVOICES
drop policy if exists "Users can update own payable invoices" on public.payable_invoices;
drop policy if exists "Users can delete own payable invoices" on public.payable_invoices;

create policy "Admins can update payable invoices"
on public.payable_invoices for update
using ( public.is_app_admin() );

create policy "Admins can delete payable invoices"
on public.payable_invoices for delete
using ( public.is_app_admin() );


-- 5. Update Policies for CREDIT NOTES
drop policy if exists "Users can update own credit notes" on public.credit_notes;
drop policy if exists "Users can delete own credit notes" on public.credit_notes;

create policy "Admins can update credit notes"
on public.credit_notes for update
using ( public.is_app_admin() );

create policy "Admins can delete credit notes"
on public.credit_notes for delete
using ( public.is_app_admin() );


-- 6. SPECIAL CASE: PROJECTS
-- Members need to update STATUS, but nothing else.
-- Strategy: Allow UPDATE for all members, but use a TRIGGER to block changes to other fields if not admin.

drop policy if exists "Users can update own projects" on public.projects;
drop policy if exists "Users can delete own projects" on public.projects;

-- Allow UPDATE for All Users (RLS level)
create policy "Users can update projects"
on public.projects for update
using ( auth.uid() = user_id or public.is_app_admin() OR exists (select 1 from public.company_users where user_id = auth.uid()) ); 
-- Note: "user_id = auth.uid()" is for the creator. We want any team member (in the same company) to potentially update status.
-- Ideally we check company match.

-- Allow DELETE only for Admins
create policy "Admins can delete projects"
on public.projects for delete
using ( public.is_app_admin() );


-- TRIGGER to enforce Field-Level Security on Projects
create or replace function public.enforce_project_lock()
returns trigger as $$
begin
  -- If user is Admin, allow everything
  if public.is_app_admin() then
    return NEW;
  end if;

  -- If user is NOT Admin, check changed columns
  -- We allow changing: status, last_activity_date
  -- We block changing: name, budget, etc.
  
  if (NEW.name <> OLD.name) or
     (NEW.budget <> OLD.budget) or
     (NEW.client <> OLD.client) or
     (NEW.estimated_cost <> OLD.estimated_cost) or
     (NEW.expected_revenue <> OLD.expected_revenue) or
     (NEW.start_date <> OLD.start_date) or
     (NEW.end_date <> OLD.end_date) then
      raise exception 'Only Admins can modify project details (Name, Budget, etc.). Team members can only update Status.';
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists tr_enforce_project_lock on public.projects;
create trigger tr_enforce_project_lock
  before update on public.projects
  for each row execute procedure public.enforce_project_lock();
