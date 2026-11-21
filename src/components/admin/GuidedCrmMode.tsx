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
import { advanceQueue, guidedTaskCount, queueOutcomeBody, snapshotQueue, type QueueOutcome, type QueueReceipt } from "@/lib/guidedCrm";
import type { AttentionEntry } from "@/lib/humanAttention";
import AiActionCard, { type AiAction } from "./ai/AiActionCard";

export interface GuidedRecord {
  id: string; name: string | null; email: string | null; phone: string | null;
  cemetery: string | null; customer_profile_id?: string | null;
}
interface Props {
  records: GuidedRecord[];
  initialIds: string[];
  noteRecord?: GuidedRecord | null;
  attention?: AttentionEntry;
  staffTasks: AiAction[];
  onTasksChanged: () => void;
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

export default function GuidedCrmMode({ records, initialIds, noteRecord, attention, staffTasks, onTasksChanged, needsReply, workers, onSelect, onExit, children }: Props) {
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
  const taskCount = guidedTaskCount(staffTasks, needsReply);

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
      <div className="flex min-w-0 items-center gap-3"><span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground sm:flex"><Layers className="h-4 w-4" /></span><div className="min-w-0"><p className="text-base font-semibold">Guided mode</p><p className="text-[11px] text-muted-foreground">Record {receipts.length + (finished ? 0 : 1)} of {ids.length}</p></div></div>
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
        <aside aria-label="Tasks for this record" className="guided-crm-brief flex min-h-0 min-w-0 flex-col border-border">
          <div className="shrink-0 border-b border-border px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">Tasks to do</h2><span aria-live="polite" className="text-xs font-semibold text-primary tabular-nums">{taskCount} outstanding</span></div>
            <p className="mt-1 text-[11px] text-muted-foreground">{needsReply ? "Reply needed" : "No unanswered email"} · {staffTasks.length} staff {staffTasks.length === 1 ? "task" : "tasks"}</p>
          </div>
          <div className="guided-crm-task-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
            {needsReply && <section className="mb-5 border-b border-border pb-5"><div className="flex items-center gap-2 text-sm font-semibold"><span className="guided-crm-task-number">1</span><Mail className="h-4 w-4 text-primary" />Reply to the customer</div><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Read their latest email and answer the outstanding question.</p></section>}
            {staffTasks.map((action, index) => <section key={action.id} className="guided-crm-task mb-5 border-b border-border pb-5"><p className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground"><span className="guided-crm-task-number">{index + 1 + Number(needsReply)}</span>Staff task</p><AiActionCard action={action} streamlined compact hideVisuals onChanged={onTasksChanged} /></section>)}
            {staffTasks.length === 0 && task && <p className="whitespace-pre-line text-sm leading-relaxed">{cleanAttentionText(task.task)}</p>}
            {taskCount === 0 && !task && <div className="py-2"><CheckCheck className="mb-3 h-5 w-5 text-primary" /><p className="text-sm font-semibold">No outstanding staff tasks</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Check the record’s next step before recording your outcome.</p></div>}
          </div>
        </aside>
        <div ref={scrollRef} className="guided-crm-workspace min-w-0 overflow-y-auto overscroll-contain">
          <div className="guided-crm-record-heading sticky top-0 z-10 border-b border-border px-4 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h1 className="break-words text-xl font-semibold leading-tight">{current?.name || "Customer record"}</h1>{current?.cemetery && <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" />{current.cemetery}</p>}</div>{current?.phone && <Button asChild size="sm" variant="outline" className="shrink-0 gap-2"><a href={`tel:${current.phone}`}><Phone className="h-3.5 w-3.5" />Call</a></Button>}</div>
            {workers.length > 0 && <p role="status" className="mt-2 text-xs text-primary">Also here: {workers.join(", ")}</p>}
          </div>
          <motion.div key={currentId} initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="guided-crm-record mx-auto max-w-[1120px] p-3 sm:p-6">
            {current ? children : <p className="p-8 text-muted-foreground">This record is no longer available. Return to the CRM to refresh the queue.</p>}
          </motion.div>
        </div>
      </div>
      <footer className="guided-crm-header flex shrink-0 items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-7">
        <div className="min-w-0 text-xs text-muted-foreground"><p><span className="font-semibold text-foreground">{taskCount}</span> outstanding · <span className="font-semibold text-foreground">{ids.length - receipts.length}</span> records left</p>{next && <p className="mt-1 hidden truncate sm:block">Next: {next.name || "Customer record"}</p>}</div>
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