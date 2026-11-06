import { Bot, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { attentionHeadline, cleanAttentionText } from "@/lib/attentionText";

export type AiTracking = { lastReply?: string; nextAt?: string; doing?: string; summary?: string; nextStep?: string; queuedAt?: string; action?: string; actionAt?: string; reviewedAt?: string; route?: string };
const when = (at: string) => new Date(at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const dateOnly = (at: string) => new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
export default function AiFeedStatus({ track, paused, archived, canControl, onToggle, staffNeeded, pending, needsReplyAt }: {
  track?: AiTracking; paused: boolean; archived: boolean; canControl: boolean; onToggle: () => void; staffNeeded: boolean; pending?: string; needsReplyAt?: string;
}) {
  if (!track && !pending && !canControl) return null;
  const t = track ?? {};
  const action = t.route === "error" ? "Review interrupted · retry pending" : t.action && t.actionAt ? `${t.action} · ${dateOnly(t.actionAt)}` : t.lastReply ? `Reply sent · ${dateOnly(t.lastReply)}` : t.reviewedAt ? `Review completed · ${dateOnly(t.reviewedAt)}` : pending ? "Suggestion ready to review" : "Awaiting first AI review";
  const newMessage = !!needsReplyAt && (!t.reviewedAt || Date.parse(needsReplyAt) > Date.parse(t.reviewedAt));
  const next = archived ? "Archived · no further reviews" : paused ? "Paused · no automatic reviews" : staffNeeded ? "Waiting for staff guidance" : t.queuedAt ? `Planned steps scheduled · ${when(t.queuedAt)}` : newMessage ? "Unanswered message · priority in the next AI sweep" : needsReplyAt ? "Unanswered message checked · see review outcome" : "";
  const followup = !archived && !paused && !staffNeeded && !newMessage && t.nextAt ? `${Date.parse(t.nextAt) <= Date.now() ? "Follow-up due" : "Follow-up check"} · ${when(t.nextAt)}` : "";
  const summary = cleanAttentionText(t.summary);
  const waiting = cleanAttentionText(t.doing);
  const nextStep = cleanAttentionText(t.nextStep);
  return <div role="note" aria-label="Seller AI activity" className={`flex items-start gap-2 px-2.5 py-2 ${staffNeeded ? "text-muted-foreground" : "rounded-lg border-l-[3px] border-[hsl(var(--status-new))] bg-[hsl(var(--status-new-soft))] text-[hsl(var(--status-new-fg))]"}`}>
    <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0" />
    <div className="min-w-0 flex-1 text-xs leading-relaxed space-y-0.5"><p className="font-medium break-words" title={t.actionAt ? when(t.actionAt) : t.reviewedAt ? when(t.reviewedAt) : undefined}>{action}</p>{summary && <p className="break-words opacity-90" title={summary}>Found: {attentionHeadline(summary, 115)}</p>}{waiting && <p className="break-words opacity-80" title={waiting}>Waiting for: {attentionHeadline(waiting, 100)}</p>}{!waiting && nextStep && <p className="break-words opacity-80" title={nextStep}>Next step: {attentionHeadline(nextStep, 100)}</p>}{t.reviewedAt && !summary && <p className="break-words opacity-80">No detailed outcome saved · check AI notes</p>}{t.lastReply && t.action !== "Reply sent" && <p className="text-[11px] opacity-80 break-words" title={when(t.lastReply)}>Last AI reply · {when(t.lastReply)}</p>}{next && <p className="text-[11px] opacity-80 break-words">{next}</p>}{followup && <p className="text-[11px] opacity-80 break-words">{followup}</p>}</div>
    {canControl && !archived && <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0 rounded-md text-muted-foreground" onClick={e => { e.stopPropagation(); onToggle(); }} title={paused ? "Resume Seller AI" : "Pause Seller AI"} aria-label={paused ? "Resume AI" : "Pause AI"}>{paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}</Button>}
  </div>;
}