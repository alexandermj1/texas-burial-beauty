-- Fix the admin email address from emmamaclarenjames@gmail.com to emmamaclaren@gmail.com
-- Remove any existing admin role tied to the incorrect email
DELETE FROM public.user_roles
WHERE user_id IN (
  SELECT id FROM auth.users WHERE lower(email) = 'emmamaclarenjames@gmail.com'
);

-- Grant admin role to the corrected email if the user exists
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE lower(u.email) = 'emmamaclaren@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;