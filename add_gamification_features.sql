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
  select cu.company_id into v_company_id
  from public.company_users cu
  where cu.user_id = auth.uid()
  limit 1;

  -- If no company found (shouldn't happen for active users), return empty
  if v_company_id is null then
    return;
  end if;

  -- Return leaderboard (team members only — admin excluded)
  return query
  select 
    p.id as user_id,
    coalesce(p.username, u.email, 'Unknown User') as username,
    coalesce(p.points, 0) as points,
    coalesce(p.level, 1) as level,
    row_number() over (order by coalesce(p.points, 0) desc) as rank
  from public.profiles p
  inner join auth.users u on u.id = p.id
  inner join public.company_users cu2 on cu2.user_id = p.id
  where cu2.company_id = v_company_id
    and cu2.role = 'member'
  order by coalesce(p.points, 0) desc
  limit 50;
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
