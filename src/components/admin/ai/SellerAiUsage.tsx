import { useSellerAiUsage } from "@/hooks/useSellerAiUsage";
import { usageDollars } from "@/lib/sellerDailyUsage";
import { Activity } from "lucide-react";

export default function SellerAiUsage({ history = false }: { history?: boolean }) {
  const { data, isError } = useSellerAiUsage();
  const today = data?.days[0];
  return (
    <div aria-label="Daily Seller AI usage" className={history ? "space-y-3" : "flex flex-wrap items-center gap-x-4 gap-y-1 px-1 py-2 text-xs"}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Activity className="h-3.5 w-3.5" />Seller AI today <span className="text-[10px]">UTC</span></span>
        <span className="font-semibold tabular-nums text-foreground">{today ? `${today.tokens.toLocaleString()} tokens` : isError ? "Usage unavailable" : "Loading…"}</span>
        {today && <span className="tabular-nums text-primary">{usageDollars(today.dollars)} USD estimated{today.missing > 0 ? " · partial" : ""}</span>}
      </div>
      {history && data && <div className="overflow-x-auto"><table className="w-full text-left text-xs tabular-nums"><thead className="text-muted-foreground"><tr className="border-b border-border"><th className="py-2 font-medium">Day · UTC</th><th className="py-2 font-medium text-right">Tokens</th><th className="py-2 font-medium text-right">Estimated USD</th></tr></thead><tbody>{data.days.map(d => <tr key={d.day} className="border-b border-border/50"><td className="py-2">{d.day}</td><td className="text-right">{d.tokens.toLocaleString()}</td><td className="text-right">{usageDollars(d.dollars)}{d.missing > 0 && <span className="ml-1 text-muted-foreground">partial</span>}</td></tr>)}</tbody></table><p className="mt-2 text-[10px] text-muted-foreground">Saved review usage, grouped by review start date. Estimated credits × $0.30, not billed costs; incomplete usage is marked partial.</p></div>}
    </div>
  );
}