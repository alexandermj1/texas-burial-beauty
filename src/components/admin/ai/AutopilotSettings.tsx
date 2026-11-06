import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Power } from "lucide-react";

type Mode = "off" | "selected" | "all";
type LogEntry = { id: string; submission_id: string; seller: string; status: string; status_reason: string | null; send_at: string; sent_at: string | null; created_at: string; subject: string | null; what: string | null; kind: string | null };
type ConsoleItem = { at: string; submission_id: string; seller: string; kind: string; text: string };
const KIND: Record<string, { label: string; cls: string }> = {
  send: { label: "Reply", cls: "bg-primary/10 text-primary" }, check: { label: "Check-in", cls: "bg-muted text-muted-foreground" },
  review: { label: "Reviewed", cls: "bg-secondary text-secondary-foreground" }, running: { label: "Working", cls: "bg-primary/10 text-primary" },
  sent: { label: "Emailed", cls: "bg-primary text-primary-foreground" }, cancelled: { label: "Held back", cls: "bg-muted text-muted-foreground" },
  error: { label: "Problem", cls: "bg-destructive/10 text-destructive" }, flag: { label: "Staff", cls: "bg-[hsl(var(--status-attention-soft))] text-[hsl(var(--status-attention-fg))]" },
};
type Status = {
  settings: { mode: Mode; dailyReviews: number };
  state: { status: string; pause_reason: string | null; last_completed_at: string | null } | null;
  last24h: { reviews: number; sent: number; held: number };
  log?: LogEntry[]; last_sent_at?: string | null; last_review?: { created_at: string } | null;
  upcoming?: ConsoleItem[]; activity?: ConsoleItem[]; can_control?: boolean;
};

const when = (iso?: string | null) => iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
          <Switch checked={on} disabled={busy || !s.can_control} onCheckedChange={(v) => setMode(v ? "all" : "off")} aria-label="Seller AI autopilot on or off" />
        </label>
      </div>
      {on && s.can_control && (
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
      <div className="grid gap-3 lg:grid-cols-2">
        <Console title="Coming up next" empty="Nothing scheduled yet." items={s.upcoming ?? []} onOpen={onOpenSubmission} />
        <Console title="Live activity" empty="No activity yet." items={s.activity ?? []} onOpen={onOpenSubmission} live />
      </div>
    </section>
  );
}

function Console({ title, items, empty, onOpen, live }: { title: string; items: ConsoleItem[]; empty: string; onOpen?: (id: string) => void; live?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-background">
      <p className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs font-semibold">
        {live && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" aria-hidden />}{title}
        <span className="ml-auto font-normal text-muted-foreground">{items.length}</span>
      </p>
      {!items.length ? <p className="px-3 py-3 text-xs text-muted-foreground">{empty}</p> : (
        <ul className="max-h-96 divide-y divide-border overflow-y-auto">
          {items.map((it, i) => {
            const k = KIND[it.kind] ?? KIND.check;
            return (
              <li key={i}>
                <button type="button" onClick={() => onOpen?.(it.submission_id)} className="grid w-full grid-cols-[4.5rem_1fr] gap-2 px-3 py-2 text-left text-xs hover:bg-muted/50">
                  <span className="tabular-nums text-muted-foreground">{when(it.at)}</span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5"><span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${k.cls}`}>{k.label}</span><span className="truncate font-semibold">{it.seller}</span></span>
                    <span className="mt-0.5 block text-muted-foreground line-clamp-2">{it.text}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
