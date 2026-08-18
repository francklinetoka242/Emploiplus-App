-- Create email verification codes table
CREATE TABLE IF NOT EXISTS public.email_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for efficient lookups
CREATE INDEX idx_email_verification_codes_email ON public.email_verification_codes(email);
CREATE INDEX idx_email_verification_codes_code ON public.email_verification_codes(code);
CREATE INDEX idx_email_verification_codes_user_id ON public.email_verification_codes(user_id);
CREATE INDEX idx_email_verification_codes_expires_at ON public.email_verification_codes(expires_at);

-- Enable RLS
ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

-- Policies - Allow service_role to manage codes
CREATE POLICY "Service role can manage email verification codes"
  ON public.email_verification_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users to insert (for unconfirmed users)
CREATE POLICY "Allow inserting for registration"
  ON public.email_verification_codes
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow checking code during verification
CREATE POLICY "Allow selecting for verification"
  ON public.email_verification_codes
  FOR SELECT
  TO anon
  USING (true);
