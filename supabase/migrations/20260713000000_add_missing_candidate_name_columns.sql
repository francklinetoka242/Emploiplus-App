ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS first_name TEXT;

ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS last_name TEXT;
