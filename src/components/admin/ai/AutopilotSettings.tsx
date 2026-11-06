import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Power } from "lucide-react";

type Mode = "off" | "selected" | "all";
type LogEntry = { id: string; submission_id: string; seller: string; status: string; status_reason: string | null; send_at: string; sent_at: string | null; created_at: string; subject: string | null; what: string | null; kind: string | null };
type Status = {
  settings: { mode: Mode; dailyReviews: number };
  state: { status: string; pause_reason: string | null; last_completed_at: string | null } | null;
  last24h: { reviews: number; sent: number; held: number };
  log?: LogEntry[]; last_sent_at?: string | null; last_review?: { created_at: string } | null;
};

const when = (iso?: string | null) => iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
const STATUS_LABEL: Record<string, string> = { held: "Waiting to send", sending: "Sending", sent: "Sent", cancelled: "Not sent", failed: "Stopped — staff asked to check" };

/** Owner switch for the Seller AI autopilot, plus a log of everything it sent or held back. */
export default function AutopilotSettings({ onOpenSubmission }: { onOpenSubmission?: (id: string) => void }) {
  const { toast } = useToast();
  const [s, setS] = useState<Status | null>(null);
  const [daily, setDaily] = useState("40");
  const [busy, setBusy] = useState(false);

  const call = useCallback(async (body: Record<string, unknown>) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("seller-autopilot", { body });
    setBusy(false);
    if (error || (data as any)?.error) { toast({ title: "Autopilot", description: error?.message ?? (data as any).error, variant: "destructive" }); return; }
    if ((data as Status)?.settings) { setS(data as Status); setDaily(String((data as Status).settings.dailyReviews)); }
    return data;
  }, [toast]);

  useEffect(() => {
    call({ op: "status" });
    const t = setInterval(() => call({ op: "status" }), 60_000);
    return () => clearInterval(t);
  }, [call]);
  if (!s) return <p className="text-xs text-muted-foreground">Loading autopilot…</p>;
  const on = s.settings.mode !== "off";
  const paused = s.state?.status === "paused" && on;
  const setMode = (mode: Mode) => call({ op: "set", mode, daily_reviews: Number(daily) });

  return (
    <section aria-label="Seller AI autopilot" className="rounded-xl border border-border bg-card p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold flex items-center gap-2"><Power className="w-4 h-4" />Seller AI autopilot {busy && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}</p>
          <p className="text-xs text-muted-foreground">Uses Sonnet 5. Replies with a natural delay (Texas daytime only), carries out its own steps, checks back when sellers go quiet and puts records that need a person at the top of the list.</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold">
          {on ? "On" : "Off"}
          <Switch checked={on} disabled={busy} onCheckedChange={(v) => setMode(v ? "all" : "off")} aria-label="Seller AI autopilot on or off" />
        </label>
      </div>
      {on && (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant={s.settings.mode === "all" ? "default" : "outline"} disabled={busy} onClick={() => setMode("all")}>All sellers</Button>
          <Button size="sm" variant={s.settings.mode === "selected" ? "default" : "outline"} disabled={busy} onClick={() => setMode("selected")}>Chosen sellers only</Button>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground ml-2">
            Max reviews per day
            <Input value={daily} onChange={(e) => setDaily(e.target.value)} onBlur={() => call({ op: "set", mode: s.settings.mode, daily_reviews: Number(daily) })} className="h-8 w-16 text-xs" inputMode="numeric" />
          </label>
        </div>
      )}
      {paused && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-destructive">Paused: {s.state?.pause_reason}</span>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => call({ op: "resume" })}>Resume</Button>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="rounded-lg bg-muted/50 p-2"><p className="text-muted-foreground">Last AI reply</p><p className="font-semibold">{when(s.last_sent_at)}</p></div>
        <div className="rounded-lg bg-muted/50 p-2"><p className="text-muted-foreground">Last review</p><p className="font-semibold">{when(s.last_review?.created_at)}</p></div>
        <div className="rounded-lg bg-muted/50 p-2"><p className="text-muted-foreground">Last 24 hours</p><p className="font-semibold">{s.last24h.reviews ?? 0} reviews · {s.last24h.sent ?? 0} sent</p></div>
        <div className="rounded-lg bg-muted/50 p-2"><p className="text-muted-foreground">Waiting to send</p><p className="font-semibold">{s.last24h.held ?? 0}</p></div>
      </div>
      <div>
        <p className="text-xs font-semibold mb-1">Reply log</p>
        {!s.log?.length ? <p className="text-xs text-muted-foreground">Nothing sent yet.</p> : (
          <ul className="divide-y divide-border rounded-lg border border-border max-h-80 overflow-y-auto">
            {s.log.map((l) => (
              <li key={l.id}>
                <button type="button" onClick={() => onOpenSubmission?.(l.submission_id)} className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-muted/50">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold truncate">{l.seller}</span>
                    <span className={l.status === "sent" ? "text-primary font-medium" : l.status === "failed" ? "text-destructive" : "text-muted-foreground"}>{STATUS_LABEL[l.status] ?? l.status} · {when(l.sent_at ?? l.send_at)}</span>
                  </span>
                  <span className="block text-muted-foreground truncate">{l.subject ?? l.what ?? (l.kind ?? "").replace(/_/g, " ")}{l.status_reason ? ` — ${l.status_reason}` : ""}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
