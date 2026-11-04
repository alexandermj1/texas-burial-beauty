import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Check, X, RefreshCw, Pencil } from "lucide-react";
import { toast } from "sonner";

export type BuyerWant = { id: string; submission_id: string; status: string; summary: string; buyer_words: string | null; confidence: string | null; staff_edited: boolean; edited_by_name: string | null; updated_at: string };
export type BuyerWantAlert = { id: string; submission_id: string; seller_id: string; fit: string; reason: string; offer_summary: string | null; ai_verdict?: string | null; investigation?: { why?: string; checked?: string[]; concerns?: string[]; suggested_next?: string } | null; created_at: string; dismissed_at: string | null };

/** Open "waiting for" notes and undismissed alerts, refreshed every minute. */
export function useBuyerWatch() {
  const [wants, setWants] = useState<Record<string, BuyerWant>>({});
  const [alerts, setAlerts] = useState<Record<string, BuyerWantAlert[]>>({});
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    (async () => {
      const [w, a] = await Promise.all([
        supabase.from("buyer_wants" as any).select("*").is("deleted_at", null).limit(2000),
        supabase.from("buyer_want_alerts" as any).select("*").is("deleted_at", null).is("dismissed_at", null).order("created_at", { ascending: false }).limit(1000),
      ]);
      if (!live) return;
      if (!w.error) setWants(Object.fromEntries(((w.data ?? []) as any[]).map(r => [r.submission_id, r])));
      if (!a.error) {
        const m: Record<string, BuyerWantAlert[]> = {};
        for (const r of (a.data ?? []) as any[]) (m[r.submission_id] ??= []).push(r);
        setAlerts(m);
      }
    })();
    const t = setInterval(() => { if (document.visibilityState === "visible") setTick(x => x + 1); }, 60_000);
    return () => { live = false; clearInterval(t); };
  }, [tick]);
  return { wants, alerts, refresh: () => setTick(x => x + 1) };
}

const STATUS: Record<string, string> = { waiting: "Waiting for", done: "No longer looking", none: "Nothing pending" };

export function BuyerWatchPanel({ submissionId, want, alerts, onChange }: { submissionId: string; want?: BuyerWant; alerts: BuyerWantAlert[]; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(want?.summary ?? "");
  const [status, setStatus] = useState(want?.status ?? "waiting");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setText(want?.summary ?? ""); setStatus(want?.status ?? "waiting"); }, [want?.id, want?.updated_at]);

  const call = async (body: any, ok: string) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("buyer-watch", { body });
    setBusy(false);
    if (error || (data as any)?.error) return toast.error((data as any)?.error || error?.message || "Failed");
    toast.success((data as any)?.note || ok);
    onChange();
  };

  return (
    <div className="bg-card rounded-xl border border-border/60 p-3 space-y-2.5">
      {alerts.map(a => (
        <div key={a.id} className="rounded-lg border border-primary/40 bg-primary/5 p-2.5 space-y-1.5">
          <div className="text-[11px] uppercase tracking-wide text-primary inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Back on top — {a.fit === "good" ? "new plot fits what they wanted" : "new plot is close to what they wanted"}
          </div>
          {a.ai_verdict === "hidden" && <p className="text-xs font-medium text-destructive">On a closer look the AI thinks this doesn't suit them. Dismiss it, or contact them if you disagree.</p>}
          <p className="text-sm text-foreground">{a.reason}</p>
          {a.offer_summary && <p className="text-xs text-muted-foreground">{a.offer_summary}</p>}
          {a.investigation && (
            <details className="text-xs text-foreground/90">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">What the AI checked and why</summary>
              <div className="mt-1.5 space-y-1.5">
                {a.investigation.why && <p>{a.investigation.why}</p>}
                {!!a.investigation.checked?.length && <ul className="list-disc pl-4 space-y-0.5">{a.investigation.checked.map((c, i) => <li key={i}>{c}</li>)}</ul>}
                {!!a.investigation.concerns?.length && <div><span className="font-medium">Double-check:</span><ul className="list-disc pl-4 space-y-0.5">{a.investigation.concerns.map((c, i) => <li key={i}>{c}</li>)}</ul></div>}
                {a.investigation.suggested_next && <p><span className="font-medium">Suggested next step:</span> {a.investigation.suggested_next}</p>}
              </div>
            </details>
          )}
          <div className="flex flex-wrap gap-1.5">
            <button disabled={busy} onClick={() => call({ action: "dismiss_alert", alert_id: a.id, verdict: "useful", feedback: null }, "Marked useful")} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-muted border border-border hover:bg-muted/70"><Check className="w-3 h-3" /> Done — useful</button>
            <button disabled={busy} onClick={() => { const why = window.prompt("Why isn't it suitable? (helps tune the AI)") ; if (why === null) return; call({ action: "dismiss_alert", alert_id: a.id, verdict: "not_suitable", feedback: why || null }, "Thanks — noted"); }} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-muted border border-border hover:bg-muted/70"><X className="w-3 h-3" /> Not suitable</button>
            <button disabled={busy} onClick={() => call({ action: "recheck_alert", alert_id: a.id }, "Checked again")} title="Have the AI re-read both records now" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-muted-foreground hover:text-foreground"><RefreshCw className={`w-3 h-3 ${busy ? "animate-spin" : ""}`} /> Check again</button>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{want ? STATUS[want.status] ?? want.status : "Waiting for"}</span>
        {want?.confidence === "low" && !want.staff_edited && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">AI unsure — check</span>}
        {want?.staff_edited && <span className="text-[10px] text-muted-foreground">edited by {want.edited_by_name}</span>}
        <span className="flex-1" />
        <button disabled={busy} onClick={() => call({ action: "analyze", submission_id: submissionId }, "Re-read their latest reply")} title="Ask the AI to re-read their latest reply" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><RefreshCw className={`w-3 h-3 ${busy ? "animate-spin" : ""}`} /> Re-read reply</button>
        <button onClick={() => setEditing(e => !e)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Pencil className="w-3 h-3" /> Edit</button>
      </div>
      {!editing ? (
        <div className="text-sm text-foreground">
          {want?.summary || <span className="text-muted-foreground">Nothing recorded yet. The AI fills this in when the buyer replies to one of our emails.</span>}
          {want?.buyer_words && <p className="text-xs text-muted-foreground italic mt-1">“{want.buyer_words}”</p>}
        </div>
      ) : (
        <div className="space-y-2">
          <select value={status} onChange={e => setStatus(e.target.value)} className="text-xs border border-border rounded px-2 py-1 bg-background">
            <option value="waiting">Waiting — watch for new plots</option>
            <option value="none">Nothing pending</option>
            <option value="done">No longer looking</option>
          </select>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3} className="w-full text-sm border border-border rounded p-2 bg-background" placeholder="e.g. Wants 2 side-by-side at Restland or nearby, around $5,000" />
          <button disabled={busy} onClick={() => call({ action: "save_want", submission_id: submissionId, status, summary: text }, "Saved").then(() => setEditing(false))} className="px-3 py-1 rounded-full text-xs bg-primary text-primary-foreground">Save</button>
        </div>
      )}
    </div>
  );
}
