-- Migration : ajout de la visibilité aux fiches conseils locales

alter table if exists public.local_guides
  add column if not exists visible boolean not null default true;

-- Mise à jour de la politique de lecture pour que seuls les guides visibles
-- soient accessibles aux utilisateurs non-admins.
drop policy if exists local_guides_select_authenticated on public.local_guides;
create policy local_guides_select_authenticated
on public.local_guides
for select
to authenticated
using (visible = true or public.is_admin());
