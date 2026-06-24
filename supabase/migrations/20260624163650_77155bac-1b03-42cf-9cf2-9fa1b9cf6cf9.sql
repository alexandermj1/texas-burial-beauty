REVOKE SELECT (contact_name, contact_phone, contact_email) ON public.listings FROM anon;
REVOKE SELECT (contact_name, contact_phone, contact_email) ON public.listings FROM PUBLIC;