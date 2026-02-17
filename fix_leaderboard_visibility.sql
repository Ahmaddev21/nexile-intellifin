-- FIX LEADERBOARD VISIBILITY FOR TEAM MEMBERS
-- Problem: Team members who join via join code don't appear on the leaderboard.
-- Root Cause: Ambiguous column references in get_company_leaderboard() and
--             restrictive profiles RLS (users could only see their own profile).
-- Run this in Supabase SQL Editor to apply the fix.

-- ============================================================
-- 1. Fix get_company_leaderboard() — fully qualify all columns
-- ============================================================

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

  -- If no company found, return empty
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


-- ============================================================
-- 2. Add profiles RLS policy — company members can view teammates
-- ============================================================

-- This allows users to see profiles of all members in their company,
-- which is needed for leaderboard display and general teammate visibility.
-- Cross-company access remains blocked.

drop policy if exists "Company members can view teammate profiles" on public.profiles;

create policy "Company members can view teammate profiles"
on public.profiles for select
using (
  id in (
    select cu2.user_id
    from public.company_users cu2
    where cu2.company_id in (
      select cu3.company_id
      from public.company_users cu3
      where cu3.user_id = auth.uid()
    )
  )
);
