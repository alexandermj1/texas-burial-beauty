import { useCallback, useEffect, useState } from "react";
import { Loader2, Sparkles, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type Draft = { id: string; status: string; subject: string | null; body: string | null; reason: string | null; error: string | null; inventory_snapshot: any[] };

async function callBuyerAi(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("buyer-agent", { body });
  if (error) { let msg = error.message; try { msg = (await (error as any).context?.json())?.error ?? msg; } catch { /* keep */ } throw new Error(String(msg)); }
  return data;
}

export default function BuyerAiDraftCard({ submissionId }: { submissionId: string }) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    const { data } = await supabase.from("buyer_ai_drafts").select("id,status,subject,body,reason,error,inventory_snapshot").eq("submission_id", submissionId).is("deleted_at", null).maybeSingle();
    const d = data as Draft | null;
    setDraft(d); setSubject(d?.subject ?? ""); setBody(d?.body ?? "");
  }, [submissionId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (draft?.status !== "processing") return; const t = setTimeout(load, 4000); return () => clearTimeout(t); }, [draft?.status, load]);

  const act = async (name: string, payload: Record<string, unknown>, done: string) => {
    setBusy(name);
    try { await callBuyerAi(payload); toast({ title: done }); await load(); }
    catch (e) { toast({ title: "Buyer AI couldn't finish", description: (e as Error).message, variant: "destructive" }); await load(); }
    setBusy(null);
  };

  return (
    <section className="rounded-xl border border-primary/30 bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /><h4 className="text-sm font-medium text-foreground">Buyer AI reply</h4></div>
        <Button size="sm" variant="outline" onClick={() => act("run", { action: "run", submission_id: submissionId }, "Buyer reply drafted")} disabled={!!busy || draft?.status === "processing" || draft?.status === "sent"}>
          {busy === "run" || draft?.status === "processing" ? <Loader2 className="w-4 h-4 animate-spin" /> : draft ? "Draft again" : "Draft reply"}
        </Button>
      </div>
      {!draft && <p className="text-xs text-muted-foreground">No buyer AI reply yet. New buyer forms are drafted automatically, and nothing is sent until someone approves it.</p>}
      {draft?.status === "processing" && <p className="text-xs text-muted-foreground">Checking matching spaces and drafting…</p>}
      {draft?.status === "failed" && <p className="text-xs text-destructive">{draft.error}</p>}
      {draft?.reason && <p className="text-xs text-muted-foreground">{draft.reason}</p>}
      {!!draft?.inventory_snapshot?.length && <ul className="grid gap-1.5 sm:grid-cols-2">{draft.inventory_snapshot.map((x, i) => <li key={i} className="rounded-lg bg-muted/40 px-3 py-2 text-xs"><span className="font-medium text-foreground">{x.garden}</span> · {x.spaces} space{x.spaces === 1 ? "" : "s"}<br /><span className="text-muted-foreground">Retail {x.retail_total} · ours {x.our_total} · {x.readiness}</span></li>)}</ul>}
      {draft?.status === "proposed" && <div className="space-y-2">
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[220px] text-sm leading-relaxed" />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => act("approve", { action: "approve", draft_id: draft.id, subject, body }, "Reply sent")} disabled={!!busy || !subject.trim() || !body.trim()}>{busy === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}Approve & send</Button>
          <Button size="sm" variant="ghost" onClick={() => act("reject", { action: "reject", draft_id: draft.id, reason: null }, "Draft declined")} disabled={!!busy}><X className="w-4 h-4 mr-1.5" />Decline</Button>
        </div>
      </div>}
      {draft && ["sent", "rejected", "sending", "send_failed"].includes(draft.status) && <p className="text-xs text-muted-foreground">{draft.status === "sent" ? "This reply was approved and sent." : draft.status === "rejected" ? "This reply was declined." : draft.status === "sending" ? "Sending…" : draft.error}</p>}
    </section>
  );
}