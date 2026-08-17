
CREATE OR REPLACE FUNCTION public.notify_staff(_title text, _body text, _submission_id uuid, _source_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_notifications
    WHERE source_type = _source_type AND source_id = _submission_id
  ) INTO _exists;
  IF _exists THEN RETURN; END IF;

  INSERT INTO public.user_notifications (user_id, title, body, link_url, source_type, source_id)
  SELECT DISTINCT ur.user_id, _title, _body,
         '/admin?tab=submissions&submission=' || _submission_id::text,
         _source_type, _submission_id
  FROM public.user_roles ur
  WHERE ur.role IN ('admin', 'staff');
END;
$$;

CREATE OR REPLACE FUNCTION public.submission_milestone_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  who text := COALESCE(NULLIF(NEW.name, ''), NEW.email, 'A seller');
  amt text;
BEGIN
  IF NEW.accepted_quote_amount IS NOT NULL AND OLD.accepted_quote_amount IS DISTINCT FROM NEW.accepted_quote_amount THEN
    amt := to_char(NEW.accepted_quote_amount, 'FM999,999,990');
    PERFORM public.notify_staff(who || ' accepted a quote', 'Agreed price $' || amt || COALESCE(' · ' || NEW.cemetery, '') || '.', NEW.id, 'quote_accepted');
  END IF;

  IF NEW.listing_paid_at IS NOT NULL AND OLD.listing_paid_at IS NULL THEN
    PERFORM public.notify_staff(who || ' paid their listing fee', COALESCE(initcap(NEW.listing_tier) || ' listing', 'Listing') || ' payment received.', NEW.id, 'listing_paid');
  END IF;

  IF NEW.payment_received_at IS NOT NULL AND OLD.payment_received_at IS NULL THEN
    PERFORM public.notify_staff('Payment received from ' || who, 'A Stripe payment has cleared on this submission.', NEW.id, 'payment_received');
  END IF;

  IF (NEW.ownership_answers->>'sellerConfirmedAt') IS NOT NULL
     AND (OLD.ownership_answers->>'sellerConfirmedAt') IS NULL THEN
    PERFORM public.notify_staff(who || ' completed the family tree', 'The ownership questionnaire is finished — review it and build the document checklist.', NEW.id, 'tree_completed');
  END IF;

  IF NEW.la_signed_at IS NOT NULL AND OLD.la_signed_at IS NULL THEN
    PERFORM public.notify_staff(who || ' signed the listing agreement', 'Ready for broker countersignature.', NEW.id, 'la_signed');
  END IF;

  IF NEW.la_countersigned_at IS NOT NULL AND OLD.la_countersigned_at IS NULL THEN
    PERFORM public.notify_staff('Listing agreement countersigned for ' || who, 'The agreement is now fully executed.', NEW.id, 'la_countersigned');
  END IF;

  IF NEW.poa_signed_at IS NOT NULL AND OLD.poa_signed_at IS NULL THEN
    PERFORM public.notify_staff(who || ' signed the power of attorney', 'The POA has been signed.', NEW.id, 'poa_signed');
  END IF;

  IF NEW.poa_notarized_at IS NOT NULL AND OLD.poa_notarized_at IS NULL THEN
    PERFORM public.notify_staff('POA notarized for ' || who, 'The notarized power of attorney is on file.', NEW.id, 'poa_notarized');
  END IF;

  IF NEW.documents_completed_at IS NOT NULL AND OLD.documents_completed_at IS NULL THEN
    PERFORM public.notify_staff(who || ' returned every document', 'All requested paperwork has now been received.', NEW.id, 'documents_completed');
  END IF;

  IF NEW.contracts_completed_at IS NOT NULL AND OLD.contracts_completed_at IS NULL THEN
    PERFORM public.notify_staff('Contracts complete for ' || who, 'Every contract on this submission is signed.', NEW.id, 'contracts_completed');
  END IF;

  IF NEW.listing_live_at IS NOT NULL AND OLD.listing_live_at IS NULL THEN
    PERFORM public.notify_staff('Listing is live for ' || who, COALESCE(NEW.cemetery || ' is now published.', 'The property is now published.'), NEW.id, 'listing_live');
  END IF;

  IF NEW.sold_at IS NOT NULL AND OLD.sold_at IS NULL THEN
    PERFORM public.notify_staff('Property sold for ' || who, COALESCE('Sold for $' || to_char(NEW.sold_price, 'FM999,999,990'), 'The property has sold') || '.', NEW.id, 'sold');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_submission_milestone_notify ON public.contact_submissions;
CREATE TRIGGER trg_submission_milestone_notify
AFTER UPDATE ON public.contact_submissions
FOR EACH ROW EXECUTE FUNCTION public.submission_milestone_notify();

CREATE OR REPLACE FUNCTION public.document_received_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  who text;
BEGIN
  IF NEW.status = 'received' AND OLD.status IS DISTINCT FROM 'received' THEN
    SELECT COALESCE(NULLIF(cs.name, ''), cs.email, 'A seller') INTO who
    FROM public.contact_submissions cs WHERE cs.id = NEW.submission_id;

    INSERT INTO public.user_notifications (user_id, title, body, link_url, source_type, source_id)
    SELECT DISTINCT ur.user_id,
           COALESCE(who, 'A seller') || ' returned a document',
           NEW.label || COALESCE(' · ' || NEW.person_name, '') || ' has been received.',
           '/admin?tab=submissions&submission=' || NEW.submission_id::text,
           'document_received', NEW.submission_id
    FROM public.user_roles ur
    WHERE ur.role IN ('admin', 'staff');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_document_received_notify ON public.submission_documents;
CREATE TRIGGER trg_document_received_notify
AFTER UPDATE ON public.submission_documents
FOR EACH ROW EXECUTE FUNCTION public.document_received_notify();

CREATE OR REPLACE FUNCTION public.contract_signed_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  who text;
  kind_label text := replace(NEW.kind::text, '_', ' ');
BEGIN
  IF NEW.signed_at IS NOT NULL AND OLD.signed_at IS NULL THEN
    SELECT COALESCE(NULLIF(cs.name, ''), cs.email, 'A seller') INTO who
    FROM public.contact_submissions cs WHERE cs.id = NEW.submission_id;

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
$$;

DROP TRIGGER IF EXISTS trg_contract_signed_notify ON public.contracts;
CREATE TRIGGER trg_contract_signed_notify
AFTER UPDATE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.contract_signed_notify();
