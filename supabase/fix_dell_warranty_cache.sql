-- Run this migration in Supabase SQL Editor for existing projects.
alter table public.assets
  add column if not exists warranty_checked_at timestamptz;

update public.assets
set warranty_checked_at = coalesce(updated_at, created_at, now())
where warranty_end is not null
  and warranty_checked_at is null;
