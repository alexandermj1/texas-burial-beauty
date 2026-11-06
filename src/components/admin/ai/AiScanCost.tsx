import type { ScanUsage } from "../../../../supabase/functions/seller-agent/scanUsage";
export default function AiScanCost({ usage }: { usage?: ScanUsage | null }) {
  return <p className="text-xs text-muted-foreground">
    {usage?.estimated_credits != null ? `Estimated scan cost: ${usage.estimated_credits.toFixed(4)} credits × ${usage.conversion} = ${usage.equivalent?.toFixed(4)} · ${usage.calls} AI calls` : "Scan cost unavailable"}
  </p>;
}