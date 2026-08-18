-- Supabase Auth Custom Access Token Hook
-- Prêt à exécuter dans la console SQL de Supabase

-- 1) Autoriser l'utilisateur système Supabase Auth à lire la table user_roles
GRANT SELECT ON public.user_roles TO supabase_auth_admin;

-- 2) Fonction de hook pour injecter les claims app_metadata.roles et app_metadata.permissions
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  user_id_text text;
  target_user_id uuid;
  role_rows record;
  roles_array text[] := ARRAY[]::text[];
  permissions_array text[] := ARRAY[]::text[];
  claims jsonb;
  app_metadata jsonb;
BEGIN
  user_id_text := event ->> 'user_id';
  IF user_id_text IS NULL OR user_id_text = '' THEN
    RETURN event;
  END IF;

  target_user_id := user_id_text::uuid;

  FOR role_rows IN
    SELECT role
    FROM public.user_roles
    WHERE user_id = target_user_id
      AND is_active = true
      AND role IS NOT NULL
  LOOP
    roles_array := array_append(roles_array, role_rows.role);
  END LOOP;

  -- Map roles to permissions using the same authorization model as the app
  IF roles_array @> ARRAY['super_admin'] THEN
    permissions_array := ARRAY[
      'jobs.read',
      'jobs.create',
      'jobs.edit',
      'jobs.delete',
      'candidate.read',
      'candidate.update',
      'candidate.apply',
      'blog.read',
      'blog.write',
      'notifications.read',
      'notifications.manage',
      'services.manage',
      'dashboard.admin',
      'dashboard.candidate',
      'seo.manage',
      'team.manage'
    ];
  ELSIF roles_array @> ARRAY['admin'] THEN
    permissions_array := ARRAY[
      'jobs.read',
      'jobs.create',
      'jobs.edit',
      'jobs.delete',
      'candidate.read',
      'candidate.update',
      'blog.read',
      'blog.write',
      'notifications.read',
      'notifications.manage',
      'services.manage',
      'dashboard.admin',
      'dashboard.candidate',
      'seo.manage',
      'team.manage'
    ];
  ELSIF roles_array @> ARRAY['editor'] THEN
    permissions_array := ARRAY[
      'jobs.read',
      'blog.read',
      'blog.write',
      'notifications.read',
      'services.manage'
    ];
  END IF;

  claims := COALESCE(event -> 'claims', '{}'::jsonb);
  app_metadata := COALESCE(claims -> 'app_metadata', '{}'::jsonb);

  app_metadata := app_metadata
    || jsonb_build_object(
      'roles', to_jsonb(roles_array),
      'permissions', to_jsonb(permissions_array)
    );

  claims := jsonb_set(claims, '{app_metadata}', app_metadata, true);

  RETURN jsonb_set(event, '{claims}', claims, true);
END;
$$;

-- 3) Instructions d'activation dans le Dashboard Supabase
-- Auth > Hooks > Custom Access Token
-- 1. Sélectionner le hook "custom_access_token"
-- 2. Définir la fonction : public.custom_access_token_hook
-- 3. Enregistrer et activer le hook
-- 4. Déployer / sauvegarder les changements
