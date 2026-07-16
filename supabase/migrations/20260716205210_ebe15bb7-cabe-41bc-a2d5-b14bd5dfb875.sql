UPDATE public.contact_submissions
SET cemetery_retail = ROUND( (COALESCE(accepted_quote_amount, quote_amount)::numeric / 0.42) / 100 ) * 100
WHERE cemetery_retail IS NULL
  AND COALESCE(accepted_quote_amount, quote_amount) IS NOT NULL
  AND COALESCE(accepted_quote_amount, quote_amount) > 0;