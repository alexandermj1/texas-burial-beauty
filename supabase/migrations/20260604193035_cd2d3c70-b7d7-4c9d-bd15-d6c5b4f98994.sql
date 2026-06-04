-- Restrict admin access to two whitelisted Google accounts.
-- Remove all existing user_roles entries for users whose email is not whitelisted,
-- and grant 'admin' to the two whitelisted accounts if they already exist.

DELETE FROM public.user_roles
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE lower(email) NOT IN ('emmamaclarenjames@gmail.com', 'alexandermaclarenjames@gmail.com')
);

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE lower(u.email) IN ('emmamaclarenjames@gmail.com', 'alexandermaclarenjames@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;