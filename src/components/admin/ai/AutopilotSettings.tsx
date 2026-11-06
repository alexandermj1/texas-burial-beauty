import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type Status = { settings: { mode: "off" | "selected" | "all"; dailyReviews: number }; state: { status: string; pause_reason: string | null; last_completed_at: string | null } | null; last24h: { reviews: number; sent: number; held: number } };

const MODES = [
  { v: "off", label: "Off" },
  { v: "selected", label: "Chosen sellers only" },
  { v: "all", label: "All sellers" },
] as const;

/** Owner switch for the Seller AI autopilot: replies and check-backs without a staff click. */
export default function AutopilotSettings() {
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

  useEffect(() => { call({ op: "status" }); }, [call]);
  if (!s) return <p className="text-xs text-muted-foreground">Loading autopilot…</p>;
  const paused = s.state?.status === "paused" && s.settings.mode !== "off";

  return (
    <section aria-label="Seller AI autopilot" className="rounded-xl border border-border bg-card p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Seller AI autopilot</p>
          <p className="text-xs text-muted-foreground">Replies with a natural delay (Texas daytime only), checks back when sellers go quiet, and only re-reads what changed. Records flagged for a person are left alone.</p>
        </div>
        {busy && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {MODES.map((m) => (
          <Button key={m.v} size="sm" variant={s.settings.mode === m.v ? "default" : "outline"} disabled={busy}
            onClick={() => call({ op: "set", mode: m.v, daily_reviews: Number(daily) })}>{m.label}</Button>
        ))}
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground ml-2">
          Max reviews per day
          <Input value={daily} onChange={(e) => setDaily(e.target.value)} onBlur={() => call({ op: "set", mode: s.settings.mode, daily_reviews: Number(daily) })} className="h-8 w-16 text-xs" inputMode="numeric" />
        </label>
      </div>
      {paused && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-destructive">Paused: {s.state?.pause_reason}</span>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => call({ op: "resume" })}>Resume</Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Last 24 hours: {s.last24h.reviews ?? 0} reviews · {s.last24h.sent ?? 0} emails sent · {s.last24h.held ?? 0} waiting to send
        {s.state?.last_completed_at ? ` · last check ${new Date(s.state.last_completed_at).toLocaleTimeString()}` : ""}
      </p>
    </section>
  );
}
