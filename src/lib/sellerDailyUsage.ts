import type { ScanUsage } from "../../supabase/functions/seller-agent/scanUsage";

export type UsageRun = { id: string; created_at: string; submission_id: string; status: string; scan_usage: ScanUsage | null };
export function dailySellerUsage(runs: UsageRun[], now = new Date()) {
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(now.getTime() - i * 86400_000).toISOString().slice(0, 10);
    const rows = runs.filter(r => r.created_at.slice(0, 10) === day);
    let tokens = 0, dollars = 0, missing = 0;
    for (const r of rows) {
      const u = r.scan_usage;
      tokens += (u?.input_tokens ?? 0) + (u?.output_tokens ?? 0);
      if (u?.equivalent != null) dollars += u.equivalent;
      if (!u || u.equivalent == null || (u.token_calls ?? 0) < u.calls || u.current_call_pending || !["done", "error"].includes(r.status)) missing++;
    }
    return { day, tokens, dollars, missing, reviews: rows.length };
  });
}
export const usageDollars = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);