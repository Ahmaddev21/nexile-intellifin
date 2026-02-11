-- PART 2: CREATE TRIGGERS
-- Run this after Part 1 is successful.

-- 1. Create Lock Function
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

-- 2. Apply Triggers to Tables
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
