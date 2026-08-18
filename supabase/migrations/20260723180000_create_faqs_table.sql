DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'faq_category') THEN
    CREATE TYPE public.faq_category AS ENUM ('question', 'response');
  END IF;
END$$;

create table if not exists public.faqs (
  id uuid primary key default uuid_generate_v4(),
  question text not null,
  answer text not null,
  category public.faq_category not null default 'question',
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT ON public.faqs TO anon, authenticated;
GRANT ALL ON public.faqs TO service_role;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read faqs" ON public.faqs
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage faqs" ON public.faqs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

create trigger set_faqs_updated_at
  before update on public.faqs
  for each row execute function public.set_updated_at();
