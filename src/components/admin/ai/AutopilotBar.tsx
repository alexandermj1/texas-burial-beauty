import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bot, Loader2 } from "lucide-react";

const ago = (iso?: string | null) => {
  if (!iso) return "never";
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

/** Always-visible on/off switch for the Seller AI autopilot at the top of the submissions list (admins only). */
export default function AutopilotBar({ onOpenPanel }: { onOpenPanel: () => void }) {
  const [s, setS] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const call = useCallback(async (body: Record<string, unknown>) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("seller-autopilot", { body });
    setBusy(false);
    if (!error && (data as any)?.settings) setS(data);
  }, []);
  useEffect(() => { call({ op: "status" }); const t = setInterval(() => call({ op: "status" }), 60_000); return () => clearInterval(t); }, [call]);
  if (!s) return null;
  const on = s.settings.mode !== "off";
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 mb-3">
      <Bot className="w-4 h-4 text-primary" />
      <span className="text-sm font-semibold">Seller AI</span>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={on} disabled={busy} onCheckedChange={(v) => call({ op: "set", mode: v ? "all" : "off", daily_reviews: s.settings.dailyReviews })} aria-label="Seller AI on or off" />
        <span className={on ? "font-semibold text-primary" : "text-muted-foreground"}>{on ? "On" : "Off"}</span>
      </label>
      {busy && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
      <span className="text-xs text-muted-foreground">Last reply {ago(s.last_sent_at)} · {s.last24h?.reviews ?? 0} reviews, {s.last24h?.sent ?? 0} sent in 24h · {s.last24h?.held ?? 0} waiting to send</span>
      <Button size="sm" variant="outline" className="ml-auto h-7" onClick={onOpenPanel}>AI panel & reply log</Button>
    </div>
  );
}
