import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Power } from "lucide-react";
import SellerAiUsage from "./SellerAiUsage";
import { useSellerAiUsage } from "@/hooks/useSellerAiUsage";
import { usageDollars } from "@/lib/sellerDailyUsage";
import { cleanAttentionText } from "@/lib/attentionText";

type Mode = "off" | "selected" | "all";
type LogEntry = { id: string; submission_id: string; seller: string; status: string; status_reason: string | null; send_at: string; sent_at: string | null; created_at: string; subject: string | null; what: string | null; kind: string | null };
type Outcome = { label: string; tone: "email" | "change" | "staff" | "draft" | "held" | "problem" | "none" };
type ConsoleItem = { at: string; submission_id: string; seller: string; kind: string; text: string; outcomes?: Outcome[]; run_ids?: string[]; cost?: number | null; tokens?: number; partial?: boolean };
type Totals = { since: string; emails_sent: number; record_changes: number; records_to_staff: number; reviews: number; records_reviewed: number };
const TONE: Record<Outcome["tone"], string> = {
  email: "bg-primary text-primary-foreground", change: "bg-secondary text-secondary-foreground", staff: "bg-[hsl(var(--status-attention-soft))] text-[hsl(var(--status-attention-fg))]",
  draft: "bg-muted text-foreground", held: "bg-muted text-muted-foreground", problem: "bg-destructive/10 text-destructive", none: "bg-muted text-muted-foreground",
};
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
  upcoming?: ConsoleItem[]; activity?: ConsoleItem[]; totals?: Totals; can_control?: boolean;
};

const when = (iso?: string | null) => iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const STATUS_LABEL: Record<string, string> = { held: "Waiting to send", sending: "Sending", sent: "Sent", cancelled: "Not sent", failed: "Stopped — staff asked to check" };

/** Owner switch for the Seller AI autopilot, plus a log of everything it sent or held back. */
export default function AutopilotSettings({ onOpenSubmission }: { onOpenSubmission?: (id: string) => void }) {
  const { toast } = useToast();
  const { data: usage } = useSellerAiUsage();
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
  const activity = (s.activity ?? []).map(item => {
    const runs = usage?.runs.filter(r => item.run_ids?.includes(r.id)) ?? [];
    if (!runs.length) return item;
    const cost = runs.every(r => r.scan_usage?.equivalent != null) ? runs.reduce((n, r) => n + (r.scan_usage?.equivalent ?? 0), 0) : null;
    return { ...item, cost, tokens: runs.reduce((n, r) => n + (r.scan_usage?.input_tokens ?? 0) + (r.scan_usage?.output_tokens ?? 0), 0), partial: cost == null || runs.some(r => !["done", "error"].includes(r.status)) };
  });
  const t = s.totals;

  return (
    <section aria-label="Seller AI autopilot" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-semibold flex items-center gap-2"><Power className="w-4 h-4" />Seller AI control center {busy && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}</p>
          <p className="text-xs text-muted-foreground mt-1">Sol · {paused ? "Paused" : on ? "Automatic seller follow-up active" : "Automatic seller follow-up off"}</p>
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
      {t && (
        <div className="rounded-lg border border-border p-3 text-xs">
          <p className="font-semibold">Since autopilot was switched on ({when(t.since)}) — without an admin</p>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div><p className="text-muted-foreground">Emails sent</p><p className="text-base font-semibold tabular-nums">{t.emails_sent}</p></div>
            <div><p className="text-muted-foreground">Record changes</p><p className="text-base font-semibold tabular-nums">{t.record_changes}</p></div>
            <div><p className="text-muted-foreground">Records passed to staff</p><p className="text-base font-semibold tabular-nums">{t.records_to_staff}</p></div>
            <div><p className="text-muted-foreground">Reviews</p><p className="text-base font-semibold tabular-nums">{t.reviews} <span className="text-xs font-normal text-muted-foreground">on {t.records_reviewed} sellers</span></p></div>
          </div>
        </div>
      )}
      <SellerAiUsage />
      <details className="border-y border-border py-3"><summary className="cursor-pointer text-xs font-medium text-muted-foreground">Daily usage · last seven days</summary><div className="pt-3"><SellerAiUsage history /></div></details>
      <div className="grid gap-3 lg:grid-cols-2">
        <Console title="Coming up next" empty="Nothing scheduled yet." items={s.upcoming ?? []} onOpen={onOpenSubmission} />
        <Console title="Live activity" empty="No activity yet." items={activity} onOpen={onOpenSubmission} live />
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
                <Button type="button" variant="ghost" onClick={() => onOpen?.(it.submission_id)} className="grid h-auto w-full grid-cols-[5.5rem_1fr] items-start gap-3 rounded-none px-3 py-3 text-left text-xs font-normal whitespace-normal">
                  <span className="tabular-nums text-muted-foreground">{when(it.at)}</span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-1.5"><span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${k.cls}`}>{k.label}</span><span className="break-words font-semibold">{it.seller}</span></span>
                    {it.text && <span className="mt-1 block text-muted-foreground break-words">{cleanAttentionText(it.text)}</span>}
                    {!!it.outcomes?.length && <span className="mt-1.5 flex flex-wrap gap-1">{it.outcomes.map((o, j) => <span key={j} className={`rounded px-1.5 py-0.5 text-[10px] font-medium break-words ${TONE[o.tone]}`}>{cleanAttentionText(o.label)}</span>)}</span>}
                    {it.tokens !== undefined && <span className="mt-1.5 block text-[10px] tabular-nums text-primary">{it.tokens.toLocaleString()} tokens · {it.cost == null ? "Estimate unavailable" : `${usageDollars(it.cost)} USD estimated`}{it.partial && " · partial"}</span>}
                  </span>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
