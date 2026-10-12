-- Persist who received returned assets and include return history in handovers.
-- Run this in Supabase SQL Editor after the existing asset transfer/repair scripts.

alter table public.returns
  add column if not exists received_by text;

grant select, insert, update on table public.returns to authenticated;

drop function if exists public.return_transferred_asset_to_stock(
  text, uuid, timestamptz
);

create or replace function public.return_transferred_asset_to_stock(
  p_asset_tag text,
  p_employee_uuid uuid,
  p_return_date timestamptz,
  p_received_by text
)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_asset_id uuid;
  v_condition public.asset_condition;
begin
  if nullif(trim(p_received_by), '') is null then
    raise exception 'The logged-in receiver name is required.';
  end if;

  select id, condition
    into v_asset_id, v_condition
    from public.assets
    where asset_tag = p_asset_tag
      and assigned_to = p_employee_uuid
      and status = 'Assigned'
    for update;

  if not found then
    raise exception 'Asset % is no longer assigned to this employee.', p_asset_tag;
  end if;

  update public.assets
    set status = 'Available',
        assigned_to = null,
        assigned_date = null,
        updated_at = now()
    where id = v_asset_id;

  update public.assignments
    set status = 'Returned'
    where asset_id = v_asset_id
      and employee_id = p_employee_uuid
      and status = 'Active';

  insert into public.returns (
    asset_id,
    employee_id,
    returned_date,
    condition,
    remarks,
    received_by
  )
  values (
    v_asset_id,
    p_employee_uuid,
    p_return_date,
    v_condition,
    'Returned to stock from transfer log',
    trim(p_received_by)
  );
end;
$$;

revoke all on function public.return_transferred_asset_to_stock(
  text, uuid, timestamptz, text
) from public, anon;
grant execute on function public.return_transferred_asset_to_stock(
  text, uuid, timestamptz, text
) to authenticated;

create or replace function public.return_assets_to_stock(
  p_asset_tags text[],
  p_employee_uuid uuid,
  p_return_date timestamptz,
  p_condition public.asset_condition,
  p_remarks text,
  p_received_by text
)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_asset_tag text;
  v_asset_id uuid;
  v_return_count integer := 0;
  v_remarks text;
begin
  if p_employee_uuid is null then
    raise exception 'The employee receiving the return could not be identified.';
  end if;
  if nullif(trim(p_received_by), '') is null then
    raise exception 'The logged-in receiver name is required.';
  end if;
  if coalesce(array_length(p_asset_tags, 1), 0) = 0 then
    raise exception 'Select at least one asset to return.';
  end if;

  v_remarks := coalesce(nullif(trim(p_remarks), ''), 'Returned');
  if lower(v_remarks) not like 'returned%' then
    v_remarks := 'Returned | ' || v_remarks;
  end if;

  for v_asset_tag in
    select distinct trim(tag)
    from unnest(p_asset_tags) as tags(tag)
    where trim(tag) <> ''
  loop
    select id
      into v_asset_id
      from public.assets
      where asset_tag = v_asset_tag
        and assigned_to = p_employee_uuid
        and status = 'Assigned'
      for update;

    if not found then
      raise exception 'Asset % is no longer assigned to this employee.', v_asset_tag;
    end if;

    update public.assets
      set status = 'Available',
          condition = p_condition,
          assigned_to = null,
          assigned_date = null,
          updated_at = now()
      where id = v_asset_id;

    update public.assignments
      set status = 'Returned'
      where asset_id = v_asset_id
        and employee_id = p_employee_uuid
        and status = 'Active';

    insert into public.returns (
      asset_id,
      employee_id,
      returned_date,
      condition,
      remarks,
      received_by
    )
    values (
      v_asset_id,
      p_employee_uuid,
      p_return_date,
      p_condition,
      v_remarks,
      trim(p_received_by)
    );

    v_return_count := v_return_count + 1;
  end loop;

  if v_return_count = 0 then
    raise exception 'Select at least one valid assigned asset to return.';
  end if;
end;
$$;

revoke all on function public.return_assets_to_stock(
  text[], uuid, timestamptz, public.asset_condition, text, text
) from public, anon;
grant execute on function public.return_assets_to_stock(
  text[], uuid, timestamptz, public.asset_condition, text, text
) to authenticated;

notify pgrst, 'reload schema';
