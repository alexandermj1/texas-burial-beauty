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
    <p className="mt-3 text-sm font-semibold text-foreground">What staff need to do</p>
    <ul className="mt-1 list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground">{cleanAttentionText(task.task).split(/(?:^|\s+)\d+[.)]\s+|(?<=[.!?])\s+(?=[A-Z])/).filter(step => step.trim()).map((step, i) => <li key={i}>{step}</li>)}</ul>
    <div className="mt-3 border-t border-border pt-3">
      <p className="text-sm font-semibold text-foreground">Information to give the AI</p>
      <p className="mt-1 text-sm leading-relaxed text-foreground">{task.outcome_needed ? cleanAttentionText(task.outcome_needed) : "Record what you did, what you found and any information still missing."}</p>
    </div>
    <div className="mt-3 border-t border-border pt-3">
      <p className="text-sm font-semibold text-foreground">What the AI will do next</p>
      <p className="mt-1 text-sm leading-relaxed text-foreground">{task.after_outcome ? cleanAttentionText(task.after_outcome) : "Review the record with your findings and identify the next supported actions. No specific follow-on action has been recorded for this task yet."}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Independent AI actions remain separate from this staff task. Approving them does not complete the staff task.</p>
    </div>
    <p className="mt-2 text-sm leading-relaxed text-muted-foreground"><span className="font-medium text-foreground">Why: </span>{cleanAttentionText(task.reason)}</p>
    <p className="mt-1 text-sm leading-relaxed text-muted-foreground"><span className="font-medium text-foreground">Where to look: </span>{cleanAttentionText(task.evidence)}</p>
    {submissionId && <Button variant="outline" size="sm" className="mt-3 h-auto min-h-9 whitespace-normal" onClick={() => document.getElementById(`seller-ai-${submissionId}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}><ArrowDown className="mr-2 h-3.5 w-3.5 shrink-0" />Enter staff findings & review AI actions</Button>}
  </section>;
}