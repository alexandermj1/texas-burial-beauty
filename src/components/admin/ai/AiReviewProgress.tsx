import { useEffect, useState } from "react";
import { Activity, Check, Loader2 } from "lucide-react";
import type { ReviewProgress } from "@/lib/runSellerReview";
import { sellerModelLabel } from "../../../../supabase/functions/seller-agent/models";

export default function AiReviewProgress({ progress }: { progress: ReviewProgress }) {
  const [now, setNow] = useState(Date.now());
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => { setRecent(previous => previous.at(-1) === progress.stage ? previous : [...previous.slice(-3), progress.stage]); }, [progress.stage]);
  const usage = progress.usage;
  const input = usage?.input_tokens ?? 0, output = usage?.output_tokens ?? 0;
  const hasTokens = (usage?.token_calls ?? 0) > 0 || input + output > 0;
  return <div className="border-y border-border py-3 space-y-2" aria-label="Live review progress">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1 space-y-1" role="status" aria-live="polite">
        <p className="text-xs font-medium text-foreground flex items-center gap-2"><Activity className="h-3.5 w-3.5 text-primary shrink-0" /> Live review · {sellerModelLabel(progress.model)} <span className="text-muted-foreground tabular-nums">{Math.max(0, Math.floor((now - progress.startedAt) / 1000))}s</span></p>
        <p className="text-sm text-foreground flex items-start gap-2"><Loader2 className="h-4 w-4 shrink-0 mt-0.5 animate-spin motion-reduce:animate-none text-primary" /><span className="break-words">{progress.stage}</span></p>
      </div>
      <div className="shrink-0 text-right space-y-0.5" aria-label="Reported token usage">
        <p className="text-lg font-semibold tabular-nums text-foreground">{hasTokens ? (input + output).toLocaleString() : "—"} <span className="text-xs font-normal text-muted-foreground">tokens</span></p>
        <p className="text-[11px] text-muted-foreground tabular-nums">{input.toLocaleString()} in · {output.toLocaleString()} out</p>
        <p className="text-[10px] text-muted-foreground">{hasTokens ? "Reported so far · updates when available" : "Waiting for reported usage"}</p>
      </div>
    </div>
    {recent.length > 1 && <ul className="space-y-1 pl-6">{recent.slice(0, -1).reverse().map((stage, i) => <li key={`${stage}-${i}`} className="text-[11px] text-muted-foreground flex gap-1.5"><Check className="h-3 w-3 shrink-0 mt-0.5" /><span>{stage}</span></li>)}</ul>}
  </div>;
}