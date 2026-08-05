ALTER TYPE public.contract_kind ADD VALUE IF NOT EXISTS 'affidavit_heirship';
ALTER TYPE public.contract_kind ADD VALUE IF NOT EXISTS 'spousal_consent';

ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS ownership_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ownership_roster jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ownership_reviewed_at timestamptz;

ALTER TABLE public.submission_documents
  ADD COLUMN IF NOT EXISTS doc_code text,
  ADD COLUMN IF NOT EXISTS person_name text,
  ADD COLUMN IF NOT EXISTS person_role text,
  ADD COLUMN IF NOT EXISTS manual_override text,
  ADD COLUMN IF NOT EXISTS required_state text NOT NULL DEFAULT 'needed',
  ADD COLUMN IF NOT EXISTS issued_by_us boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS needs_notary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS why text,
  ADD COLUMN IF NOT EXISTS statute_ref text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS submission_documents_unique_item
  ON public.submission_documents (submission_id, doc_code, coalesce(person_name, ''))
  WHERE doc_code IS NOT NULL;

ALTER TABLE public.texas_cemeteries
  ADD COLUMN IF NOT EXISTS doc_rules jsonb NOT NULL DEFAULT '{}'::jsonb;