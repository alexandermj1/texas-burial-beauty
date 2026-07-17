
-- Contract type/status enums
DO $$ BEGIN
  CREATE TYPE public.contract_kind AS ENUM ('listing_agreement','poa');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.contract_status AS ENUM ('draft','sent','viewed','signed','notarized','completed','void');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.contact_submissions(id) ON DELETE CASCADE,
  kind public.contract_kind NOT NULL,
  status public.contract_status NOT NULL DEFAULT 'draft',
  sign_token text UNIQUE,
  sign_token_expires_at timestamptz,
  -- Snapshot of the data used to fill the PDF (so re-rendering is stable)
  fill_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Storage paths inside the private "contracts" bucket
  filled_pdf_path text,
  signed_pdf_path text,
  notarized_pdf_path text,
  -- Signing metadata
  signature_name text,
  signature_image text,        -- data URL of drawn signature
  signature_initials text,
  co_owner_signature_name text,
  co_owner_signature_image text,
  signer_ip text,
  signer_user_agent text,
  sent_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  notarized_at timestamptz,
  completed_at timestamptz,
  -- BlueNotary handoff
  bluenotary_session_url text,
  bluenotary_sent_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, kind)
);

CREATE INDEX IF NOT EXISTS contracts_submission_idx ON public.contracts(submission_id);
CREATE INDEX IF NOT EXISTS contracts_status_idx ON public.contracts(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and agents can view contracts"
  ON public.contracts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'));

CREATE POLICY "Admins and agents can insert contracts"
  ON public.contracts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'));

CREATE POLICY "Admins and agents can update contracts"
  ON public.contracts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'));

CREATE POLICY "Admins can delete contracts"
  ON public.contracts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER contracts_updated_at
BEFORE UPDATE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Submission-level completion + BlueNotary tracking
ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS contracts_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS poa_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS poa_notarized_at timestamptz,
  ADD COLUMN IF NOT EXISTS bluenotary_session_url text;

-- Storage RLS: admins/agents can read + write private contract PDFs; service role always can
CREATE POLICY "Admins and agents can read contract files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'contracts'
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'))
  );

CREATE POLICY "Admins and agents can upload contract files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'contracts'
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'))
  );

CREATE POLICY "Admins and agents can update contract files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'contracts'
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'agent'))
  );

CREATE POLICY "Admins can delete contract files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'contracts'
    AND public.has_role(auth.uid(),'admin')
  );
