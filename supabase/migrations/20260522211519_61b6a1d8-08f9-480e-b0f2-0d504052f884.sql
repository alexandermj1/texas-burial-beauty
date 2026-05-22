
-- 1) Column-level restriction on listings cost_price / profit for anon role
REVOKE SELECT (cost_price, profit) ON public.listings FROM anon;
REVOKE SELECT (cost_price, profit) ON public.listings FROM PUBLIC;

-- 2) Tighten user_notifications INSERT policy
DROP POLICY IF EXISTS "Authenticated can create notifications" ON public.user_notifications;

CREATE POLICY "Users create own notifications"
ON public.user_notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff can create notifications for others"
ON public.user_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'agent'::app_role)
);

-- 3) Remove sensitive tables from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.contact_submissions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.customer_notes;

-- 4) Lock down SECURITY DEFINER / utility functions from anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.canonical_property_type(text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.canonical_cemetery(text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
