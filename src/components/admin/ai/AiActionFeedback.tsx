import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type Feedback = { id: string; kind: string; comment: string | null; correct: boolean | null; went_live: boolean | null; author_name: string; created_at: string };
export default function AiActionFeedback({ actionId, completed, call }: { actionId: string; completed: boolean; call: (body: Record<string, unknown>) => Promise<unknown> }) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<Feedback[]>([]);
  const [comment, setComment] = useState("");
  const [correct, setCorrect] = useState("");
  const [live, setLive] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const { data, error } = await supabase.from("ai_agent_feedback").select("*").eq("action_id", actionId).order("created_at", { ascending: true });
    if (error) toast({ title: "Couldn't load feedback", description: error.message, variant: "destructive" });
    else setEntries(data ?? []);
  };
  useEffect(() => { void load(); }, [actionId]);
  const save = async (kind: "comment" | "outcome") => {
    setBusy(true);
    try {
      await call({ action: "feedback", action_id: actionId, kind, comment: comment.trim(), ...(kind === "outcome" ? { correct: correct === "yes", went_live: live === "yes" } : {}) });
      setComment(""); setCorrect(""); setLive(""); await load();
      toast({ title: "Feedback saved" });
    } catch (e) { toast({ title: "Couldn't save feedback", description: (e as Error).message, variant: "destructive" }); }
    setBusy(false);
  };
  return <div className="space-y-2 border-t border-border pt-3">
    {entries.map(e => <div key={e.id} className="text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{e.kind === "outcome" ? "Outcome review" : e.kind === "comment" ? "Comment" : e.kind}</span>
      {e.correct !== null && <> · {e.correct ? "Correct" : "Not correct"} · {e.went_live ? "Confirmed live" : "Not live / not applied"}</>}
      {e.comment && <p className="whitespace-pre-wrap text-foreground">{e.comment}</p>}
      <span>{e.author_name} · {new Date(e.created_at).toLocaleString()}</span>
    </div>)}
    <Textarea aria-label="Action comment" value={comment} maxLength={2000} onChange={e => setComment(e.target.value)} rows={2} placeholder={completed ? "What worked or needs correcting?" : "Comment on this suggestion"} />
    {completed && <div className="grid gap-2 sm:grid-cols-2">
      <Select value={correct} onValueChange={setCorrect}><SelectTrigger aria-label="Was the action correct?"><SelectValue placeholder="Was it correct?" /></SelectTrigger><SelectContent><SelectItem value="yes">Yes — correct</SelectItem><SelectItem value="no">No — needs correction</SelectItem></SelectContent></Select>
      <Select value={live} onValueChange={setLive}><SelectTrigger aria-label="Did the change go live?"><SelectValue placeholder="Did it actually go live?" /></SelectTrigger><SelectContent><SelectItem value="yes">Yes — checked and live</SelectItem><SelectItem value="no">No — not applied correctly</SelectItem></SelectContent></Select>
    </div>}
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" disabled={busy || !comment.trim()} onClick={() => save("comment")}>Save comment</Button>
      {completed && <Button size="sm" disabled={busy || !correct || !live} onClick={() => save("outcome")}>Save outcome feedback</Button>}
    </div>
  </div>;
}