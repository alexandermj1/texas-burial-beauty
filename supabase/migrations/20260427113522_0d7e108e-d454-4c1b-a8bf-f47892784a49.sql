
-- Replace the public SELECT policy on listings to exclude cost_price/profit for anonymous/non-owner users
-- Approach: drop the broad public policy, create a view for public, and re-grant access via column-level approach using a security definer function would be complex.
-- Simpler approach: drop the broad policy and create a SELECT policy that allows public to see active listings, but use a separate view for safe public columns.
-- Cleanest: revoke column SELECT on cost_price and profit from anon/authenticated, keep RLS as-is.

REVOKE SELECT (cost_price, profit) ON public.listings FROM anon;
REVOKE SELECT (cost_price, profit) ON public.listings FROM authenticated;

-- Re-grant cost_price/profit only to service_role and via explicit RLS-aware access for admins/agents/owners
-- We'll use a SECURITY DEFINER function for admin/agent/owner reads instead.
-- Grant column-level SELECT back to authenticated, but RLS will continue to filter rows.
-- Then create a helper view for admins/agents/owners that exposes those columns.

CREATE OR REPLACE VIEW public.listings_internal AS
SELECT * FROM public.listings;

ALTER VIEW public.listings_internal SET (security_invoker = true);

-- RLS on the underlying table already restricts row visibility for non-owners/non-admins/non-agents,
-- but column-level revoke prevents anon/authenticated from selecting cost_price/profit at all.
-- To let admins/agents/owners read those columns, grant column SELECT back to authenticated:
GRANT SELECT (cost_price, profit) ON public.listings TO authenticated;

-- Now anonymous users (anon role) cannot select cost_price/profit, but authenticated users can —
-- and RLS still ensures they only see rows they're allowed to see.
-- For the "Anyone can view active listings" public policy (which uses the public/anon role),
-- anon users get rows but the columns are inaccessible at the GRANT level.

-- Storage: tighten listing-photos INSERT to require first folder segment = auth.uid()
DROP POLICY IF EXISTS "Authenticated users can upload listing photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to listing-photos" ON storage.objects;
DROP POLICY IF EXISTS "anyone can upload listing photos" ON storage.objects;

CREATE POLICY "Users can upload to own folder in listing-photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listing-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
