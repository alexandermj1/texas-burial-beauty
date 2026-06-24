
-- Add a column to store files the seller uploads through the public form.
ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS seller_attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Allow anonymous public uploads to a sandboxed prefix within the existing
-- private customer-files bucket. Admins already have SELECT/UPDATE/DELETE.
DROP POLICY IF EXISTS "Public can upload seller intake files" ON storage.objects;
CREATE POLICY "Public can upload seller intake files"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'customer-files'
  AND (storage.foldername(name))[1] = 'public-intake'
);
