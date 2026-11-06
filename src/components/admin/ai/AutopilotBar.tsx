import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bot } from "lucide-react";

/** Small toolbar pill showing whether the Seller AI is on; opens the AI panel. Owners only. */
export default function AutopilotBar({ onOpenPanel }: { onOpenPanel: () => void }) {
  const [s, setS] = useState<{ on: boolean } | null>(null);
  const load = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("seller-autopilot", { body: { op: "status" } });
    if (!error && (data as any)?.can_control) setS({ on: (data as any).settings.mode !== "off" });
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 120_000); return () => clearInterval(t); }, [load]);
  if (!s) return null;
  return (
    <button
      onClick={onOpenPanel}
      title="Seller AI — on/off switch, what's coming up next and live activity"
      className="h-8 px-3 rounded-full text-xs font-medium border bg-card text-muted-foreground border-border hover:text-foreground inline-flex items-center gap-1.5"
    >
      <Bot className="w-4 h-4" /> Seller AI
      <span className={`h-1.5 w-1.5 rounded-full ${s.on ? "bg-primary" : "bg-muted-foreground/40"}`} aria-hidden />
      <span className={s.on ? "text-primary" : ""}>{s.on ? "On" : "Off"}</span>
    </button>
  );
}
