-- Function to generate random join code (Ensure it exists)
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

-- RPC function to regenerate join code for the authenticated admin's company
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
    raise exception 'Permission denied: User is not an admin of any company';
  end if;

  v_new_code := public.generate_join_code();

  -- Update the company with the new code
  update public.companies
  set join_code = v_new_code
  where id = v_company_id;

  return v_new_code;
end;
$$ language plpgsql security definer;
