CREATE OR REPLACE FUNCTION public.document_received_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  who text;
  recent boolean;
  n_docs int;
BEGIN
  IF NEW.status = 'received' AND OLD.status IS DISTINCT FROM 'received' THEN
    SELECT COALESCE(NULLIF(cs.name, ''), cs.email, 'A seller') INTO who
    FROM public.contact_submissions cs WHERE cs.id = NEW.submission_id;

    -- Collapse bursts: several documents returned in one upload (e.g. a joint
    -- POA that spans multiple checklist rows) must produce a single alert.
    SELECT EXISTS (
      SELECT 1 FROM public.user_notifications
      WHERE source_type = 'document_received'
        AND source_id = NEW.submission_id
        AND created_at > now() - interval '15 minutes'
    ) INTO recent;
    IF recent THEN RETURN NEW; END IF;

    SELECT count(*) INTO n_docs
    FROM public.submission_documents d
    WHERE d.submission_id = NEW.submission_id
      AND d.status = 'received'
      AND d.updated_at > now() - interval '5 minutes';

    INSERT INTO public.user_notifications (user_id, title, body, link_url, source_type, source_id)
    SELECT DISTINCT ur.user_id,
           COALESCE(who, 'A seller') || ' returned a document',
           NEW.label || COALESCE(' · ' || NEW.person_name, '')
             || CASE WHEN n_docs > 1 THEN ' (and ' || (n_docs - 1) || ' more) have been received.' ELSE ' has been received.' END,
           '/admin?tab=submissions&submission=' || NEW.submission_id::text,
           'document_received', NEW.submission_id
    FROM public.user_roles ur
    WHERE ur.role IN ('admin', 'staff');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.contract_signed_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  who text;
  kind_label text := replace(NEW.kind::text, '_', ' ');
  recent boolean;
BEGIN
  IF NEW.signed_at IS NOT NULL AND OLD.signed_at IS NULL THEN
    SELECT COALESCE(NULLIF(cs.name, ''), cs.email, 'A seller') INTO who
    FROM public.contact_submissions cs WHERE cs.id = NEW.submission_id;

    SELECT EXISTS (
      SELECT 1 FROM public.user_notifications
      WHERE source_type = 'contract_signed'
        AND source_id = NEW.id
    ) INTO recent;
    IF recent THEN RETURN NEW; END IF;

    INSERT INTO public.user_notifications (user_id, title, body, link_url, source_type, source_id)
    SELECT DISTINCT ur.user_id,
           COALESCE(who, 'A seller') || ' signed the ' || kind_label,
           'A signed copy is saved on the submission.',
           '/admin?tab=submissions&submission=' || NEW.submission_id::text,
           'contract_signed', NEW.id
    FROM public.user_roles ur
    WHERE ur.role IN ('admin', 'staff');
  END IF;
  RETURN NEW;
END;
$function$;