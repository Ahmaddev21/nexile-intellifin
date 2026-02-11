-- 1. Add Gamification Columns to Profiles
alter table public.profiles 
add column if not exists points integer default 0,
add column if not exists level integer default 1,
add column if not exists badges jsonb default '[]'::jsonb,
add column if not exists achievements jsonb default '[]'::jsonb;

-- 2. Create Helper to Get Company Leaderboard
-- This function returns the top users for the current user's company
create or replace function public.get_company_leaderboard()
returns table (
  user_id uuid,
  username text,
  points integer,
  level integer,
  rank bigint
) as $$
declare
  v_company_id uuid;
begin
  -- Get the company ID for the current user
  select company_id into v_company_id
  from public.company_users
  where user_id = auth.uid()
  limit 1;

  -- If no company found (shouldn't happen for active users), return empty
  if v_company_id is null then
    return;
  end if;

  -- Return leaderboard
  return query
  select 
    p.id as user_id,
    p.username,
    coalesce(p.points, 0) as points,
    coalesce(p.level, 1) as level,
    rank() over (order by coalesce(p.points, 0) desc) as rank
  from public.profiles p
  join public.company_users cu on p.id = cu.user_id
  where cu.company_id = v_company_id
  order by points desc
  limit 10;
end;
$$ language plpgsql security definer;

-- 3. Function to Increment Points (Securely)
create or replace function public.increment_user_points(p_points integer)
returns void as $$
begin
  update public.profiles
  set points = coalesce(points, 0) + p_points
  where id = auth.uid();
end;
$$ language plpgsql security definer;
