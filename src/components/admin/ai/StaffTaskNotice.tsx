import { Bot } from "lucide-react";
import { cleanAttentionText } from "@/lib/attentionText";
import { isQuoteNeededAttention, type AttentionEntry } from "@/lib/humanAttention";

export default function StaffTaskNotice({ entry }: { entry?: AttentionEntry }) {
  if (!entry) return null;
  const task = entry.attention;
  const quote = isQuoteNeededAttention(task);
  return <section aria-label="What the AI needs from staff" className={`mb-4 border-y px-5 py-4 sm:px-7 ${quote ? "border-[hsl(var(--status-quote-border))] bg-[hsl(var(--status-quote-soft))]" : "border-[hsl(var(--status-attention-border))] bg-[hsl(var(--status-attention-soft))]"}`}>
    <p className={`flex items-center gap-2 text-xs font-semibold ${quote ? "text-[hsl(var(--status-quote-fg))]" : "text-[hsl(var(--status-attention-fg))]"}`}><Bot className="h-3.5 w-3.5" />Staff needed · {quote ? "Quote · low priority" : `${task.priority} priority`}</p>
    <p className="mt-2 text-sm font-semibold leading-relaxed text-foreground">{cleanAttentionText(task.task)}</p>
    <p className="mt-2 text-sm leading-relaxed text-muted-foreground"><span className="font-medium text-foreground">Why: </span>{cleanAttentionText(task.reason)}</p>
    <p className="mt-1 text-sm leading-relaxed text-muted-foreground"><span className="font-medium text-foreground">Where to look: </span>{cleanAttentionText(task.evidence)}</p>
  </section>;
}