ALTER TABLE public.contracts ADD COLUMN principal_key text NOT NULL DEFAULT '';

UPDATE public.contracts
SET principal_key = CASE
  WHEN kind = 'poa' THEN public.canonical_property_type(COALESCE(fill_data->>'seller_name', signature_name, ''))
  ELSE ''
END;

ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_submission_id_kind_key;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_submission_kind_principal_key_key UNIQUE (submission_id, kind, principal_key);