CREATE TABLE public.purchase_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_submission_id uuid NOT NULL REFERENCES public.contact_submissions(id),
  buyer_submission_id uuid NOT NULL REFERENCES public.contact_submissions(id),
  status text NOT NULL DEFAULT 'draft',
  sign_token text UNIQUE,
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  terms_version text NOT NULL DEFAULT 'tcb-pa-2026-11',
  document_hash text,
  buyer_signature jsonb,
  countersignature jsonb,
  events jsonb NOT NULL DEFAULT '[]'::jsonb,
  signed_pdf_path text,
  payment_transaction_id uuid,
  payment_url text,
  sent_at timestamptz,
  viewed_at timestamptz,
  buyer_signed_at timestamptz,
  countersigned_at timestamptz,
  paid_at timestamptz,
  voided_at timestamptz,
  void_reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX purchase_agreements_seller_idx ON public.purchase_agreements(seller_submission_id);
CREATE INDEX purchase_agreements_buyer_idx ON public.purchase_agreements(buyer_submission_id);

GRANT SELECT, INSERT, UPDATE ON public.purchase_agreements TO authenticated;
GRANT ALL ON public.purchase_agreements TO service_role;
ALTER TABLE public.purchase_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read purchase agreements" ON public.purchase_agreements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));

CREATE OR REPLACE FUNCTION public.purchase_agreements_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('draft','sent','viewed','buyer_signed','countersigned','paid','void') THEN
    RAISE EXCEPTION 'invalid purchase agreement status %', NEW.status;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER purchase_agreements_validate BEFORE INSERT OR UPDATE ON public.purchase_agreements
  FOR EACH ROW EXECUTE FUNCTION public.purchase_agreements_validate();
CREATE TRIGGER purchase_agreements_updated_at BEFORE UPDATE ON public.purchase_agreements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER zzz_audit_row_change AFTER UPDATE ON public.purchase_agreements
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER zzz_prevent_hard_delete BEFORE DELETE ON public.purchase_agreements
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();