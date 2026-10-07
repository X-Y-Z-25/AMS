alter table public.exit_records enable row level security;

grant select, insert, update, delete
on table public.exit_records
to anon, authenticated;

drop policy if exists "exit_records_allow_all_for_dev"
on public.exit_records;

create policy "exit_records_allow_all_for_dev"
on public.exit_records
for all
to anon, authenticated
using (true)
with check (true);