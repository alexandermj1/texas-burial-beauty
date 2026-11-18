import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AI_TYPE_META, callSellerAgent, type AiAction } from "./AiActionCard";

/** Work the AI carries out by itself. Shown for information only — nothing here needs approval. */
export default function AiHandling({ actions, waitingOnStaff, n, onChanged }: { actions: AiAction[]; waitingOnStaff: boolean; n: number; onChanged: () => void }) {
  const waits = (a: AiAction) => !!a.payload?.execution?.depends_on_staff_task_ids?.length || (waitingOnStaff && !a.payload?.execution);
  const now = actions.filter(a => !waits(a)), later = actions.filter(waits);
  return <div className="space-y-3">
    <div className="flex items-start gap-3 pt-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">{n}</span>
      <div><h3 className="text-[15px] font-semibold text-foreground">The AI handles the rest</h3><p className="text-xs text-muted-foreground">Nothing to approve. This runs automatically.</p></div>
    </div>
    <div className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
      {now.map(a => <Row key={a.id} a={a} status="Doing now" onChanged={onChanged} />)}
      {later.map(a => <Row key={a.id} a={a} status="After your task" muted onChanged={onChanged} />)}
    </div>
  </div>;
}

function Row({ a, status, muted, onChanged }: { a: AiAction; status: string; muted?: boolean; onChanged: () => void }) {
  const { toast } = useToast();
  const [stopping, setStopping] = useState(false);
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);
  const meta = AI_TYPE_META[a.action_type] ?? AI_TYPE_META.add_note;
  const stop = async () => {
    setBusy(true);
    try { await callSellerAgent({ action: "reject", action_id: a.id, reason: why.trim() }); onChanged(); }
    catch (e) { toast({ title: "Couldn't stop it", description: (e as Error).message, variant: "destructive" }); }
    setBusy(false);
  };
  return <details className="group">
    <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-muted/40">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><meta.Icon className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-foreground">{meta.label}</span>{a.reason && <span className="block truncate text-xs text-muted-foreground">{a.reason}</span>}</span>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${muted ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>{status}</span>
    </summary>
    <div className="space-y-3 px-4 pb-4 pl-[60px] text-sm">
      {a.reason && <p className="leading-relaxed text-muted-foreground">{a.reason}</p>}
      {a.email_body && <div className="rounded-xl bg-muted/50 p-3"><p className="font-semibold text-foreground">{a.email_subject}</p><pre className="mt-1 max-h-56 overflow-y-auto whitespace-pre-wrap font-sans leading-relaxed text-foreground">{a.email_body}</pre></div>}
      {!a.email_body && a.note_body && <p className="whitespace-pre-wrap rounded-xl bg-muted/50 p-3 text-foreground">{a.note_body}</p>}
      {a.error && <p className="text-destructive">{a.error}</p>}
      {stopping ? <div className="space-y-2">
        <Textarea aria-label="Why stop this" rows={2} value={why} onChange={e => setWhy(e.target.value)} placeholder="Why shouldn't the AI do this?" />
        <div className="flex justify-end gap-3"><button type="button" className="text-sm text-muted-foreground" onClick={() => setStopping(false)}>Cancel</button><Button size="sm" variant="outline" disabled={busy || !why.trim()} onClick={stop}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Stop this step"}</Button></div>
      </div> : <button type="button" onClick={() => setStopping(true)} className="text-xs text-muted-foreground hover:text-foreground">Stop the AI doing this</button>}
    </div>
  </details>;
}
