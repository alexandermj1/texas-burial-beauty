import { Bot, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { attentionHeadline } from "@/lib/attentionText";

export type AiTracking = { lastReply?: string; nextAt?: string; doing?: string; queuedAt?: string; action?: string; actionAt?: string; reviewedAt?: string };
const when = (at: string) => new Date(at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
export default function AiFeedStatus({ track, paused, archived, canControl, onToggle, staffNeeded, pending }: {
  track?: AiTracking; paused: boolean; archived: boolean; canControl: boolean; onToggle: () => void; staffNeeded: boolean; pending?: string;
}) {
  if (!track && !pending && !canControl) return null;
  const t = track ?? {};
  const action = t.action && t.actionAt ? `${t.action} · ${when(t.actionAt)}` : t.lastReply ? `Reply sent · ${when(t.lastReply)}` : t.reviewedAt ? `Record reviewed · ${when(t.reviewedAt)}` : pending ? `Suggestion ready · ${pending}` : "Not reviewed yet";
  const next = archived ? "Archived · no further reviews" : paused ? "Paused · no automatic reviews" : t.queuedAt ? `Reply scheduled · ${when(t.queuedAt)}` : t.nextAt ? `${Date.parse(t.nextAt) <= Date.now() ? "Review due" : "Next review"} · ${when(t.nextAt)}` : "No review scheduled";
  return <div role="note" aria-label="Seller AI activity" className={`flex items-start gap-2 px-2.5 py-2 ${staffNeeded ? "text-muted-foreground" : "rounded-lg border-l-[3px] border-[hsl(var(--status-new))] bg-[hsl(var(--status-new-soft))] text-[hsl(var(--status-new-fg))]"}`}>
    <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0" />
    <div className="min-w-0 flex-1 text-xs leading-relaxed"><p className="font-medium break-words">{attentionHeadline(action, 110)}</p><p className="text-[11px] opacity-80 break-words">{next}</p></div>
    {canControl && !archived && <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0 rounded-md text-muted-foreground" onClick={e => { e.stopPropagation(); onToggle(); }} title={paused ? "Resume Seller AI" : "Pause Seller AI"} aria-label={paused ? "Resume AI" : "Pause AI"}>{paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}</Button>}
  </div>;
}