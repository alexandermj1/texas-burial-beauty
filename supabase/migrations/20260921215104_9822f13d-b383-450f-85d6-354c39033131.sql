
CREATE OR REPLACE FUNCTION public.notification_group(_source_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _source_type IN ('payment','payment_received','listing_paid','listing_tier') THEN 'payment'
    WHEN _source_type IN ('document_received','document_upload','documents_completed','poa_signed','poa_notarized','mail_confirmed') THEN 'documents'
    WHEN _source_type IN ('submission','tree_completed') THEN 'tree'
    WHEN _source_type IN ('contract_signed','la_signed','la_countersigned','contracts_completed') THEN 'contracts'
    ELSE NULL
  END
$$;

REVOKE ALL ON FUNCTION public.notification_group(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.collapse_duplicate_notifications() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notification_group(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.collapse_duplicate_notifications() TO service_role;
