alter table public.assignments enable row level security;

grant select, insert, update, delete
on table public.assignments
to anon, authenticated;

drop policy if exists "assignments_allow_all_for_dev"
on public.assignments;

create policy "assignments_allow_all_for_dev"
on public.assignments
for all
to anon, authenticated
using (true)
with check (true);

insert into public.assignments (
	asset_id,
	employee_id,
	assigned_date,
	status,
	notes
)
select
	asset.id,
	asset.assigned_to,
	coalesce(asset.assigned_date, now()),
	'Active',
	'Backfilled from current asset assignment'
from public.assets as asset
where asset.status = 'Assigned'
	and asset.assigned_to is not null
	and not exists (
		select 1
		from public.assignments as assignment
		where assignment.asset_id = asset.id
			and assignment.employee_id = asset.assigned_to
			and assignment.status = 'Active'
	);