-- =========================================================
-- Migration: création des fiches conseils locales (local_guides)
-- =========================================================

create extension if not exists pgcrypto;

-- Si la table profiles n'existe pas encore, on la crée.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'candidate'
    check (role in ('candidate', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Table des fiches conseils locales
create table if not exists public.local_guides (
  id uuid primary key default gen_random_uuid(),
  title varchar(255) not null,
  slug varchar(255) not null unique,
  category varchar(100) not null,
  description text not null,
  image_url text,
  document_url text not null,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Fonction utilitaire pour vérifier si l'utilisateur est admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.is_active = true
      and ur.role in ('admin', 'super_admin')
  ) or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  );
$$;

-- Trigger pour mettre à jour updated_at automatiquement
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_local_guides_updated_at on public.local_guides;
create trigger trg_local_guides_updated_at
before update on public.local_guides
for each row
execute function public.set_updated_at();

-- Activation de la RLS
alter table public.local_guides enable row level security;

-- Lecture : tous les utilisateurs authentifiés
-- Supprime la politique si elle existe pour permettre un rerun propre de la migration.
drop policy if exists local_guides_select_authenticated on public.local_guides;
create policy local_guides_select_authenticated
on public.local_guides
for select
to authenticated
using (true);

-- Insertion : réservée aux admins
drop policy if exists local_guides_insert_admin on public.local_guides;
create policy local_guides_insert_admin
on public.local_guides
for insert
to authenticated
with check (public.is_admin());

-- Mise à jour : réservée aux admins
drop policy if exists local_guides_update_admin on public.local_guides;
create policy local_guides_update_admin
on public.local_guides
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Suppression : réservée aux admins
drop policy if exists local_guides_delete_admin on public.local_guides;
create policy local_guides_delete_admin
on public.local_guides
for delete
to authenticated
using (public.is_admin());
