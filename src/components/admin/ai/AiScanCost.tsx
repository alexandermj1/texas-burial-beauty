import type { ScanUsage } from "../../../../supabase/functions/seller-agent/scanUsage";
export default function AiScanCost({ usage }: { usage?: ScanUsage | null }) {
  return <p className="text-sm font-semibold text-destructive" aria-label="Seller AI scan cost">
    {usage?.estimated_credits != null ? `Estimated scan cost: $${usage.equivalent?.toFixed(4)} USD · ${usage.estimated_credits.toFixed(4)} credits × $${usage.conversion.toFixed(2)} · ${usage.calls} AI calls` : "Scan cost unavailable"}
  </p>;
}