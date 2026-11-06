import type { ScanUsage } from "../../../../supabase/functions/seller-agent/scanUsage";

export const formatUsd = (v: number) => `$${v < 1 ? v.toFixed(3) : v.toFixed(2)}`;

/** Plain dollar figure for one scan (credits × $0.30), no working shown. */
export default function AiScanCost({ usage, total, label }: { usage?: ScanUsage | null; total?: number | null; label?: string }) {
  const value = total ?? usage?.equivalent ?? null;
  if (value == null) return null;
  return <span aria-label={label ? `${label} cost` : "Seller AI scan cost"} className="inline-flex items-baseline gap-1 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-foreground">
    <span className="font-semibold">{formatUsd(value)}</span>{label && <span className="text-muted-foreground">{label}</span>}
  </span>;
}
