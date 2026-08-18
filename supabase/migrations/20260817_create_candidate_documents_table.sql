-- Create candidate_documents table for storing document metadata
CREATE TABLE public.candidate_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other',
  custom_type TEXT,
  display_name TEXT,
  size INTEGER,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_candidate_documents_candidate_id ON public.candidate_documents(candidate_id);
CREATE INDEX idx_candidate_documents_created_at ON public.candidate_documents(created_at);
CREATE INDEX idx_candidate_documents_type ON public.candidate_documents(type);

-- Enable RLS
ALTER TABLE public.candidate_documents ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_documents TO authenticated;
GRANT ALL ON public.candidate_documents TO service_role;

-- Policies
CREATE POLICY "Users see their own documents" ON public.candidate_documents FOR SELECT TO authenticated
  USING (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()));

CREATE POLICY "Users insert own documents" ON public.candidate_documents FOR INSERT TO authenticated
  WITH CHECK (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()));

CREATE POLICY "Users update own documents" ON public.candidate_documents FOR UPDATE TO authenticated
  USING (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()))
  WITH CHECK (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()));

CREATE POLICY "Users delete own documents" ON public.candidate_documents FOR DELETE TO authenticated
  USING (candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER set_candidate_documents_updated_at BEFORE UPDATE ON public.candidate_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
