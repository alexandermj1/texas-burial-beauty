import { useEffect, useState } from "react";
import { X, Send, Megaphone } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { cleanDisplayName } from "@/lib/displayName";

interface Props {
  open: boolean;
  onClose: () => void;
}

// Broadcast a notification to every teammate (admins + agents) without it being
// tied to a customer profile. Lands in their notification bell.
const BroadcastDialog = ({ open, onClose }: Props) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("Team announcement");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [memberCount, setMemberCount] = useState(0);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("id");
      setMemberCount((data?.length ?? 1) - 1);
    })();
  }, [open]);

  if (!open) return null;

  const myName = cleanDisplayName(user?.user_metadata?.full_name) || user?.email?.split("@")[0] || "Someone";

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    const { data: profiles } = await supabase.from("profiles").select("id");
    const targets = (profiles || []).map((p: any) => p.id).filter((id: string) => id !== user?.id);
    if (targets.length === 0) { toast({ title: "No teammates to notify" }); setSending(false); return; }
    const { error } = await supabase.from("user_notifications" as any).insert(
      targets.map((id: string) => ({
        user_id: id,
        title: `${myName}: ${title || "Team announcement"}`,
        body: body.trim().slice(0, 500),
        link_url: null,
        source_type: "broadcast",
      }))
    );
    setSending(false);
    if (error) { toast({ title: "Couldn't send", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Sent to ${targets.length} teammates` });
    setBody("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center"><Megaphone className="w-4 h-4" /></span>
            <div>
              <h3 className="font-display text-lg text-foreground">Message everyone</h3>
              <p className="text-[11px] text-muted-foreground">Sends a notification to all {memberCount} teammates. Not attached to any customer.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Subject"
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder="What do you want the team to know?"
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          <button
            onClick={send}
            disabled={!body.trim() || sending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" /> {sending ? "Sending..." : `Send to ${memberCount} teammates`}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default BroadcastDialog;
