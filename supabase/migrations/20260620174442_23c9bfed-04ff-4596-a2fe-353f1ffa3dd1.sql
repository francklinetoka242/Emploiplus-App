
-- Enum: add 'scheduled' to job_status if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.job_status'::regtype AND enumlabel = 'scheduled') THEN
    ALTER TYPE public.job_status ADD VALUE 'scheduled' BEFORE 'published';
  END IF;
END $$;

-- job_offers extensions
ALTER TABLE public.job_offers
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS featured_until timestamptz,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS og_image text,
  ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_job_offers_status_pub ON public.job_offers (status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_offers_featured ON public.job_offers (featured_until DESC) WHERE featured_until IS NOT NULL;

-- blog_posts extensions
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS og_image text,
  ADD COLUMN IF NOT EXISTS reading_time integer,
  ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS author text,
  ADD COLUMN IF NOT EXISTS category text;

CREATE INDEX IF NOT EXISTS idx_blog_posts_views ON public.blog_posts (views_count DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts (category);

-- cms_sections
CREATE TABLE IF NOT EXISTS public.cms_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  title text NOT NULL,
  content_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cms_sections TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cms_sections TO authenticated;
GRANT ALL ON public.cms_sections TO service_role;
ALTER TABLE public.cms_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cms public read" ON public.cms_sections FOR SELECT USING (true);
CREATE POLICY "cms staff write" ON public.cms_sections FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER cms_sections_updated BEFORE UPDATE ON public.cms_sections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif staff read" ON public.notifications FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "notif staff update" ON public.notifications FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications (created_at DESC) WHERE read_at IS NULL;

-- page_views (lightweight analytics)
CREATE TABLE IF NOT EXISTS public.page_views (
  id bigserial PRIMARY KEY,
  path text NOT NULL,
  country text,
  city text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.page_views TO anon, authenticated;
GRANT USAGE ON SEQUENCE public.page_views_id_seq TO anon, authenticated;
GRANT SELECT ON public.page_views TO authenticated;
GRANT ALL ON public.page_views TO service_role;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pv public insert" ON public.page_views FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "pv staff read" ON public.page_views FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_page_views_created ON public.page_views (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON public.page_views (path);

-- Maintenance functions
CREATE OR REPLACE FUNCTION public.expire_jobs()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE public.job_offers SET status = 'expired'
  WHERE status = 'published' AND expires_at IS NOT NULL AND expires_at < now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.publish_scheduled_jobs()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE public.job_offers SET status = 'published', published_at = COALESCE(published_at, now())
  WHERE status = 'scheduled' AND published_at IS NOT NULL AND published_at <= now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.publish_scheduled_posts()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE public.blog_posts SET status = 'published', published_at = COALESCE(published_at, now())
  WHERE status = 'draft' AND scheduled_at IS NOT NULL AND scheduled_at <= now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- Notification triggers
CREATE OR REPLACE FUNCTION public.notify_new_contact()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (type, title, body, link)
  VALUES ('contact', 'Nouveau message', COALESCE(NEW.name, '') || ' — ' || COALESCE(NEW.subject, ''), '/admin/messages');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_new_contact ON public.contacts_messages;
CREATE TRIGGER trg_notify_new_contact AFTER INSERT ON public.contacts_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_contact();

CREATE OR REPLACE FUNCTION public.notify_job_published()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    INSERT INTO public.notifications (type, title, body, link)
    VALUES ('job', 'Offre publiée', NEW.title || ' — ' || NEW.company, '/jobs/' || NEW.slug);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_job_published ON public.job_offers;
CREATE TRIGGER trg_notify_job_published AFTER INSERT OR UPDATE OF status ON public.job_offers
  FOR EACH ROW EXECUTE FUNCTION public.notify_job_published();

CREATE OR REPLACE FUNCTION public.notify_post_published()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    INSERT INTO public.notifications (type, title, body, link)
    VALUES ('blog', 'Article publié', NEW.title, '/blog/' || NEW.slug);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_post_published ON public.blog_posts;
CREATE TRIGGER trg_notify_post_published AFTER INSERT OR UPDATE OF status ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_post_published();
