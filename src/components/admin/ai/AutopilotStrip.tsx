import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { sellerAutopilotOn } from "../../../../supabase/functions/_shared/sellerAutopilotState";

type Memory = { summary: string; waiting_for: string | null; next_if_silent: string | null; due_at: string | null; reminder_count: number; last_route: string | null };
type Held = { id: string; send_at: string };

/** Per-seller autopilot switch plus the AI's own file note and its next check-back. */
export default function AutopilotStrip({ submissionId, refreshKey }: { submissionId: string; refreshKey?: unknown }) {
  const { toast } = useToast();
  const [on, setOn] = useState(false);
  const [mem, setMem] = useState<Memory | null>(null);
  const [held, setHeld] = useState<Held | null>(null);
  const [mode, setMode] = useState("off");

  const load = useCallback(async () => {
    const [{ data: sub }, { data: m }, { data: h }, { data: config }] = await Promise.all([
      supabase.from("contact_submissions").select("ai_autopilot,ai_paused_at").eq("id", submissionId).maybeSingle(),
      supabase.from("ai_record_memory").select("summary,waiting_for,next_if_silent,due_at,reminder_count,last_route").eq("submission_id", submissionId).maybeSingle(),
      supabase.from("ai_outbox").select("id,send_at").eq("submission_id", submissionId).eq("status", "held").order("send_at").limit(1).maybeSingle(),
      supabase.from("ai_agent_settings").select("value").eq("key", "seller_autopilot").maybeSingle(),
    ]);
    const currentMode = String((config?.value as Record<string, unknown> | undefined)?.mode ?? "off");
    setMode(currentMode);
    setOn(sellerAutopilotOn(currentMode, !!sub?.ai_autopilot, sub?.ai_paused_at ?? null));
    setMem((m as Memory) ?? null);
    setHeld((h as Held) ?? null);
  }, [submissionId]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const toggle = async (v: boolean) => {
    setOn(v);
    const { error } = mode === "all"
      ? await supabase.functions.invoke("seller-autopilot", { body: { op: "pause_record", submission_id: submissionId, paused: !v } })
      : await supabase.from("contact_submissions").update({ ai_autopilot: v } as never).eq("id", submissionId);
    if (error) { setOn(!v); toast({ title: "Couldn't update", description: error.message, variant: "destructive" }); }
  };
  const cancelHeld = async () => {
    if (!held) return;
    const { error } = await supabase.from("ai_outbox").update({ status: "cancelled", status_reason: "Cancelled by staff" }).eq("id", held.id);
    if (error) toast({ title: "Couldn't cancel", description: error.message, variant: "destructive" }); else load();
  };

  return (
    <div className="rounded-xl border border-border bg-card/80 p-2.5 text-xs space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 text-muted-foreground"><Switch checked={on} onCheckedChange={toggle} /> Autopilot for this seller</label>
        {mem?.due_at && <span className="text-muted-foreground">Next check: {new Date(mem.due_at).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}{mem.reminder_count ? ` · ${mem.reminder_count} reminder${mem.reminder_count === 1 ? "" : "s"} sent` : ""}</span>}
      </div>
      {held && (
        <p className="flex flex-wrap items-center gap-2">
          <span>Reply waiting to send at {new Date(held.send_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={cancelHeld}>Cancel</Button>
        </p>
      )}
      {mem?.summary && <p className="text-foreground"><span className="font-medium">AI's note:</span> {mem.summary}</p>}
      {mem?.waiting_for && <p className="text-muted-foreground">Waiting for: {mem.waiting_for}{mem.next_if_silent ? ` · If quiet: ${mem.next_if_silent}` : ""}</p>}
    </div>
  );
}
