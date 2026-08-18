
-- ========== ROLES ==========
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'editor');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

CREATE POLICY "Users see their own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Super admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ========== UPDATED AT TRIGGER ==========
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ========== SERVICES ==========
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  image TEXT,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.services TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads active services" ON public.services FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.is_staff(auth.uid()));
CREATE POLICY "Staff manage services" ON public.services FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER set_services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== JOB OFFERS ==========
CREATE TYPE public.job_status AS ENUM ('draft', 'published', 'archived', 'expired');
CREATE TYPE public.contract_type AS ENUM ('cdi', 'cdd', 'stage', 'freelance', 'consultance', 'temps_partiel', 'interim');

CREATE TABLE public.job_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  company_logo TEXT,
  location_city TEXT,
  location_country TEXT,
  contract_type contract_type,
  description TEXT NOT NULL,
  requirements TEXT,
  application_email TEXT,
  application_whatsapp TEXT,
  external_link TEXT,
  cover_image TEXT,
  status job_status NOT NULL DEFAULT 'draft',
  publish_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_job_offers_status ON public.job_offers(status, created_at DESC);
CREATE INDEX idx_job_offers_slug ON public.job_offers(slug);
GRANT SELECT ON public.job_offers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.job_offers TO authenticated;
GRANT ALL ON public.job_offers TO service_role;
ALTER TABLE public.job_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads published jobs" ON public.job_offers FOR SELECT TO anon, authenticated
  USING (status = 'published' OR public.is_staff(auth.uid()));
CREATE POLICY "Staff manage jobs" ON public.job_offers FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER set_job_offers_updated_at BEFORE UPDATE ON public.job_offers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== BLOG POSTS ==========
CREATE TYPE public.post_status AS ENUM ('draft', 'published', 'archived');

CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  content TEXT NOT NULL,
  excerpt TEXT,
  author TEXT,
  image TEXT,
  video_url TEXT,
  external_link TEXT,
  category TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status post_status NOT NULL DEFAULT 'draft',
  publish_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_blog_posts_status ON public.blog_posts(status, created_at DESC);
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
GRANT SELECT ON public.blog_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads published posts" ON public.blog_posts FOR SELECT TO anon, authenticated
  USING (status = 'published' OR public.is_staff(auth.uid()));
CREATE POLICY "Staff manage posts" ON public.blog_posts FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER set_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== CONTACT MESSAGES ==========
CREATE TYPE public.message_status AS ENUM ('new', 'read', 'archived');

CREATE TABLE public.contacts_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  status message_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.contacts_messages TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.contacts_messages TO authenticated;
GRANT ALL ON public.contacts_messages TO service_role;
ALTER TABLE public.contacts_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a message" ON public.contacts_messages FOR INSERT TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY "Staff read messages" ON public.contacts_messages FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff update messages" ON public.contacts_messages FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete messages" ON public.contacts_messages FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));
