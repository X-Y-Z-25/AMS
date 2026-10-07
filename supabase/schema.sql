-- Asset Management System
-- Supabase schema for the production-ready replacement of the current mock-data prototype.
-- This file defines the core tables needed for asset lifecycle operations.

create extension if not exists "pgcrypto";

create type employee_status as enum ('Working', 'Inactive');
create type asset_status as enum ('Available', 'Assigned', 'Under Repair', 'Returned', 'Reserved', 'Retired', 'Disposed', 'Lost');
create type asset_condition as enum ('New', 'Good', 'Fair', 'Damaged', 'Beyond Repair');
create type asset_category as enum (
  'Laptop',
  'Monitor',
  'Docking Station',
  'Headset',
  'Keyboard',
  'Mouse',
  'Other'
);
create type assignment_status as enum ('Active', 'Returned', 'Transferred');
create type transfer_status as enum ('Completed', 'Pending');
create type repair_status as enum ('Pending', 'Sent to Vendor', 'Under Repair', 'Completed', 'Not Repairable');
create type disposal_status as enum ('Pending', 'Approved', 'Disposed');
create type disposal_reason as enum ('Beyond Repair', 'End of Life', 'Damaged', 'Lost', 'Obsolete', 'Replacement');
create type location_type as enum ('SSC Bangalore', 'Global');
create type warranty_status as enum ('Active', 'Expiring Soon', 'Expired', 'No Warranty');

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  emp_id text not null unique,
  sfid text,
  full_name text not null,
  email text not null unique,
  phone text,
  department text,
  designation text,
  process text,
  supervisor text,
  manager text,
  location location_type not null default 'SSC Bangalore',
  emp_type text default 'local' check (emp_type in ('local', 'global')),
  go_live_date date,
  doj date,
  joining_date date,
  laptop_required boolean default false,
  laptop_model text,
  laptop_service_tag text,
  headset_required boolean default false,
  headset_model text,
  headset_service_tag text,
  backpack_required boolean default false,
  backpack_model text,
  monitor_required boolean default false,
  monitor_model text,
  monitor_service_tag text,
  monitor_count integer default 0,
  hub_monitor_required boolean default false,
  hub_monitor_model text,
  hub_monitor_service_tag text,
  hub_monitor_count integer default 0,
  docking_station_required boolean default false,
  docking_station_model text,
  docking_station_service_tag text,
  keyboard_required boolean default false,
  keyboard_quantity integer default 0,
  mouse_required boolean default false,
  mouse_quantity integer default 0,
  assigned_device_count integer default 0,
  status employee_status not null default 'Working',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  email text,
  phone text,
  gst_number text,
  address text,
  created_at timestamptz not null default now()
);

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  asset_tag text not null unique,
  name text not null,
  category asset_category not null,
  model text,
  manufacturer text,
  serial_number text,
  service_tag text unique,
  status asset_status not null default 'Available',
  condition asset_condition not null default 'Good',
  purchase_date date,
  purchase_cost numeric(12,2) default 0,
  vendor_id uuid references vendors(id),
  warranty_start date,
  warranty_end date,
  warranty_status warranty_status not null default 'No Warranty',
  location location_type not null default 'SSC Bangalore',
  building text,
  floor text,
  room text,
  assigned_to uuid references employees(id),
  assigned_date timestamptz,
  received_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  assigned_date timestamptz not null default now(),
  status assignment_status not null default 'Active',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists transfers (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  from_employee_id uuid references employees(id),
  to_employee_id uuid references employees(id),
  reason text not null default 'Temp Allocation',
  transfer_date timestamptz not null default now(),
  status transfer_status not null default 'Completed',
  created_at timestamptz not null default now()
);

create table if not exists returns (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  employee_id uuid not null references employees(id),
  returned_date timestamptz not null default now(),
  condition asset_condition,
  remarks text,
  created_at timestamptz not null default now()
);

create table if not exists exit_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  exit_date date not null,
  reason text,
  asset_return_status text not null default 'Pending',
  total_assets integer not null default 0,
  pending_assets integer not null default 0,
  remarks text,
  created_at timestamptz not null default now()
);

create table if not exists repair_requests (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  employee_id uuid references employees(id),
  issue_summary text not null,
  status repair_status not null default 'Pending',
  reported_date timestamptz not null default now(),
  vendor_name text,
  resolved_date timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists disposal_records (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  reason disposal_reason not null,
  method text,
  status disposal_status not null default 'Pending',
  approval_date timestamptz,
  disposed_date timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  movement_type text not null check (movement_type in ('Inward', 'Outward', 'Transfer', 'Return', 'Exit')),
  reference_id uuid,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists procurement_orders (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references vendors(id),
  category asset_category not null,
  model text,
  quantity integer not null default 1,
  unit_cost numeric(12,2) default 0,
  expected_date date,
  status text not null default 'Pending',
  created_at timestamptz not null default now()
);

alter table employees add column if not exists assigned_device_count integer default 0;

alter table employees enable row level security;
alter table assets enable row level security;
alter table assignments enable row level security;
alter table exit_records enable row level security;

drop policy if exists "employees_allow_all_for_dev" on employees;
create policy "employees_allow_all_for_dev"
on employees
for all
using (true)
with check (true);

drop policy if exists "assets_allow_all_for_dev" on assets;
create policy "assets_allow_all_for_dev"
on assets
for all
using (true)
with check (true);

drop policy if exists "assignments_allow_all_for_dev" on assignments;
create policy "assignments_allow_all_for_dev"
on assignments
for all
using (true)
with check (true);

drop policy if exists "exit_records_allow_all_for_dev" on exit_records;
create policy "exit_records_allow_all_for_dev"
on exit_records
for all
using (true)
with check (true);

create index if not exists idx_assets_status on assets(status);
create index if not exists idx_assets_category on assets(category);
create index if not exists idx_assets_assigned_to on assets(assigned_to);
create index if not exists idx_assignments_employee on assignments(employee_id);
create index if not exists idx_transfers_asset on transfers(asset_id);
create index if not exists idx_returns_employee on returns(employee_id);
create index if not exists idx_exit_employee on exit_records(employee_id);

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at_assets
before update on assets
for each row
execute function update_updated_at_column();

create trigger set_updated_at_employees
before update on employees
for each row
execute function update_updated_at_column();

-- Note:
-- Procurement tables are intentionally kept in the schema, but the UI is temporarily disabled
-- until the procurement workflow and admin configuration are fully defined.
