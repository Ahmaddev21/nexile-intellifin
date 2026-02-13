-- 1. Create subscriptions table
create table if not exists public.subscriptions (
    id uuid default gen_random_uuid() primary key,
    company_id uuid references public.companies on delete cascade not null,
    plan_id text not null,
    status text not null check (status in ('active', 'past_due', 'canceled', 'trial', 'expired')),
    current_period_start timestamptz,
    current_period_end timestamptz,
    currency text,
    amount_paid numeric,
    payment_gateway text check (payment_gateway in ('stripe', 'myfatoorah', 'google_play', 'manual')),
    stripe_subscription_id text,
    myfatoorah_invoice_id text,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(company_id)
);

-- 2. Enable RLS
alter table public.subscriptions enable row level security;

-- 3. RLS Policies

-- View: Company members can view their subscription
create policy "Company members can view subscription"
on public.subscriptions for select
using (
    exists (
        select 1 from public.company_users cu
        where cu.company_id = subscriptions.company_id
        and cu.user_id = auth.uid()
    )
);

-- Insert/Update is restricted to Service Role (Edge Functions) only.
-- No policies for 'authenticated' role for INSERT/UPDATE/DELETE.

-- 4. Helper Function: Check if company subscription is active
create or replace function public.is_company_active(p_company_id uuid)
returns boolean as $$
declare
    v_status text;
    v_end timestamptz;
begin
    select status, current_period_end into v_status, v_end
    from public.subscriptions
    where company_id = p_company_id;

    -- If no subscription record exists, grant Trial access (optional) or restrict.
    -- Requirement: "User signs up -> status=inactive". So we return false if not found.
    if not found then
        return false;
    end if;

    -- Active if status is 'active' AND not expired
    if v_status = 'active' and (v_end is null or v_end > now()) then
        return true;
    end if;
    
    -- Allow 'trial' if valid?
    if v_status = 'trial' and (v_end is null or v_end > now()) then
        return true;
    end if;

    return false;
end;
$$ language plpgsql security definer;

-- 5. Auto-update updated_at timestamp

-- Ensure the function exists (idempotent)
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger tr_subscriptions_updated_at
    before update on public.subscriptions
    for each row execute procedure public.update_updated_at_column();
