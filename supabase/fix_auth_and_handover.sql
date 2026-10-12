-- Secure the app with Supabase Auth and create private handover-user profiles.
-- Run schema.sql and all fix scripts (including fix_handover_returns.sql) first,
-- then run this script last in SQL Editor.
-- Passwords are managed by Supabase Auth; never add a plain-text password column.

create table if not exists public.app_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  gmail text not null,
  created_at timestamptz not null default now()
);

alter table public.assets
  add column if not exists last_modified_by text;

create or replace function public.set_asset_last_modified_by()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  select username
    into new.last_modified_by
    from public.app_users
    where user_id = auth.uid();

  if new.last_modified_by is null and tg_op = 'UPDATE' then
    new.last_modified_by := old.last_modified_by;
  end if;

  return new;
end;
$$;

drop trigger if exists assets_set_last_modified_by on public.assets;
create trigger assets_set_last_modified_by
before insert or update on public.assets
for each row
execute function public.set_asset_last_modified_by();

revoke all on function public.set_asset_last_modified_by() from public, anon;

alter table public.app_users enable row level security;

do $$
declare
  target_table text;
  existing_policy text;
begin
  foreach target_table in array array[
    'app_users',
    'employees',
    'vendors',
    'assets',
    'assignments',
    'transfers',
    'returns',
    'exit_records',
    'repair_requests',
    'disposal_records',
    'stock_adjustments',
    'procurement_orders'
  ]
  loop
    if to_regclass(format('public.%I', target_table)) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', target_table);

    for existing_policy in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
    loop
      execute format(
        'drop policy %I on public.%I',
        existing_policy,
        target_table
      );
    end loop;

    if target_table = 'app_users' then
      execute $policy$
        create policy app_users_self_select
        on public.app_users
        for select
        to authenticated
        using (user_id = auth.uid())
      $policy$;
    else
      execute format(
        'create policy %I on public.%I for all to authenticated using (true) with check (true)',
        target_table || '_authenticated_access',
        target_table
      );
    end if;
  end loop;
end;
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'app_users',
    'employees',
    'vendors',
    'assets',
    'assignments',
    'transfers',
    'returns',
    'exit_records',
    'repair_requests',
    'disposal_records',
    'stock_adjustments',
    'procurement_orders'
  ]
  loop
    if to_regclass(format('public.%I', target_table)) is null then
      continue;
    end if;

    execute format('revoke all on table public.%I from anon', target_table);
    execute format(
      'grant select, insert, update, delete on table public.%I to authenticated',
      target_table
    );
  end loop;
end;
$$;

revoke all on function public.transfer_assets_to_employee(
  text[], uuid, uuid, public.location_type, timestamptz, text
) from public, anon;
grant execute on function public.transfer_assets_to_employee(
  text[], uuid, uuid, public.location_type, timestamptz, text
) to authenticated;

revoke all on function public.return_transferred_asset_to_stock(
  text, uuid, timestamptz, text
) from public, anon;
grant execute on function public.return_transferred_asset_to_stock(
  text, uuid, timestamptz, text
) to authenticated;

revoke all on function public.return_assets_to_stock(
  text[], uuid, timestamptz, public.asset_condition, text, text
) from public, anon;
grant execute on function public.return_assets_to_stock(
  text[], uuid, timestamptz, public.asset_condition, text, text
) to authenticated;

revoke all on function public.send_asset_for_repair(
  text, uuid, text, text, timestamptz, text
) from public, anon;
grant execute on function public.send_asset_for_repair(
  text, uuid, text, text, timestamptz, text
) to authenticated;

-- Provisioning: create an Auth user in Supabase Dashboard > Authentication > Users.
-- Then add only the display username and Gmail to this profile table, for example:
--
-- insert into public.app_users (user_id, username, gmail)
-- select id, 'abc', 'abc@gmail.com'
-- from auth.users
-- where email = 'abc@gmail.com'
-- on conflict (user_id) do update
-- set username = excluded.username, gmail = excluded.gmail;
--
-- Disable public sign-ups in Supabase Authentication settings. Existing app users
-- can read only their own profile; passwords remain in Supabase Auth.

notify pgrst, 'reload schema';
