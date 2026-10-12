-- Install the assigned-asset repair workflow.
-- Run this script in the Supabase SQL Editor for an existing database.

alter type public.assignment_status add value if not exists 'Under Repair';

alter table public.repair_requests enable row level security;
grant select, insert, update on table public.repair_requests
  to authenticated;
grant select, update on table public.assets to authenticated;
grant select, insert, update on table public.assignments
  to authenticated;

drop policy if exists "repair_requests_allow_all_for_dev"
  on public.repair_requests;
create policy "repair_requests_allow_all_for_dev"
on public.repair_requests
for all
to authenticated
using (true)
with check (true);

drop policy if exists "assets_allow_all_for_dev" on public.assets;
create policy "assets_allow_all_for_dev"
on public.assets
for all
to authenticated
using (true)
with check (true);

drop policy if exists "assignments_allow_all_for_dev" on public.assignments;
create policy "assignments_allow_all_for_dev"
on public.assignments
for all
to authenticated
using (true)
with check (true);

create or replace function public.send_asset_for_repair(
  p_asset_tag text,
  p_employee_uuid uuid,
  p_vendor_name text,
  p_issue_summary text,
  p_reported_date timestamptz,
  p_temporary_asset_tag text default null
)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_asset_id uuid;
  v_asset_category public.asset_category;
  v_employee_location public.location_type;
  v_temporary_asset_id uuid;
begin
  if p_vendor_name not in ('Dell', 'Poly') then
    raise exception 'Select Dell or Poly as the repair vendor.';
  end if;

  if nullif(trim(p_issue_summary), '') is null then
    raise exception 'Enter an issue description before sending the asset for repair.';
  end if;

  select id, category
    into v_asset_id, v_asset_category
    from public.assets
    where asset_tag = p_asset_tag
      and status in ('Assigned', 'Available', 'Returned', 'Reserved')
      and (
        assigned_to = p_employee_uuid
        or (
          assigned_to is null
          and exists (
            select 1
            from public.assignments
            where asset_id = public.assets.id
              and employee_id = p_employee_uuid
              and status = 'Active'
          )
        )
      )
    for update;

  if not found then
    raise exception 'Asset % is no longer assigned to this employee.', p_asset_tag;
  end if;

  select location
    into v_employee_location
    from public.employees
    where id = p_employee_uuid;

  if not found then
    raise exception 'The assigned employee could not be found.';
  end if;

  if p_temporary_asset_tag is not null then
    if v_asset_category not in ('Laptop', 'Headset') then
      raise exception 'Temporary replacement stock is only supported for laptops and headsets.';
    end if;

    select id
      into v_temporary_asset_id
      from public.assets
      where (
          asset_tag = p_temporary_asset_tag
          or id::text = p_temporary_asset_tag
          or upper(trim(serial_number)) = upper(trim(p_temporary_asset_tag))
        )
        and category = v_asset_category
        and status in ('Available', 'Returned', 'Reserved')
      for update;

    if not found then
      raise exception 'The selected temporary asset is no longer available in stock.';
    end if;
  end if;

  update public.assets
    set status = 'Under Repair',
        assigned_to = p_employee_uuid,
        updated_at = now()
    where id = v_asset_id;

  update public.assignments
    set status = 'Under Repair'
    where asset_id = v_asset_id
      and employee_id = p_employee_uuid
      and status = 'Active';

  insert into public.repair_requests (
    asset_id,
    employee_id,
    issue_summary,
    status,
    reported_date,
    vendor_name
  )
  values (
    v_asset_id,
    p_employee_uuid,
    trim(p_issue_summary),
    'Sent to Vendor',
    p_reported_date,
    p_vendor_name
  );

  if v_temporary_asset_id is not null then
    update public.assets
      set status = 'Assigned',
          assigned_to = p_employee_uuid,
          assigned_date = p_reported_date,
          location = v_employee_location,
          updated_at = now()
      where id = v_temporary_asset_id;

    insert into public.assignments (
      asset_id,
      employee_id,
      assigned_date,
      status,
      notes
    )
    values (
      v_temporary_asset_id,
      p_employee_uuid,
      p_reported_date,
      'Active',
      'Temporary replacement while asset is under repair'
    );
  end if;
end;
$$;

revoke all on function public.send_asset_for_repair(
  text, uuid, text, text, timestamptz, text
) from public;
grant execute on function public.send_asset_for_repair(
  text, uuid, text, text, timestamptz, text
) to authenticated;

notify pgrst, 'reload schema';
