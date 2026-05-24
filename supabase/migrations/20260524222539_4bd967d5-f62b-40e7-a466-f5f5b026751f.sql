-- 1) user_notifications: replace the overly broad "Staff" INSERT policy
DROP POLICY IF EXISTS "Staff can create notifications for others" ON public.user_notifications;

-- Only admins may insert notifications targeting arbitrary users.
CREATE POLICY "Admins can create notifications for any user"
ON public.user_notifications
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- (The existing "Users create own notifications" policy with
--  WITH CHECK (auth.uid() = user_id) remains in place for everyone else,
--  including agents, who can now only create self-targeted notifications.)

-- 2) listings: ensure cost_price and profit are not readable by anon
--    or by non-privileged authenticated users via column-level privileges.
REVOKE SELECT (cost_price, profit) ON public.listings FROM PUBLIC;
REVOKE SELECT (cost_price, profit) ON public.listings FROM anon;
REVOKE SELECT (cost_price, profit) ON public.listings FROM authenticated;