CREATE OR REPLACE FUNCTION public.shopfront_lawn_label(value text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
 WITH cleaned AS (
 SELECT trim(regexp_replace(regexp_replace(split_part(coalesce(value,''), '·', 1), '\s*\([^)]*\)', '', 'g'), '\m(lot|space|spaces|spc|sp|grave|graves|plot|plots|block|blk|tier|crypt|niche|number)\M.*$', '', 'i'), ' ,;:.-') AS label
 )
 SELECT CASE WHEN label ~ '[0-9]' OR label !~ '[A-Za-z]' OR length(label)>70 OR label ~* '(don.?t know|do not know|unknown|not sure|^n/?a$|^none$)' THEN '' ELSE label END FROM cleaned;
$$;
REVOKE ALL ON FUNCTION public.shopfront_lawn_label(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shopfront_lawn_label(text) TO service_role;
CREATE OR REPLACE FUNCTION public.get_public_shopfront_plots()
RETURNS TABLE(id uuid, cemetery text, city text, section text, spaces integer, savings_percent integer, is_featured boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 WITH eligible AS (
 SELECT s.*, s.listing_tier IN ('featured','custom_plus','set_your_price','set_your_own_price') AS featured
 FROM public.contact_submissions s
 WHERE s.deleted_at IS NULL AND s.archived_at IS NULL AND s.sold_at IS NULL AND s.listing_paid_at IS NOT NULL AND nullif(trim(s.cemetery),'') IS NOT NULL
 AND (s.listing_tier IN ('featured','custom_plus','set_your_price','set_your_own_price') OR (s.listing_tier IN ('starter','pro') AND s.la_signed_at IS NOT NULL))
 ), ranked AS (
 SELECT e.*, row_number() OVER (PARTITION BY featured ORDER BY listing_paid_at DESC,id) AS placement FROM eligible e
 ), priced AS (
 SELECT r.*, CASE WHEN accepted_quote_amount>0 THEN accepted_quote_amount WHEN quote_amount>0 THEN quote_amount END AS net,
 greatest(coalesce(transfer_fee_amount,0),0) AS transfer,
 coalesce((SELECT sum(greatest((fee->>'amount')::numeric,0)) FROM jsonb_array_elements(CASE WHEN jsonb_typeof(buyer_fees)='array' THEN buyer_fees ELSE '[]'::jsonb END) fee WHERE fee->>'amount' ~ '^[0-9]+(\.[0-9]+)?$'),0) AS extra
 FROM ranked r WHERE featured OR placement<=50
 ), totals AS (
 SELECT p.*, net+transfer+round((net+transfer)*0.15)+extra AS buyer FROM priced p
 )
 SELECT t.id, coalesce(nullif(c.name,''),t.cemetery), coalesce(nullif(t.cemetery_city,''),c.city,''),
 coalesce(nullif(public.shopfront_lawn_label(t.section),''),nullif(public.shopfront_lawn_label(t.lawn),''),''),
 greatest(coalesce(t.plot_count,CASE WHEN trim(t.spaces) ~ '^[0-9]{1,3}$' THEN trim(t.spaces)::integer END,0),0),
 CASE WHEN t.cemetery_retail>0 AND t.buyer>0 AND t.buyer<t.cemetery_retail AND floor((1-t.buyer/t.cemetery_retail)*10)*10>=10
 THEN (floor((1-t.buyer/t.cemetery_retail)*10)*10)::integer END,
 t.featured
 FROM totals t LEFT JOIN LATERAL (
 SELECT tc.name,tc.city FROM public.texas_cemeteries tc WHERE tc.deleted_at IS NULL AND (lower(tc.name)=lower(t.cemetery) OR lower(tc.canonical_name)=lower(t.cemetery))
 ORDER BY (lower(tc.name)=lower(t.cemetery)) DESC,tc.id LIMIT 1
 ) c ON true ORDER BY t.featured DESC,t.listing_paid_at DESC,t.id;
$$;
REVOKE ALL ON FUNCTION public.get_public_shopfront_plots() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_shopfront_plots() TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.get_public_shopfront_plots() IS 'Homepage-only projection: all paid unsold Featured and up to 50 paid signed Starter/Pro listings. General named lawns only, no plot identifiers or currency figures. Savings conservatively rounded down to ten percentage points using quoteFigures separate-space buyer basis. Does not change listing entitlements.';