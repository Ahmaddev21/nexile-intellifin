-- AUDIT LOGS SYSTEM
-- Goal: Track every insert, update, and delete on financial tables.

-- 1. Create Audit Log Table
create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  table_name text not null,
  record_id uuid not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  performed_by uuid default auth.uid(),
  timestamp timestamptz default now()
);

-- Enable RLS on audit_logs (Admins can view, no one can edit/delete)
alter table public.audit_logs enable row level security;

create policy "Admins can view audit logs"
  on public.audit_logs for select
  using ( public.is_company_admin((select company_id from public.company_users where user_id = auth.uid() limit 1)) );

-- 2. Create Trigger Function
create or replace function public.log_financial_change()
returns trigger as $$
declare
  v_old_data jsonb;
  v_new_data jsonb;
begin
  if (TG_OP = 'INSERT') then
    v_old_data := null;
    v_new_data := to_jsonb(NEW);
  elsif (TG_OP = 'UPDATE') then
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
  elsif (TG_OP = 'DELETE') then
    v_old_data := to_jsonb(OLD);
    v_new_data := null;
  end if;

  insert into public.audit_logs (table_name, record_id, action, old_data, new_data, performed_by)
  values (
    TG_TABLE_NAME,
    coalesce(NEW.id, OLD.id),
    TG_OP,
    v_old_data,
    v_new_data,
    auth.uid()
  );

  return null; -- Result is ignored for AFTER triggers
end;
$$ language plpgsql security definer;

-- 3. Apply Triggers to Tables

-- Invoices
drop trigger if exists audit_log_invoices on public.invoices;
create trigger audit_log_invoices
  after insert or update or delete on public.invoices
  for each row execute procedure public.log_financial_change();

-- Expenses
drop trigger if exists audit_log_expenses on public.expenses;
create trigger audit_log_expenses
  after insert or update or delete on public.expenses
  for each row execute procedure public.log_financial_change();

-- Projects
drop trigger if exists audit_log_projects on public.projects;
create trigger audit_log_projects
  after insert or update or delete on public.projects
  for each row execute procedure public.log_financial_change();

-- Payable Invoices
drop trigger if exists audit_log_payable_invoices on public.payable_invoices;
create trigger audit_log_payable_invoices
  after insert or update or delete on public.payable_invoices
  for each row execute procedure public.log_financial_change();

-- Credit Notes
drop trigger if exists audit_log_credit_notes on public.credit_notes;
create trigger audit_log_credit_notes
  after insert or update or delete on public.credit_notes
  for each row execute procedure public.log_financial_change();
