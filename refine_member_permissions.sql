-- REFINE MEMBER PERMISSIONS (Status Updates Allowed)
-- Goal: 
-- 1. Members can UPDATE status of Invoices, Expenses, Payables, Credit Notes.
-- 2. Members CANNOT change amounts, descriptions, dates, or projects.
-- 3. Members CANNOT DELETE records.

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

-- 2. Update RLS Policies to ALLOW UPDATE for Members
-- (We rely on Triggers to block sensitive fields)

-- Invoices
drop policy if exists "Admins can update invoices" on public.invoices;
create policy "Users can update invoices"
on public.invoices for update
using ( auth.uid() = user_id or public.is_app_admin() OR exists (select 1 from public.company_users where user_id = auth.uid()) );

-- Expenses
drop policy if exists "Admins can update expenses" on public.expenses;
create policy "Users can update expenses"
on public.expenses for update
using ( auth.uid() = user_id or public.is_app_admin() OR exists (select 1 from public.company_users where user_id = auth.uid()) );

-- Payables
drop policy if exists "Admins can update payable invoices" on public.payable_invoices;
create policy "Users can update payable invoices"
on public.payable_invoices for update
using ( auth.uid() = user_id or public.is_app_admin() OR exists (select 1 from public.company_users where user_id = auth.uid()) );

-- Credit Notes
drop policy if exists "Admins can update credit notes" on public.credit_notes;
create policy "Users can update credit notes"
on public.credit_notes for update
using ( auth.uid() = user_id or public.is_app_admin() OR exists (select 1 from public.company_users where user_id = auth.uid()) );


-- 3. Create Field-Level Security Triggers

-- Generic Function to Lock Fields
create or replace function public.enforce_financial_lock()
returns trigger as $$
begin
  -- If Admin, allow everything
  if public.is_app_admin() then
    return NEW;
  end if;

  -- If Member, block changes to sensitive fields
  -- Common fields: amount, date, project_id, description/client/category
  
  if (NEW.amount <> OLD.amount) then
      raise exception 'Only Admins can modify amounts.';
  end if;
  
  if (NEW.date <> OLD.date) then
      raise exception 'Only Admins can modify dates.';
  end if;
  
  if (NEW.project_id <> OLD.project_id) then
      raise exception 'Only Admins can move records between projects.';
  end if;

  -- Table-specific checks
  if (TG_TABLE_NAME = 'invoices') then
     if (NEW.client_name <> OLD.client_name) then raise exception 'Only Admins can modify Client Name.'; end if;
  elsif (TG_TABLE_NAME = 'expenses') then
     if (NEW.category <> OLD.category) then raise exception 'Only Admins can modify Category.'; end if;
  elsif (TG_TABLE_NAME = 'payable_invoices') then
     if (NEW.vendor_name <> OLD.vendor_name) then raise exception 'Only Admins can modify Vendor Name.'; end if;
     if (NEW.due_date <> OLD.due_date) then raise exception 'Only Admins can modify Due Date.'; end if;
  elsif (TG_TABLE_NAME = 'credit_notes') then
     if (NEW.reason <> OLD.reason) then raise exception 'Only Admins can modify Reason.'; end if;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- Apply Triggers
drop trigger if exists tr_lock_invoices on public.invoices;
create trigger tr_lock_invoices
  before update on public.invoices
  for each row execute procedure public.enforce_financial_lock();

drop trigger if exists tr_lock_expenses on public.expenses;
create trigger tr_lock_expenses
  before update on public.expenses
  for each row execute procedure public.enforce_financial_lock();

drop trigger if exists tr_lock_payables on public.payable_invoices;
create trigger tr_lock_payables
  before update on public.payable_invoices
  for each row execute procedure public.enforce_financial_lock();

drop trigger if exists tr_lock_credit_notes on public.credit_notes;
create trigger tr_lock_credit_notes
  before update on public.credit_notes
  for each row execute procedure public.enforce_financial_lock();
