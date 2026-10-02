import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Bot, Loader2, RefreshCw, ChevronDown, Send } from "lucide-react";
import AiActionCard, { AiAction, callSellerAgent, AI_TYPE_META } from "./AiActionCard";

type Run = { created_at: string; status: string; stage_summary: string | null; next_step: string | null; needs_human: boolean | null; error: string | null };

type Props = {
  submissionId: string;
  pausedAt: string | null;
  customerProfileId?: string | null;
  onOpenQuote: (action?: AiAction) => void;
  onOpenDocuments: () => void;
  onRefresh?: () => void;
};

/** The AI's workspace on one seller record — its status, pending suggestions, history and controls. */
export default function AiRecordCard({ submissionId, pausedAt, customerProfileId, onOpenQuote, onOpenDocuments, onRefresh }: Props) {
  const { toast } = useToast();
  const [run, setRun] = useState<Run | null>(null);
  const [actions, setActions] = useState<AiAction[]>([]);
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(!!pausedAt);
  const [showHistory, setShowHistory] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [sentInstructions, setSentInstructions] = useState<{ body: string; author_name: string | null; created_at: string }[]>([]);

  const load = useCallback(async () => {
    const [{ data: r }, { data: a }, { data: ins }] = await Promise.all([
      supabase.from("ai_agent_runs" as never).select("created_at,status,stage_summary,next_step,needs_human,error").eq("submission_id", submissionId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("ai_agent_actions" as never).select("*").eq("submission_id", submissionId).is("deleted_at", null).neq("status", "superseded").order("created_at", { ascending: false }).limit(30),
      supabase.from("customer_notes").select("body,author_name,created_at").eq("submission_id", submissionId).ilike("body", "Instruction for AI:%").is("deleted_at", null).order("created_at", { ascending: false }).limit(5),
    ]);
    setSentInstructions((ins ?? []) as any);
    setRun((r as unknown as Run) ?? null);
    setActions((a ?? []) as unknown as AiAction[]);
  }, [submissionId]);

  useEffect(() => { setPaused(!!pausedAt); load(); }, [submissionId, pausedAt, load]);

  const review = async (instructionText?: string) => {
    setBusy(true);
    try {
      const r = await callSellerAgent({ action: "run", submission_id: submissionId, ...(instructionText ? { instruction: instructionText } : {}) });
      if (r?.status !== "done") toast({ title: "AI skipped this seller", description: r?.reason });
      await load();
    } catch (e) { toast({ title: "AI review failed", description: (e as Error).message, variant: "destructive" }); }
    setBusy(false);
  };

  const togglePause = async (v: boolean) => {
    setPaused(v);
    const { error } = await supabase.from("contact_submissions").update({ ai_paused_at: v ? new Date().toISOString() : null } as never).eq("id", submissionId);
    if (error) { setPaused(!v); toast({ title: "Couldn't update", description: error.message, variant: "destructive" }); }
    else onRefresh?.();
  };

  const saveInstruction = async () => {
    const text = instruction.trim();
    if (!text) return;
    const { data: u } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", u.user?.id ?? "").maybeSingle();
    const { error } = await supabase.from("customer_notes").insert({
      submission_id: submissionId, customer_profile_id: customerProfileId ?? null,
      body: `Instruction for AI: ${text}`, author_name: prof?.full_name || u.user?.email || "Staff", author_user_id: u.user?.id ?? null,
    } as never);
    if (error) toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
    else {
      setInstruction("");
      toast({ title: "Instruction sent", description: "The AI is working on it now." });
      if (!paused) await review(text); else await load();
    }
  };

  const pending = actions.filter((a) => a.status === "proposed");
  const history = actions.filter((a) => a.status !== "proposed");

  return (
    <section aria-label="AI Agent" className="rounded-2xl border border-indigo-500/40 bg-indigo-500/5 ring-1 ring-indigo-500/15 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-indigo-600 text-primary-foreground flex items-center justify-center"><Bot className="w-4 h-4" /></span>
          <div>
            <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">AI Agent</p>
            <p className="text-[11px] text-muted-foreground">
              {paused ? "Paused for this seller" : run ? `Last looked ${new Date(run.created_at).toLocaleString()}` : "Hasn't reviewed this seller yet"}
              {pending.length ? ` · ${pending.length} waiting for approval` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Switch checked={paused} onCheckedChange={togglePause} /> Pause AI
          </label>
          <Button size="sm" variant="outline" onClick={() => review()} disabled={busy || paused} className="border-indigo-500/40 text-indigo-700 dark:text-indigo-300">
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}Review now
          </Button>
        </div>
      </div>

      {run && run.status === "done" && (
        <div className="rounded-xl bg-card/80 border border-indigo-500/20 p-3 text-sm space-y-1">
          {run.stage_summary && <p className="text-foreground">{run.stage_summary}</p>}
          {run.next_step && <p className="text-indigo-800 dark:text-indigo-200"><span className="font-medium">Next step:</span> {run.next_step}</p>}
        </div>
      )}
      {run?.status === "error" && <p className="text-sm text-destructive">Last review failed: {run.error}</p>}

      {pending.map((a) => (
        <AiActionCard key={a.id} action={a} compact onChanged={() => { load(); onRefresh?.(); }}
          onOpen={(which, action) => (which === "quote" ? onOpenQuote(action) : onOpenDocuments())} />
      ))}

      <div className="flex gap-2">
        <Textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={1} placeholder="Instruction for AI (e.g. hold until after the funeral)" className="min-h-9 text-sm bg-card" />
        <Button size="sm" variant="outline" onClick={saveInstruction} disabled={!instruction.trim() || busy} className="border-indigo-500/40"><Send className="w-4 h-4" /></Button>
      </div>

      {sentInstructions.length > 0 && (
        <ul className="space-y-1">
          {sentInstructions.map((n) => (
            <li key={n.created_at} className="text-xs rounded-lg bg-card/70 border border-indigo-500/20 px-2.5 py-1.5">
              <span className="font-medium text-indigo-800 dark:text-indigo-200">You told the AI:</span> {n.body.replace(/^Instruction for AI:\s*/i, "")}
              <span className="text-muted-foreground"> · {n.author_name ?? "Staff"}, {new Date(n.created_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}

      {history.length > 0 && (
        <div>
          <button onClick={() => setShowHistory((v) => !v)} className="text-xs text-indigo-700 dark:text-indigo-300 inline-flex items-center gap-1">
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHistory ? "rotate-180" : ""}`} /> What the AI has done ({history.length})
          </button>
          {showHistory && (
            <ul className="mt-2 space-y-1.5">
              {history.map((a) => {
                const m = AI_TYPE_META[a.action_type] ?? AI_TYPE_META.add_note;
                return (
                  <li key={a.id} className="text-xs flex items-start gap-2 rounded-lg bg-card/70 border border-border/60 px-2.5 py-1.5">
                    <m.Icon className="w-3.5 h-3.5 mt-0.5 text-indigo-600 shrink-0" />
                    <span className="flex-1 min-w-0"><span className="font-medium text-foreground">{m.label}</span> — {a.status}{a.decided_by_name ? ` by ${a.decided_by_name}` : ""}{a.email_subject ? ` · "${a.email_subject}"` : ""}</span>
                    <span className="text-muted-foreground shrink-0">{new Date(a.created_at).toLocaleDateString()}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
