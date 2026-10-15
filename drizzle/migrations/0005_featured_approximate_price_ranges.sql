CREATE OR REPLACE FUNCTION public.get_public_featured_plot_ranges()
RETURNS TABLE(id uuid, cemetery text, city text, plot_type text, section text, spaces integer, created_at timestamptz, retail_low numeric, retail_high numeric, resale_low numeric, resale_high numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
 WITH priced AS (
 SELECT f.*, s.cemetery_retail AS retail,
 CASE WHEN s.accepted_quote_amount > 0 THEN s.accepted_quote_amount WHEN s.quote_amount > 0 THEN s.quote_amount END AS net,
 greatest(coalesce(s.transfer_fee_amount,0),0) AS transfer,
 coalesce((SELECT sum(greatest((fee->>'amount')::numeric,0)) FROM jsonb_array_elements(CASE WHEN jsonb_typeof(s.buyer_fees)='array' THEN s.buyer_fees ELSE '[]'::jsonb END) fee WHERE fee->>'amount' ~ '^[0-9]+(\.[0-9]+)?$'),0) AS extra
 FROM public.get_public_featured_plots() f JOIN public.contact_submissions s ON s.id=f.id
 ), totals AS (
 SELECT priced.*, net+transfer+round((net+transfer)*0.15)+extra AS buyer FROM priced
 )
 SELECT id, cemetery, city, plot_type, section, spaces, created_at,
 CASE WHEN retail>0 AND buyer>0 AND buyer<retail THEN floor(retail/2500)*2500 END,
 CASE WHEN retail>0 AND buyer>0 AND buyer<retail THEN (floor(retail/2500)+1)*2500 END,
 CASE WHEN retail>0 AND buyer>0 AND buyer<retail THEN floor(buyer/2500)*2500 END,
 CASE WHEN retail>0 AND buyer>0 AND buyer<retail THEN (floor(buyer/2500)+1)*2500 END
 FROM totals ORDER BY created_at DESC, id;
$$;
REVOKE ALL ON FUNCTION public.get_public_featured_plot_ranges() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_featured_plot_ranges() TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.get_public_featured_plot_ranges() IS 'Public broad $2500 price bands only. Resale mirrors quoteFigures for a separately purchased space, including one-time transfer, premium and buyer fees; never returns source prices.';