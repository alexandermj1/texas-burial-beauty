
CREATE OR REPLACE FUNCTION public.notification_group(_source_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _source_type IN ('payment','payment_received','listing_paid','listing_tier') THEN 'payment'
    WHEN _source_type IN ('document_received','document_upload','documents_completed','poa_signed','poa_notarized','mail_confirmed') THEN 'documents'
    WHEN _source_type IN ('submission','tree_completed') THEN 'tree'
    WHEN _source_type IN ('contract_signed','la_signed','la_countersigned','contracts_completed') THEN 'contracts'
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION public.collapse_duplicate_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  grp text;
BEGIN
  -- Person-to-person messages are never collapsed.
  IF NEW.source_id IS NULL OR NEW.source_type IN ('direct_message','broadcast') THEN
    RETURN NEW;
  END IF;

  -- Same exact event for the same person: only ever announce it once.
  IF EXISTS (
    SELECT 1 FROM public.user_notifications
    WHERE user_id = NEW.user_id
      AND source_type = NEW.source_type
      AND source_id = NEW.source_id
  ) THEN
    RETURN NULL;
  END IF;

  grp := public.notification_group(NEW.source_type);

  -- Related steps of one action (e.g. a payment writing three records) collapse
  -- into the first notification within a short window.
  IF grp IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_notifications n
    WHERE n.user_id = NEW.user_id
      AND n.source_id = NEW.source_id
      AND public.notification_group(n.source_type) = grp
      AND n.created_at > now() - interval '15 minutes'
  ) THEN
    RETURN NULL;
  END IF;

  -- One save that ticks several unrelated milestones at once still produces a
  -- single alert rather than a burst.
  IF EXISTS (
    SELECT 1 FROM public.user_notifications n
    WHERE n.user_id = NEW.user_id
      AND n.source_id = NEW.source_id
      AND n.created_at > now() - interval '90 seconds'
  ) THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS collapse_duplicate_notifications ON public.user_notifications;
CREATE TRIGGER collapse_duplicate_notifications
BEFORE INSERT ON public.user_notifications
FOR EACH ROW EXECUTE FUNCTION public.collapse_duplicate_notifications();
