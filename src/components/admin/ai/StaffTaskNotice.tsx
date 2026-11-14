import { Bot, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cleanAttentionText } from "@/lib/attentionText";
import { isQuoteNeededAttention, type AttentionEntry } from "@/lib/humanAttention";

export default function StaffTaskNotice({ entry, submissionId }: { entry?: AttentionEntry; submissionId?: string }) {
  if (!entry) return null;
  const task = entry.attention;
  const quote = isQuoteNeededAttention(task);
  return <section aria-label="What the AI needs from staff" className={`mb-4 border-y px-5 py-4 sm:px-7 ${quote ? "border-[hsl(var(--status-quote-border))] bg-[hsl(var(--status-quote-soft))]" : "border-[hsl(var(--status-attention-border))] bg-[hsl(var(--status-attention-soft))]"}`}>
    <p className={`flex items-center gap-2 text-xs font-semibold ${quote ? "text-[hsl(var(--status-quote-fg))]" : "text-[hsl(var(--status-attention-fg))]"}`}><Bot className="h-3.5 w-3.5" />Staff needed · {quote ? "Quote · low priority" : `${task.priority} priority`}</p>
    <p className="mt-2 text-xs font-semibold text-foreground">Staff — still to do</p>
    <ul className="mt-1 list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground">{cleanAttentionText(task.task).split(/(?<=[.!?])\s+(?=[A-Z])/).map((step, i) => <li key={i}>{step}</li>)}</ul>
    <p className="mt-2 text-sm leading-relaxed text-muted-foreground"><span className="font-medium text-foreground">Why: </span>{cleanAttentionText(task.reason)}</p>
    <p className="mt-1 text-sm leading-relaxed text-muted-foreground"><span className="font-medium text-foreground">Where to look: </span>{cleanAttentionText(task.evidence)}</p>
    {submissionId && <Button variant="outline" size="sm" className="mt-3" onClick={() => document.getElementById(`seller-ai-${submissionId}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}><ArrowDown className="mr-2 h-3.5 w-3.5" />AI actions & staff findings</Button>}
  </section>;
}