ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_submissions;
ALTER TABLE public.contact_submissions REPLICA IDENTITY FULL;