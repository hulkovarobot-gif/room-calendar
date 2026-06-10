-- Run this in the Supabase SQL editor

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  capacity integer not null default 0
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  title text not null,
  booked_by text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  created_at timestamptz default now()
);

-- Default rooms (upsert so re-running this script is safe)
insert into rooms (name, capacity) values
  ('Zasedací místnost č. 1', 8),
  ('Zasedací místnost č. 2 (prosklená)', 6)
on conflict (name) do nothing;

-- Enable RLS and allow all operations for the anon key (adjust for production)
alter table rooms enable row level security;
alter table bookings enable row level security;

create policy "public read rooms" on rooms for select using (true);
create policy "public insert rooms" on rooms for insert with check (true);
create policy "public read bookings" on bookings for select using (true);
create policy "public insert bookings" on bookings for insert with check (true);
