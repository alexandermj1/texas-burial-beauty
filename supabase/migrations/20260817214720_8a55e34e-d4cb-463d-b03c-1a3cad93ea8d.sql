
REVOKE ALL ON FUNCTION public.notify_staff(text, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submission_milestone_notify() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.document_received_notify() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.contract_signed_notify() FROM PUBLIC, anon, authenticated;
