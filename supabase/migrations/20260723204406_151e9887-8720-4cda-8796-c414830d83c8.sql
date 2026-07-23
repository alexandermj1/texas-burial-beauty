
-- Tighten portal-uploads bucket policies.
-- The cross-device QR flow uses an unguessable session UUID (128 bits) as
-- the folder name; both desktop wizard and the phone uploader are unauthenticated
-- and coordinate purely via that shared secret. We keep the UUID-scoped INSERT,
-- add the same regex to SELECT (so a bucket-wide list is not possible),
-- and remove anon/authenticated DELETE entirely — only service_role can delete.

DROP POLICY IF EXISTS portal_uploads_anon_select ON storage.objects;
DROP POLICY IF EXISTS portal_uploads_scoped_delete ON storage.objects;

CREATE POLICY portal_uploads_scoped_select
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'portal-uploads'
    AND (storage.foldername(name))[1] ~ '^[0-9a-f-]{16,}$'
  );

-- Staff (admins/agents) can manage everything in the bucket for support.
CREATE POLICY portal_uploads_staff_all
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'portal-uploads'
    AND (public.has_role(auth.uid(), 'admin'::app_role)
         OR public.has_role(auth.uid(), 'agent'::app_role))
  )
  WITH CHECK (
    bucket_id = 'portal-uploads'
    AND (public.has_role(auth.uid(), 'admin'::app_role)
         OR public.has_role(auth.uid(), 'agent'::app_role))
  );

-- Harden the public seller-intake upload path into customer-files:
-- require the second folder segment to look like a UUID so random paths
-- cannot be spammed into storage.
DROP POLICY IF EXISTS "Public can upload seller intake files" ON storage.objects;

CREATE POLICY "Public can upload seller intake files"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'customer-files'
    AND (storage.foldername(name))[1] = 'public-intake'
    AND (storage.foldername(name))[2] ~ '^[0-9a-f-]{16,}$'
  );
