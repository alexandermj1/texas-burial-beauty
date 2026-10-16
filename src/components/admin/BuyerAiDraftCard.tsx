import { useCallback, useEffect, useState } from "react";
import { Bot, Loader2, RefreshCw, Check, X, Mail, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type Draft = {
  id: string; status: string; subject: string | null; body: string | null;
  reason: string | null; error: string | null; inventory_snapshot: any[];
  created_at: string; decided_by_name?: string | null; decision_reason?: string | null;
};

async function callBuyerAi(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("buyer-agent", { body });
  if (error) { let msg = error.message; try { msg = (await (error as any).context?.json())?.error ?? msg; } catch { /* keep */ } throw new Error(String(msg)); }
  return data;
}

/** The AI's workspace on one buyer record — mirrors the seller AI card: draft, approve, decline with feedback. */
export default function BuyerAiDraftCard({ submissionId }: { submissionId: string }) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [pauseReason, setPauseReason] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [why, setWhy] = useState("");
  const [showSnapshot, setShowSnapshot] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("buyer_ai_drafts").select("*").eq("submission_id", submissionId).is("deleted_at", null).maybeSingle();
    const d = data as Draft | null;
    setDraft(d);
    if (d?.status === "proposed") { setSubject(d.subject ?? ""); setBody(d.body ?? ""); }
    const { data: state } = await supabase.from("automation_job_state").select("status,pause_reason").eq("job_name", "buyer-ai-drafts").maybeSingle();
    setPauseReason(state?.status === "paused" ? state.pause_reason || "Buyer AI is paused." : null);
  }, [submissionId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (draft?.status !== "processing") return; const t = setInterval(load, 4000); return () => clearInterval(t); }, [draft?.status, load]);

  const act = async (name: string, payload: Record<string, unknown>, done: string) => {
    setBusy(name);
    try { await callBuyerAi(payload); toast({ title: done }); await load(); }
    catch (e) { toast({ title: "Buyer AI couldn't finish", description: (e as Error).message, variant: "destructive" }); await load(); }
    setBusy(null);
  };

  const reject = async () => {
    if (!why.trim()) { toast({ title: "Tell the AI why", description: "A short reason helps it learn what it got wrong." }); return; }
    await act("reject", { action: "reject", draft_id: draft!.id, reason: why.trim() }, "Draft declined");
    setDeclining(false); setWhy("");
  };

  const proposed = draft?.status === "proposed";
  const working = busy === "run" || draft?.status === "processing";

  return (
    <section aria-label="Buyer AI Agent" className="rounded-2xl border border-indigo-500/40 bg-indigo-500/5 ring-1 ring-indigo-500/15 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-indigo-600 text-primary-foreground flex items-center justify-center"><Bot className="w-4 h-4" /></span>
          <div>
            <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">AI Agent · Buyer</p>
            <p className="text-[11px] text-muted-foreground">
              {draft ? `Last drafted ${new Date(draft.created_at).toLocaleString()}` : "Hasn't drafted a reply yet"}
              {proposed ? " · waiting for approval" : ""}
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => act("run", { action: "run", submission_id: submissionId }, "Buyer reply drafted")} disabled={!!busy || !!pauseReason || ["processing", "sending", "sent", "send_failed"].includes(draft?.status ?? "")} className="border-indigo-500/40 text-indigo-700 dark:text-indigo-300">
          {working ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
          {draft ? "Draft again" : "Draft reply"}
        </Button>
      </div>

      {pauseReason && (
        <div className="space-y-2">
          <p className="text-xs text-destructive">{pauseReason}</p>
          <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act("resume", { action: "resume" }, "Buyer AI resumed")}>Resume after restoring access</Button>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">Approve the AI's reply, decline it and say why, or edit the wording first. Nothing is sent until you approve it.</p>

      {!draft && !working && (
        <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-indigo-500/30 p-3">No reply drafted yet. New buyer forms are drafted automatically; you can also press Draft reply.</p>
      )}
      {working && <p className="text-xs text-muted-foreground">Checking matching spaces and drafting…</p>}
      {draft?.status === "failed" && <p className="text-sm text-destructive">Last draft failed: {draft.error}</p>}
      {draft?.reason && !proposed && <p className="text-xs text-muted-foreground">{draft.reason}</p>}

      {!!draft?.inventory_snapshot?.length && (
        <div>
          <button onClick={() => setShowSnapshot((v) => !v)} className="text-xs text-indigo-700 dark:text-indigo-300 inline-flex items-center gap-1">
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSnapshot ? "rotate-180" : ""}`} /> Spaces the AI matched ({draft.inventory_snapshot.length})
          </button>
          {showSnapshot && (
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {draft.inventory_snapshot.map((x, i) => (
                <li key={i} className="rounded-lg bg-card/70 border border-indigo-500/20 px-3 py-2 text-xs">
                  <span className="font-medium text-foreground">{x.garden}</span> · {x.spaces} space{x.spaces === 1 ? "" : "s"}<br />
                  <span className="text-muted-foreground">Retail {x.retail_total} · ours {x.our_total} · {x.readiness}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {proposed && (
        <div className="rounded-xl border border-indigo-500/30 bg-card p-4 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300"><Mail className="w-3.5 h-3.5" />Reply email</div>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[220px] text-sm leading-relaxed" />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => act("approve", { action: "approve", draft_id: draft.id, subject, body }, "Reply sent")} disabled={!!busy || !subject.trim() || !body.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-primary-foreground">
              {busy === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" />Approve & send</>}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDeclining((v) => !v)} disabled={!!busy}><X className="w-4 h-4 mr-1" />Decline</Button>
          </div>
          {declining && (
            <div className="space-y-2 rounded-lg border border-border p-2.5">
              <Textarea value={why} onChange={(e) => setWhy(e.target.value)} rows={2} placeholder="Why is this wrong? (e.g. they asked for a niche, not a burial plot)" className="text-sm" />
              <Button size="sm" variant="outline" onClick={reject} disabled={busy === "reject" || !why.trim()}>
                {busy === "reject" ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}Decline and tell the AI
              </Button>
            </div>
          )}
        </div>
      )}

      {draft && ["sent", "rejected", "sending", "send_failed"].includes(draft.status) && (
        <div className="rounded-xl bg-card/70 border border-indigo-500/20 px-3 py-2 text-xs space-y-1">
          <p className="text-foreground">
            <span className="font-medium">{draft.status === "sent" ? "Reply approved and sent" : draft.status === "rejected" ? "Reply declined" : draft.status === "sending" ? "Sending…" : "Send failed"}</span>
            {draft.decided_by_name ? ` by ${draft.decided_by_name}` : ""} · {new Date(draft.created_at).toLocaleDateString()}
          </p>
          {draft.decision_reason && <p className="text-muted-foreground">Reason: {draft.decision_reason}</p>}
          {draft.status === "send_failed" && draft.error && <p className="text-destructive">{draft.error}</p>}
          {draft.body && <pre className="whitespace-pre-wrap text-sm text-foreground bg-muted/40 rounded-lg p-3 font-sans mt-1">{draft.body}</pre>}
        </div>
      )}
    </section>
  );
}
