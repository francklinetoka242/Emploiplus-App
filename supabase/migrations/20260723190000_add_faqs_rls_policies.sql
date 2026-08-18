-- Add row-level security policies for FAQ management

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.faqs TO anon, authenticated;
GRANT ALL ON public.faqs TO service_role;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Public can read faqs' AND polrelid = 'public.faqs'::regclass) THEN
    CREATE POLICY "Public can read faqs" ON public.faqs
      FOR SELECT TO anon, authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins can manage faqs' AND polrelid = 'public.faqs'::regclass) THEN
    CREATE POLICY "Admins can manage faqs" ON public.faqs
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
  END IF;
END $$;
