-- 1. Create company_users table
create table if not exists public.company_users (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  role text check (role in ('admin', 'member')) default 'member',
  created_at timestamptz default now(),
  unique(company_id, user_id)
);

-- Enable RLS on company_users
alter table public.company_users enable row level security;

-- 2. Add join_code to companies
alter table public.companies add column if not exists join_code text unique;

-- Function to generate random join code
create or replace function public.generate_join_code()
returns text as $$
declare
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  end loop;
  return result;
end;
$$ language plpgsql;

-- Backfill join codes for existing companies
update public.companies set join_code = public.generate_join_code() where join_code is null;

-- 3. Add company_id to all financial tables
do $$
declare
    t text;
begin
    for t in select unnest(ARRAY['projects', 'invoices', 'expenses', 'payable_invoices', 'credit_notes']) loop
        execute format('alter table public.%I add column if not exists company_id uuid references public.companies on delete cascade', t);
    end loop;
end $$;

-- 4. Data Migration: Populate company_users and link financial data
-- Assumption: Currently 1 User = 1 Company (Created at signup)
do $$
declare
    r record;
begin
    for r in select * from public.companies loop
        -- Add owner as admin in company_users
        insert into public.company_users (company_id, user_id, role)
        values (r.id, r.user_id, 'admin')
        on conflict (company_id, user_id) do nothing;

        -- Update financial records to belong to this company
        -- We find records owned by the company owner (r.user_id) and link them to r.id
        update public.projects set company_id = r.id where user_id = r.user_id;
        update public.invoices set company_id = r.id where user_id = r.user_id;
        update public.expenses set company_id = r.id where user_id = r.user_id;
        update public.payable_invoices set company_id = r.id where user_id = r.user_id;
        update public.credit_notes set company_id = r.id where user_id = r.user_id;
    end loop;
end $$;

-- 5. Helper Function: Check if user belongs to company
create or replace function public.is_company_member(company_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.company_users cu
    where cu.company_id = is_company_member.company_id
    and cu.user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- 6. Update RLS Policies (Switch from User Ownership to Company Membership)

-- Company Users Policies
create policy "Users can view members of their company"
on public.company_users for select
using (
    exists (
        select 1 from public.company_users cu
        where cu.company_id = company_users.company_id
        and cu.user_id = auth.uid()
    )
);

-- COMPANIES: Members can view, Only Admins can update
drop policy if exists "Users can view own company" on public.companies;
create policy "Company members can view company"
on public.companies for select
using ( id in (select company_id from public.company_users where user_id = auth.uid()) );

-- PROJECTS
drop policy if exists "Users can view own projects" on public.projects;
create policy "Company members can view projects"
on public.projects for select using ( public.is_company_member(company_id) );

drop policy if exists "Users can insert own projects" on public.projects;
create policy "Company members can insert projects"
on public.projects for insert with check ( public.is_company_member(company_id) );

drop policy if exists "Users can update own projects" on public.projects;
create policy "Company members can update projects"
on public.projects for update using ( public.is_company_member(company_id) );

-- INVOICES
drop policy if exists "Users can view own invoices" on public.invoices;
create policy "Company members can view invoices"
on public.invoices for select using ( public.is_company_member(company_id) );

drop policy if exists "Users can insert own invoices" on public.invoices;
create policy "Company members can insert invoices"
on public.invoices for insert with check ( public.is_company_member(company_id) );

drop policy if exists "Users can update own invoices" on public.invoices;
create policy "Company members can update invoices"
on public.invoices for update using ( public.is_company_member(company_id) );


-- EXPENSES
drop policy if exists "Users can view own expenses" on public.expenses;
create policy "Company members can view expenses"
on public.expenses for select using ( public.is_company_member(company_id) );

drop policy if exists "Users can insert own expenses" on public.expenses;
create policy "Company members can insert expenses"
on public.expenses for insert with check ( public.is_company_member(company_id) );

drop policy if exists "Users can update own expenses" on public.expenses;
create policy "Company members can update expenses"
on public.expenses for update using ( public.is_company_member(company_id) );

-- 7. Functions for Backend-less Onboarding

-- Join Company by Code
-- Returns the company_id if successful, raises exception if invalid
create or replace function public.join_company_by_code(code text)
returns json as $$
declare
    v_company_id uuid;
    v_company_name text;
    v_currency text;
begin
    select id, name, currency into v_company_id, v_company_name, v_currency
    from public.companies
    where join_code = code;

    if v_company_id is null then
        raise exception 'Invalid join code';
    end if;

    -- Add user as member
    insert into public.company_users (company_id, user_id, role)
    values (v_company_id, auth.uid(), 'member')
    on conflict (company_id, user_id) do nothing;

    return json_build_object(
        'id', v_company_id,
        'name', v_company_name,
        'currency', v_currency
    );
end;
$$ language plpgsql security definer;

-- Create Company (replaces simple insert)
-- Automatically adds creator as admin and generates code
create or replace function public.create_company_with_admin(name text, currency text)
returns json as $$
declare
    v_company_id uuid;
    v_join_code text;
begin
    v_join_code := public.generate_join_code();
    
    insert into public.companies (user_id, name, currency, join_code)
    values (auth.uid(), name, currency, v_join_code)
    returning id into v_company_id;

    insert into public.company_users (company_id, user_id, role)
    values (v_company_id, auth.uid(), 'admin');

    return json_build_object(
        'id', v_company_id,
        'name', name,
        'currency', currency,
        'join_code', v_join_code
    );
end;
$$ language plpgsql security definer;
