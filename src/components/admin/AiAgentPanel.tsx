import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, BookOpen } from "lucide-react";
import AiActionCard, { type AiAction as Action } from "./ai/AiActionCard";

type Sub = { id: string; name: string | null; cemetery: string | null; email: string | null };
type View = "approve" | "human" | "done" | "playbook";

export default function AiAgentPanel({ onOpenSubmission }: { onOpenSubmission?: (id: string) => void }) {
  const { toast } = useToast();
  const [view, setView] = useState<View>("approve");
  const [actions, setActions] = useState<Action[]>([]);
  const [subs, setSubs] = useState<Record<string, Sub>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [playbook, setPlaybook] = useState<{ version: number; content: string } | null>(null);
  const [pbDraft, setPbDraft] = useState("");
  const [runId, setRunId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("ai_agent_actions" as never).select("*").is("deleted_at", null)
      .order("created_at", { ascending: false }).limit(200);
    const rows = (data ?? []) as unknown as Action[];
    setActions(rows);
    const ids = [...new Set(rows.map((r) => r.submission_id))];
    if (ids.length) {
      const { data: s } = await supabase.from("contact_submissions").select("id,name,cemetery,email").in("id", ids);
      setSubs(Object.fromEntries((s ?? []).map((x) => [x.id, x as Sub])));
    }
    const { data: pb } = await supabase.from("ai_playbook" as never).select("version,content").is("deleted_at", null)
      .order("version", { ascending: false }).limit(1).maybeSingle();
    if (pb) { setPlaybook(pb as never); setPbDraft((pb as any).content); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const call = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("seller-agent", { body });
    if (error) {
      let msg = error.message;
      try { msg = (await (error as any).context?.json())?.error ?? msg; } catch { /* keep */ }
      throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
    return data;
  };

  const sweep = async () => {
    setBusy("sweep");
    try {
      const r = await call({ action: "sweep", limit: 8 });
      toast({ title: `Reviewed ${r?.processed ?? 0} sellers`, description: "New proposals are in the queue." });
      await load();
    } catch (e) { toast({ title: "Review failed", description: (e as Error).message, variant: "destructive" }); }
    setBusy(null);
  };

  const runOne = async () => {
    const id = runId.trim();
    if (!id) return;
    setBusy("one");
    try {
      const r = await call({ action: "run", submission_id: id });
      toast({ title: r?.status === "done" ? "Seller reviewed" : "Skipped", description: r?.reason ?? r?.decision?.next_step });
      setRunId("");
      await load();
    } catch (e) { toast({ title: "Review failed", description: (e as Error).message, variant: "destructive" }); }
    setBusy(null);
  };

  const savePlaybook = async () => {
    setBusy("pb");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("ai_playbook" as never).insert({
      version: (playbook?.version ?? 0) + 1, content: pbDraft, created_by_name: u.user?.email ?? null, change_note: "Edited in admin",
    } as never);
    if (error) toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
    else { toast({ title: "Playbook saved" }); await load(); }
    setBusy(null);
  };

  const lists = useMemo(() => ({
    approve: actions.filter((a) => a.status === "proposed" && a.action_type !== "flag_human"),
    human: actions.filter((a) => a.status === "proposed" && a.action_type === "flag_human"),
    done: actions.filter((a) => !["proposed", "superseded"].includes(a.status)),
  }), [actions]);

  const tabs: { key: View; label: string; count?: number }[] = [
    { key: "approve", label: "Awaiting approval", count: lists.approve.length },
    { key: "human", label: "Needs you", count: lists.human.length },
    { key: "done", label: "Done", count: lists.done.length },
    { key: "playbook", label: "Playbook" },
  ];

  const shown = view === "playbook" ? [] : lists[view];

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-foreground">AI Seller Agent</h2>
          <p className="text-sm text-muted-foreground">Sellers only. Nothing is sent to a customer until someone approves it.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input value={runId} onChange={(e) => setRunId(e.target.value)} placeholder="Submission ID" className="w-64 h-9" />
          <Button variant="outline" size="sm" onClick={runOne} disabled={busy === "one" || !runId.trim()}>
            {busy === "one" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Review one seller"}
          </Button>
          <Button size="sm" onClick={sweep} disabled={busy === "sweep"}>
            {busy === "sweep" ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
            Review recent sellers
          </Button>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setView(t.key)}
            className={`px-3.5 py-1.5 rounded-full text-sm border transition-colors ${view === t.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {t.key === "playbook" && <BookOpen className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />}
            {t.label}{typeof t.count === "number" ? ` (${t.count})` : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : view === "playbook" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Version {playbook?.version ?? "—"}. The agent follows this playbook. Saving creates a new version; older versions are kept.</p>
          <Textarea value={pbDraft} onChange={(e) => setPbDraft(e.target.value)} className="min-h-[60vh] font-mono text-xs leading-relaxed" />
          <Button onClick={savePlaybook} disabled={busy === "pb" || pbDraft === playbook?.content}>Save new version</Button>
        </div>
      ) : shown.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground border border-dashed border-border rounded-2xl">Nothing here right now.</div>
      ) : (
        <div className="space-y-3">
          {shown.map((a) => {
            const s = subs[a.submission_id];
            return <AiActionCard key={a.id} action={a} sellerName={s?.name ?? null} sellerSub={`${s?.cemetery ?? ""}${s?.email ? ` · ${s.email}` : ""}`} onOpenSubmission={onOpenSubmission} onChanged={load} />;
          })}
        </div>
      )}
    </div>
  );
}
