-- Create privacy_policy table for dynamic privacy policy management
CREATE TABLE IF NOT EXISTS public.privacy_policy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.privacy_policy TO anon, authenticated;
GRANT ALL ON public.privacy_policy TO service_role;
ALTER TABLE public.privacy_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read privacy policy" ON public.privacy_policy
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage privacy policy" ON public.privacy_policy
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER set_privacy_policy_updated_at
  BEFORE UPDATE ON public.privacy_policy
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
