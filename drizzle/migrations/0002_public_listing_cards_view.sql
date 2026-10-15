CREATE OR REPLACE VIEW public.public_listing_cards
AS
SELECT id, cemetery, city, plot_type, section, spaces, created_at
FROM public.listings
WHERE status = 'active' AND deleted_at IS NULL;

GRANT SELECT ON public.public_listing_cards TO anon;
GRANT SELECT ON public.public_listing_cards TO authenticated;
GRANT ALL ON public.public_listing_cards TO service_role;