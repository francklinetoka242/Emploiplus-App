DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'faq_category') THEN
    ALTER TABLE public.faqs
      ALTER COLUMN category TYPE text
      USING category::text;

    DROP TYPE IF EXISTS public.faq_category;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.faq_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

INSERT INTO public.faq_categories (name, sort_order)
VALUES
  ('Compte', 1),
  ('Services', 2),
  ('Autres', 3)
ON CONFLICT (name) DO NOTHING;

GRANT SELECT ON public.faq_categories TO anon, authenticated;
GRANT ALL ON public.faq_categories TO service_role;
ALTER TABLE public.faq_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read faq categories"
  ON public.faq_categories
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage faq categories"
  ON public.faq_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER set_faq_categories_updated_at
  BEFORE UPDATE ON public.faq_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
