-- 1) Ensure internal cost/profit columns on listings are never readable via the public API.
REVOKE SELECT (cost_price, profit) ON public.listings FROM PUBLIC;
REVOKE SELECT (cost_price, profit) ON public.listings FROM anon;
REVOKE SELECT (cost_price, profit) ON public.listings FROM authenticated;

-- 2) Demand bands aggregate runs with elevated rights; do not let signed-out callers execute it.
REVOKE EXECUTE ON FUNCTION public.cemetery_demand_bands() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cemetery_demand_bands() FROM anon;
GRANT EXECUTE ON FUNCTION public.cemetery_demand_bands() TO authenticated;