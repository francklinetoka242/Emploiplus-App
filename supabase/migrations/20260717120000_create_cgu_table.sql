create extension if not exists "uuid-ossp";

create table if not exists public.cgu (
  id uuid primary key default uuid_generate_v4(),
  content text not null,
  version varchar(50) not null default '1.0',
  is_active boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.cgu enable row level security;

create policy "cgu_select_public" on public.cgu
  for select
  using (true);

create policy "cgu_modify_admins" on public.cgu
  for insert
  with check (auth.role() = 'authenticated');

create policy "cgu_update_admins" on public.cgu
  for update
  using (auth.role() = 'authenticated');

create policy "cgu_delete_admins" on public.cgu
  for delete
  using (auth.role() = 'authenticated');
