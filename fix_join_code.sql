-- 1. Ensure the random code generation function exists
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

-- 2. Ensure the Regenerate RPC exists and is secure
create or replace function public.regenerate_join_code()
returns text as $$
declare
  v_company_id uuid;
  v_new_code text;
begin
  -- Get company id for the current user (must be admin)
  select company_id into v_company_id
  from public.company_users
  where user_id = auth.uid() and role = 'admin'
  limit 1;

  if v_company_id is null then
    -- Fallback: If user owns a company but has no 'admin' entry in company_users, add it.
    select id into v_company_id from public.companies where user_id = auth.uid();
    
    if v_company_id is not null then
        insert into public.company_users (company_id, user_id, role)
        values (v_company_id, auth.uid(), 'admin')
        on conflict (company_id, user_id) do nothing;
    else
        raise exception 'Permission denied: User is not an admin of any company';
    end if;
  end if;

  v_new_code := public.generate_join_code();

  -- Update the company with the new code
  update public.companies
  set join_code = v_new_code
  where id = v_company_id;

  return v_new_code;
end;
$$ language plpgsql security definer;

-- 3. Run a one-time fix for the current user (if running in SQL editor)
-- This logic attempts to fix "orphan" company creators who might not be in company_users
do $$
declare
    r record;
begin
    -- For every company, ensure the creator (user_id) is an admin in company_users
    for r in select * from public.companies loop
        insert into public.company_users (company_id, user_id, role)
        values (r.id, r.user_id, 'admin')
        on conflict (company_id, user_id) do update
        set role = 'admin'; -- Force upgrade to admin if they are just a member
        
        -- Also ensure the company has a join code
        if r.join_code is null then
            update public.companies 
            set join_code = public.generate_join_code() 
            where id = r.id;
        end if;
    end loop;
end $$;
