CREATE OR REPLACE FUNCTION public.cemetery_demand_bands()
RETURNS TABLE(cemetery_key text, band integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH c AS (
    SELECT
      btrim(regexp_replace(
        regexp_replace(
          regexp_replace(lower(cemetery), '(memorial park|memorial gardens|cemetery|memorial|park|gardens)', ' ', 'g'),
          '[^a-z0-9 ]', ' ', 'g'),
        '[[:space:]]+', ' ', 'g')) AS k,
      count(*) AS n
    FROM public.contact_submissions
    WHERE deleted_at IS NULL AND cemetery IS NOT NULL AND btrim(cemetery) <> ''
    GROUP BY 1
  )
  SELECT k, ntile(5) OVER (ORDER BY n)::int
  FROM c
  WHERE k <> ''
$$;

GRANT EXECUTE ON FUNCTION public.cemetery_demand_bands() TO anon, authenticated;