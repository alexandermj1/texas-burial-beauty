
UPDATE public.contact_submissions cs
SET deleted_at = now()
WHERE cs.deleted_at IS NULL
  AND cs.inquiry_channel = 'email_inbound'
  AND cs.source_email_id IN (
    SELECT id FROM public.email_messages
    WHERE LOWER(COALESCE(from_email,'')) <> 'info@texascemeterybrokers.com'
      AND LOWER(COALESCE(to_email,'')) NOT LIKE '%info@texascemeterybrokers.com%'
  );

DELETE FROM public.email_messages
WHERE LOWER(COALESCE(from_email,'')) <> 'info@texascemeterybrokers.com'
  AND LOWER(COALESCE(to_email,'')) NOT LIKE '%info@texascemeterybrokers.com%';
