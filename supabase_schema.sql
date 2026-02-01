-- Enable RLS
-- Note: auth.users automatically has RLS enabled in Supabase by default. 
-- We skip explictly enabling it to avoid permission errors if running as non-superuser.

-- Create tables
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text,
  subscription_status text default 'trial',
  created_at timestamptz default now()
);

create table public.companies (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  currency text default 'USD',
  fiscal_year_start text default 'January',
  industry text default 'Services',
  created_at timestamptz default now()
);

create table public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  client text,
  budget numeric default 0,
  estimated_cost numeric default 0,
  expected_revenue numeric default 0,
  start_date date,
  end_date date,
  first_activity_date timestamptz,
  last_activity_date timestamptz default now(),
  status text check (status in ('active', 'completed', 'on-hold', 'archived')),
  is_deleted boolean default false,
  cost_categories text[],
  created_at timestamptz default now()
);

create table public.invoices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  project_id uuid references public.projects on delete set null,
  client_name text,
  amount numeric default 0,
  date date,
  status text check (status in ('paid', 'sent', 'overdue', 'pending', 'cancelled', 'draft', 'partially_credited', 'fully_credited')),
  created_at timestamptz default now()
);

create table public.expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  project_id uuid references public.projects on delete set null,
  category text,
  amount numeric default 0,
  date date,
  type text check (type in ('fixed', 'variable')),
  status text check (status in ('paid', 'pending')) default 'paid',
  created_at timestamptz default now()
);

create table public.payable_invoices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  project_id uuid references public.projects on delete set null,
  vendor_name text,
  amount numeric default 0,
  date date,
  due_date date,
  status text check (status in ('draft', 'received', 'paid', 'overdue', 'cancelled')),
  description text,
  created_at timestamptz default now()
);

create table public.credit_notes (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users on delete cascade not null,
    invoice_id uuid references public.invoices on delete cascade not null,
    project_id uuid references public.projects on delete cascade not null,
    amount numeric(15, 2) not null check (amount > 0),
    reason text,
    status text check (status in ('pending', 'applied', 'void')) default 'applied',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Enable RLS on tables
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.projects enable row level security;
alter table public.invoices enable row level security;
alter table public.expenses enable row level security;
alter table public.payable_invoices enable row level security;
alter table public.credit_notes enable row level security;

-- Create Policies

-- Profiles
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Companies
create policy "Users can view own company" on public.companies for select using (auth.uid() = user_id);
create policy "Users can insert own company" on public.companies for insert with check (auth.uid() = user_id);
create policy "Users can update own company" on public.companies for update using (auth.uid() = user_id);
create policy "Users can delete own company" on public.companies for delete using (auth.uid() = user_id);

-- Projects
create policy "Users can view own projects" on public.projects for select using (auth.uid() = user_id);
create policy "Users can insert own projects" on public.projects for insert with check (auth.uid() = user_id);
create policy "Users can update own projects" on public.projects for update using (auth.uid() = user_id);
create policy "Users can delete own projects" on public.projects for delete using (auth.uid() = user_id);

-- Invoices
create policy "Users can view own invoices" on public.invoices for select using (auth.uid() = user_id);
create policy "Users can insert own invoices" on public.invoices for insert with check (auth.uid() = user_id);
create policy "Users can update own invoices" on public.invoices for update using (auth.uid() = user_id);
create policy "Users can delete own invoices" on public.invoices for delete using (auth.uid() = user_id);

-- Expenses
create policy "Users can view own expenses" on public.expenses for select using (auth.uid() = user_id);
create policy "Users can insert own expenses" on public.expenses for insert with check (auth.uid() = user_id);
create policy "Users can update own expenses" on public.expenses for update using (auth.uid() = user_id);
create policy "Users can delete own expenses" on public.expenses for delete using (auth.uid() = user_id);

-- Payable Invoices
create policy "Users can view own payable invoices" on public.payable_invoices for select using (auth.uid() = user_id);
create policy "Users can insert own payable invoices" on public.payable_invoices for insert with check (auth.uid() = user_id);
create policy "Users can update own payable invoices" on public.payable_invoices for update using (auth.uid() = user_id);
create policy "Users can delete own payable invoices" on public.payable_invoices for delete using (auth.uid() = user_id);

-- Credit Notes
create policy "Users can view own credit notes" on public.credit_notes for select using (auth.uid() = user_id);
create policy "Users can insert own credit notes" on public.credit_notes for insert with check (auth.uid() = user_id);
create policy "Users can update own credit notes" on public.credit_notes for update using (auth.uid() = user_id);
create policy "Users can delete own credit notes" on public.credit_notes for delete using (auth.uid() = user_id);

-- Trigger to sync Invoice status and check balance
create or replace function public.fn_sync_invoice_on_credit_change()
returns trigger as $$
declare
    v_invoice_id uuid;
    v_total_credited numeric(15, 2);
    v_invoice_amount numeric(15, 2);
    v_new_status text;
begin
    v_invoice_id := coalesce(new.invoice_id, old.invoice_id);
    select amount into v_invoice_amount from public.invoices where id = v_invoice_id;
    select coalesce(sum(amount), 0) into v_total_credited 
    from public.credit_notes 
    where invoice_id = v_invoice_id and status = 'applied';

    if v_total_credited > v_invoice_amount then
        raise exception 'Total credit notes (%.2f) exceed invoice total (%.2f)', v_total_credited, v_invoice_amount;
    end if;

    if v_total_credited = v_invoice_amount then
        v_new_status := 'fully_credited';
    elsif v_total_credited > 0 then
        v_new_status := 'partially_credited';
    else
        select status into v_new_status from public.invoices where id = v_invoice_id;
        if v_new_status in ('fully_credited', 'partially_credited') then
            v_new_status := 'sent';
        end if;
    end if;

    update public.invoices set status = v_new_status where id = v_invoice_id;
    return (case when TG_OP = 'DELETE' then OLD else NEW end);
end;
$$ language plpgsql security definer;

create trigger tr_sync_invoice_on_credit_change
    after insert or update or delete on public.credit_notes
    for each row execute procedure public.fn_sync_invoice_on_credit_change();

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger tr_credit_notes_updated_at
    before update on public.credit_notes
    for each row execute procedure public.update_updated_at_column();

-- Handle new user creation (Trigger)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
