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
    <ol className="mt-4 space-y-4">
      <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">1</span><div className="min-w-0"><p className="text-sm font-semibold text-foreground">You do</p><ul className="mt-1 space-y-1.5 text-sm leading-relaxed text-foreground">{cleanAttentionText(task.task).split(/(?:^|\s+)\d+[.)]\s+|(?<=[.!?])\s+(?=[A-Z])/).filter(step => step.trim()).map((step, i) => <li key={i}>{step}</li>)}</ul></div></li>
      <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">2</span><div className="min-w-0"><p className="text-sm font-semibold text-foreground">Tell the AI</p><p className="mt-1 text-sm leading-relaxed text-foreground">{task.outcome_needed ? cleanAttentionText(task.outcome_needed) : "What you did and what you found."}</p></div></li>
      <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-foreground/40 text-xs font-semibold text-foreground"><Bot className="h-3.5 w-3.5" /></span><div className="min-w-0"><p className="text-sm font-semibold text-foreground">The AI then</p><p className="mt-1 text-sm leading-relaxed text-foreground">{task.after_outcome ? cleanAttentionText(task.after_outcome) : "Reviews the record with your findings and takes the next step."}</p></div></li>
    </ol>
    <details className="mt-4 text-sm"><summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">Why this is needed & where to look</summary><p className="mt-2 leading-relaxed text-muted-foreground">{cleanAttentionText(task.reason)}</p><p className="mt-1 leading-relaxed text-muted-foreground">{cleanAttentionText(task.evidence)}</p></details>
    {submissionId && <Button variant="outline" size="sm" className="mt-3 h-auto min-h-9 whitespace-normal" onClick={() => document.getElementById(`seller-ai-${submissionId}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}><ArrowDown className="mr-2 h-3.5 w-3.5 shrink-0" />Go to task</Button>}
  </section>;
}