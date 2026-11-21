import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, CheckCheck, Clock, Layers, Loader2, Mail, MapPin, PanelLeft, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cleanDisplayName } from "@/lib/displayName";
import { cleanAttentionText } from "@/lib/attentionText";
import { advanceQueue, queueOutcomeBody, snapshotQueue, type QueueOutcome, type QueueReceipt } from "@/lib/guidedCrm";
import type { AttentionEntry } from "@/lib/humanAttention";

export interface GuidedRecord {
  id: string; name: string | null; email: string | null; phone: string | null;
  cemetery: string | null; customer_profile_id?: string | null;
}
interface Props {
  records: GuidedRecord[];
  initialIds: string[];
  noteRecord?: GuidedRecord | null;
  attention?: AttentionEntry;
  needsReply: boolean;
  workers: string[];
  onSelect: (id: string) => void;
  onExit: () => void;
  children: ReactNode;
}

const outcomes: { value: QueueOutcome; label: string; icon: typeof Check }[] = [
  { value: "worked", label: "Action taken", icon: Check },
  { value: "waiting", label: "Waiting / blocked", icon: Clock },
  { value: "reviewed", label: "No action needed", icon: CheckCheck },
];

export default function GuidedCrmMode({ records, initialIds, noteRecord, attention, needsReply, workers, onSelect, onExit, children }: Props) {
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const [ids] = useState(() => snapshotQueue(initialIds));
  const [receipts, setReceipts] = useState<QueueReceipt[]>([]);
  const [outcome, setOutcome] = useState<QueueOutcome | null>(null);
  const [findings, setFindings] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const exitRef = useRef<HTMLButtonElement>(null);
  const currentId = ids[receipts.length];
  const current = records.find(r => r.id === currentId);
  const next = records.find(r => r.id === ids[receipts.length + 1]);
  const finished = receipts.length === ids.length;
  const task = attention?.attention;

  useEffect(() => {
    if (currentId) onSelect(currentId);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [currentId, onSelect]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    exitRef.current?.focus();
    return () => { document.body.style.overflow = previous; };
  }, []);

  const exit = () => {
    if (savingRef.current) return;
    if (!finished && !window.confirm("Leave guided mode? Saved outcomes are kept. Save any unsent emails or edits before leaving.")) return;
    onExit();
  };

  const saveAndNext = async () => {
    if (!current || !outcome || !user || !confirmed || !findings.trim() || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const body = queueOutcomeBody(outcome, findings);
      const target = noteRecord || current;
      const { data, error: saveError } = await supabase.from("customer_notes" as any).insert({
        submission_id: target.id,
        customer_profile_id: target.customer_profile_id || null,
        author_user_id: user.id,
        author_name: cleanDisplayName(user.user_metadata?.full_name) || user.email?.split("@")[0] || "Staff",
        body,
      }).select("id, body, submission_id").single();
      if (saveError) throw saveError;
      const saved = data as unknown as { id: string; body: string; submission_id: string } | null;
      if (!saved?.id || saved.body !== body || saved.submission_id !== target.id) throw new Error("Your outcome could not be verified. Stay on this record and check Notes before trying again.");
      setReceipts(previous => advanceQueue(ids, previous, { recordId: current.id, outcome, noteId: saved.id }));
      setOutcome(null);
      setFindings("");
      setConfirmed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the outcome. Check Notes before trying again; your place has not changed.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return createPortal(<section aria-label="Guided CRM" className="guided-crm fixed inset-0 z-40 flex flex-col text-foreground">
    <header className="guided-crm-header flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-border px-4 sm:px-7">
      <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Layers className="h-4 w-4" /></span><div><p className="text-base font-semibold">Focus</p><p className="text-[11px] text-muted-foreground">Texas Cemetery Brokers</p></div></div>
      <div aria-live="polite" className="text-xs text-muted-foreground tabular-nums"><span className="font-semibold text-foreground">{receipts.length}</span> / {ids.length} reviewed</div>
      <Button ref={exitRef} variant="ghost" size="sm" onClick={exit} disabled={saving} className="gap-2"><PanelLeft className="h-4 w-4" /><span className="hidden sm:inline">Back to CRM</span><span className="sm:hidden">Exit</span></Button>
    </header>
    <progress aria-label="Queue progress" max={Math.max(1, ids.length)} value={receipts.length} className="guided-crm-progress h-0.5 w-full shrink-0" />
    {finished ? <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-12 text-center">
      <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary"><CheckCheck className="h-7 w-7" /></span>
      <p className="text-xs font-medium text-muted-foreground">THIS SESSION</p><h1 className="mt-3 text-3xl font-semibold">{ids.length ? "Queue reviewed." : "Nothing in this view."}</h1>
      <div className="my-8 grid grid-cols-3 gap-8 border-y border-border py-6">{outcomes.map(o => <div key={o.value}><p className="text-2xl font-semibold tabular-nums">{receipts.filter(r => r.outcome === o.value).length}</p><p className="mt-1 text-xs text-muted-foreground">{o.label}</p></div>)}</div>
      <Button onClick={onExit} className="gap-2">Back to CRM<ArrowRight className="h-4 w-4" /></Button>
    </div> : <>
      <div className="guided-crm-layout min-h-0 flex-1">
        <aside className="guided-crm-brief min-w-0 overflow-y-auto border-border p-5 sm:p-7">
          <p className="text-[11px] font-medium text-muted-foreground">RECORD {receipts.length + 1} OF {ids.length}</p>
          <h1 className="mt-3 break-words text-2xl font-semibold leading-tight">{current?.name || "Customer record"}</h1>
          {current?.cemetery && <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{current.cemetery}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            {current?.phone && <Button asChild size="sm" variant="outline" className="gap-2"><a href={`tel:${current.phone}`}><Phone className="h-3.5 w-3.5" />Call</a></Button>}
            {current?.email && <span className="min-w-0 break-all self-center text-xs text-muted-foreground">{current.email}</span>}
          </div>
          {workers.length > 0 && <p role="status" className="mt-4 text-xs text-primary">Also here: {workers.join(", ")}</p>}
          <div className="mt-7 border-t border-border pt-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">{needsReply ? <Mail className="h-4 w-4" /> : <Layers className="h-4 w-4" />}{needsReply ? "Customer needs a reply" : task ? "Staff action" : "Record review"}</div>
            <h2 className="mt-3 text-lg font-semibold">{task ? "Your next action" : needsReply ? "Read the conversation." : "Check the next step."}</h2>
            {task ? <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{cleanAttentionText(task.task)}</p> : <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{needsReply ? "Reply to the latest question and address any outstanding work." : "Review the record’s current status and any outstanding work."}</p>}
            {task?.outcome_needed && <div className="mt-5 border-l-2 border-primary pl-3"><p className="text-xs font-semibold">Findings needed</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{cleanAttentionText(task.outcome_needed)}</p></div>}
            {task && <details className="mt-5 text-sm"><summary className="cursor-pointer text-xs font-medium text-muted-foreground">Context & evidence</summary><p className="mt-3 leading-relaxed text-muted-foreground">{cleanAttentionText(task.reason)}</p><p className="mt-2 leading-relaxed text-muted-foreground">{cleanAttentionText(task.evidence)}</p>{task.after_outcome && <p className="mt-3 leading-relaxed text-muted-foreground">AI next: {cleanAttentionText(task.after_outcome)}</p>}</details>}
          </div>
          {next && <div className="mt-8 border-t border-border pt-5"><p className="text-[11px] text-muted-foreground">UP NEXT</p><p className="mt-2 truncate text-sm font-medium">{next.name || "Customer record"}</p><p className="mt-1 truncate text-xs text-muted-foreground">{next.cemetery || "Customer enquiry"}</p></div>}
        </aside>
        <div ref={scrollRef} className="guided-crm-workspace min-w-0 overflow-y-auto overscroll-contain">
          <motion.div key={currentId} initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="guided-crm-record mx-auto max-w-[1120px] p-3 sm:p-6">
            {current ? children : <p className="p-8 text-muted-foreground">This record is no longer available. Return to the CRM to refresh the queue.</p>}
          </motion.div>
        </div>
      </div>
      <footer className="guided-crm-header flex shrink-0 items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-7">
        <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{ids.length - receipts.length}</span> remaining</p>
        <Button className="min-h-11 gap-3 px-5" disabled={!current} onClick={() => { setOutcome("worked"); setError(""); }}>Record outcome<ArrowRight className="h-4 w-4" /></Button>
      </footer>
    </>}
    <Dialog open={outcome !== null} onOpenChange={open => { if (!open && !saving) setOutcome(null); }}>
      <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto font-sans" onEscapeKeyDown={e => { if (saving) e.preventDefault(); }} onPointerDownOutside={e => { if (saving) e.preventDefault(); }}>
        <DialogTitle className="pr-6 font-sans tracking-normal text-xl">Where did you leave this record?</DialogTitle>
        <DialogDescription>{current?.name || "Customer"} · Record {receipts.length + 1}</DialogDescription>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{outcomes.map(o => <Button key={o.value} variant={outcome === o.value ? "default" : "outline"} disabled={saving} className="h-auto min-h-12 gap-2 whitespace-normal text-xs" aria-pressed={outcome === o.value} onClick={() => setOutcome(o.value)}><o.icon className="h-4 w-4 shrink-0" />{o.label}</Button>)}</div>
        <label htmlFor="guided-findings" className="text-sm font-medium">{outcome === "waiting" ? "Waiting for whom or what? What happens next?" : outcome === "reviewed" ? "Why is no action needed?" : "What did you do and find? Any remaining work?"}</label>
        <Textarea id="guided-findings" value={findings} disabled={saving} onChange={e => setFindings(e.target.value)} rows={4} className="resize-none" />
        <label className="flex items-start gap-3 text-sm leading-relaxed"><Checkbox checked={confirmed} disabled={saving} onCheckedChange={v => setConfirmed(v === true)} className="mt-0.5" />I’ve saved my emails and changes, and recorded any remaining work.</label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-between gap-3 border-t border-border pt-4"><Button variant="ghost" disabled={saving} onClick={() => setOutcome(null)}><X className="mr-2 h-4 w-4" />Back</Button><Button disabled={saving || !findings.trim() || !confirmed} onClick={saveAndNext} className="gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{saving ? "Saving…" : next ? "Save & next record" : "Save & finish"}</Button></div>
      </DialogContent>
    </Dialog>
  </section>, document.body);
}