-- 1. Add CRM journey columns to contact_submissions
ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS customer_kind text,
  ADD COLUMN IF NOT EXISTS docusign_status text NOT NULL DEFAULT 'not_sent',
  ADD COLUMN IF NOT EXISTS docusign_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS docusign_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS docusign_envelope_url text,
  ADD COLUMN IF NOT EXISTS documents_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_outcome text;

-- Backfill customer_kind from source
UPDATE public.contact_submissions
SET customer_kind = CASE
  WHEN source = 'seller_quote' THEN 'seller'
  WHEN source = 'buy_property_wizard' THEN 'buyer'
  ELSE 'contact'
END
WHERE customer_kind IS NULL;

-- 2. submission_documents table
CREATE TABLE IF NOT EXISTS public.submission_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.contact_submissions(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  label text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz,
  received_at timestamptz,
  file_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submission_documents_submission ON public.submission_documents(submission_id);

ALTER TABLE public.submission_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage submission documents"
ON public.submission_documents
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_submission_documents_updated_at
BEFORE UPDATE ON public.submission_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 3. reminder_log table
CREATE TABLE IF NOT EXISTS public.reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.contact_submissions(id) ON DELETE CASCADE,
  reminder_type text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_via text NOT NULL DEFAULT 'manual_email',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminder_log_submission ON public.reminder_log(submission_id);

ALTER TABLE public.reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage reminder log"
ON public.reminder_log
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));