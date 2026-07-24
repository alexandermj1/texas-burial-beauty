import { useEffect, useMemo, useState } from "react";
import { X, Send, MessageSquare, Users, Check } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { cleanDisplayName } from "@/lib/displayName";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Teammate {
  id: string;
  name: string;
  email: string;
}

// Send a direct message (or team-wide broadcast) that lands in the recipient's
// notification bell. Pick one or more teammates, or "Everyone".
const BroadcastDialog = ({ open, onClose }: Props) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [team, setTeam] = useState<Teammate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [everyone, setEveryone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setBody("");
    setSelected(new Set());
    setEveryone(false);
    (async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, email");
      const list: Teammate[] = ((data as any[]) || [])
        .filter((p) => p.id !== user?.id)
        .map((p) => ({
          id: p.id,
          name: cleanDisplayName(p.full_name) || (p.email ? p.email.split("@")[0] : "Teammate"),
          email: p.email || "",
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setTeam(list);
    })();
  }, [open, user?.id]);

  const myName = cleanDisplayName(user?.user_metadata?.full_name) || user?.email?.split("@")[0] || "Someone";

  const recipients = useMemo(() => (everyone ? team.map((t) => t.id) : Array.from(selected)), [everyone, selected, team]);

  if (!open) return null;

  const toggle = (id: string) => {
    setEveryone(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const send = async () => {
    if (!body.trim() || recipients.length === 0) return;
    setSending(true);
    const displayTitle = title.trim()
      ? `${myName}: ${title.trim()}`
      : `New message from ${myName}`;
    const { error } = await supabase.from("user_notifications" as any).insert(
      recipients.map((id) => ({
        user_id: id,
        title: displayTitle,
        body: body.trim().slice(0, 500),
        link_url: null,
        source_type: everyone ? "broadcast" : "direct_message",
      }))
    );
    setSending(false);
    if (error) { toast({ title: "Couldn't send", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Message sent to ${recipients.length} teammate${recipients.length === 1 ? "" : "s"}` });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center"><MessageSquare className="w-4 h-4" /></span>
            <div>
              <h3 className="font-display text-lg text-foreground">Message a teammate</h3>
              <p className="text-[11px] text-muted-foreground">Lands in their notification bell instantly.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-2">To</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => { setEveryone((v) => !v); setSelected(new Set()); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                everyone ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:border-primary/50"
              }`}
            >
              <Users className="w-3 h-3" /> Everyone
            </button>
            {team.map((t) => {
              const on = selected.has(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    on ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {on && <Check className="w-3 h-3" />} {t.name}
                </button>
              );
            })}
            {team.length === 0 && <p className="text-xs text-muted-foreground italic">No teammates found.</p>}
          </div>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Subject (optional)"
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder="Write your message…"
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          <button
            onClick={send}
            disabled={!body.trim() || recipients.length === 0 || sending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {sending ? "Sending..." : recipients.length > 0 ? `Send to ${recipients.length}` : "Pick a recipient"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default BroadcastDialog;
