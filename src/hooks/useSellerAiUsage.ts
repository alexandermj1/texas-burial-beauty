import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dailySellerUsage, type UsageRun } from "@/lib/sellerDailyUsage";

/** Shared, paginated saved telemetry. Reading usage never invokes a model. */
export function useSellerAiUsage(enabled = true) {
  return useQuery({
    queryKey: ["seller-ai-daily-usage"], enabled, staleTime: 25_000, refetchInterval: 30_000,
    queryFn: async () => {
      const now = new Date();
      const since = new Date(now.getTime() - 6 * 86400_000).toISOString().slice(0, 10) + "T00:00:00.000Z";
      const runs: UsageRun[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from("ai_agent_runs").select("id,created_at,submission_id,status,scan_usage")
          .is("deleted_at", null).gte("created_at", since).lte("created_at", now.toISOString())
          .order("created_at", { ascending: false }).order("id").range(offset, offset + 499);
        if (error) throw error;
        const page = (data ?? []) as unknown as UsageRun[];
        runs.push(...page);
        if (page.length < 500) break;
      }
      return { days: dailySellerUsage(runs, now), runs };
    },
  });
}