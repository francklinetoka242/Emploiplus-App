DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE public.notification_type AS ENUM ('candidature', 'admin', 'evenement', 'offre', 'contact', 'job', 'blog');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status') THEN
    CREATE TYPE public.notification_status AS ENUM ('active', 'masked');
  END IF;
END $$;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS status public.notification_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

UPDATE public.notifications
SET
  content = COALESCE(content, body),
  created_at = COALESCE(created_at, now());

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_user_id_fkey') THEN
    BEGIN
      ALTER TABLE public.notifications
        ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE SET NULL;
    EXCEPTION WHEN undefined_table THEN
      -- ignore if users table does not exist yet
      NULL;
    END;
  END IF;
END $$;

ALTER TABLE public.notifications
  ALTER COLUMN type TYPE public.notification_type USING
    CASE
      WHEN type IN ('candidature', 'admin', 'evenement', 'offre', 'contact', 'job', 'blog') THEN type::public.notification_type
      ELSE 'admin'::public.notification_type
    END;

ALTER TABLE public.notifications
  ALTER COLUMN title TYPE text USING title::text;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'notif staff manage' AND polrelid = 'public.notifications'::regclass) THEN
    PERFORM 1;
  ELSE
    CREATE POLICY "notif staff manage" ON public.notifications
      FOR ALL TO authenticated
      USING (public.is_staff(auth.uid()))
      WITH CHECK (public.is_staff(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'notif user read' AND polrelid = 'public.notifications'::regclass) THEN
    CREATE POLICY "notif user read" ON public.notifications
      FOR SELECT TO authenticated
      USING (status = 'active' AND (user_id IS NULL OR user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'notif user update own' AND polrelid = 'public.notifications'::regclass) THEN
    CREATE POLICY "notif user update own" ON public.notifications
      FOR UPDATE TO authenticated
      USING (user_id IS NULL OR user_id = auth.uid())
      WITH CHECK (user_id IS NULL OR user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'notif user delete own' AND polrelid = 'public.notifications'::regclass) THEN
    CREATE POLICY "notif user delete own" ON public.notifications
      FOR DELETE TO authenticated
      USING (user_id IS NULL OR user_id = auth.uid());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications (status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);
