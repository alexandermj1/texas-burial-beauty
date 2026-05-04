// Realtime collaborative notes for a customer profile.
// - Live presence shows who is currently typing (Google Docs style)
// - Saved notes record author + timestamp and stream in for everyone instantly
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Send, Pencil, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface Note {
  id: string;
  customer_profile_id: string;
  body: string;
  author_user_id: string | null;
  author_name: string | null;
  created_at: string;
  updated_at: string;
}

interface PresenceState {
  user_id: string;
  name: string;
  typing: boolean;
  color: string;
}

const COLORS = ["#0ea5e9", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];
const colorFor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
};

const formatWhen = (iso: string) => {
  const d = new Date(iso);
  const now = Date.now();
  const diff = (now - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

interface Props {
  customerId: string;
  customerName?: string | null;
}

const CustomerNotes = ({ customerId }: Props) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [presence, setPresence] = useState<Record<string, PresenceState>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  const myId = user?.id ?? "anon";
  const myName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Someone";
  const myColor = useMemo(() => colorFor(myId), [myId]);

  // Load notes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("customer_notes" as any)
        .select("*")
        .eq("customer_profile_id", customerId)
        .order("created_at", { ascending: false });
      if (!cancelled && data) setNotes(data as any);
    })();
    return () => { cancelled = true; };
  }, [customerId]);

  // Realtime: postgres changes + presence
  useEffect(() => {
    const channel = supabase.channel(`customer-notes:${customerId}`, {
      config: { presence: { key: myId } },
    });

    channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "customer_notes", filter: `customer_profile_id=eq.${customerId}` }, (payload) => {
        const n = payload.new as Note;
        setNotes(prev => prev.some(x => x.id === n.id) ? prev : [n, ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "customer_notes", filter: `customer_profile_id=eq.${customerId}` }, (payload) => {
        const n = payload.new as Note;
        setNotes(prev => prev.map(x => x.id === n.id ? n : x));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "customer_notes", filter: `customer_profile_id=eq.${customerId}` }, (payload) => {
        const n = payload.old as Note;
        setNotes(prev => prev.filter(x => x.id !== n.id));
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceState>();
        const flat: Record<string, PresenceState> = {};
        Object.values(state).forEach(arr => arr.forEach(p => { flat[p.user_id] = p; }));
        setPresence(flat);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: myId, name: myName, typing: false, color: myColor });
        }
      });

    channelRef.current = channel;
    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [customerId, myId, myName, myColor]);

  // Broadcast typing status
  const broadcastTyping = (typing: boolean) => {
    channelRef.current?.track({ user_id: myId, name: myName, typing, color: myColor });
  };

  const onDraftChange = (v: string) => {
    setDraft(v);
    broadcastTyping(true);
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => broadcastTyping(false), 1500);
  };

  const submitNote = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    broadcastTyping(false);
    const { data, error } = await supabase.from("customer_notes" as any).insert({
      customer_profile_id: customerId,
      body,
      author_user_id: user?.id ?? null,
      author_name: myName,
    }).select().single();
    if (error) {
      toast({ title: "Could not save note", description: error.message, variant: "destructive" });
      setDraft(body);
      return;
    }
    if (data) setNotes(prev => prev.some(x => x.id === (data as any).id) ? prev : [data as any, ...prev]);
    // bump customer last_interaction_at so the panel reflects activity
    await supabase.from("customer_profiles" as any).update({ last_interaction_at: new Date().toISOString() }).eq("id", customerId);
  };

  const saveEdit = async (id: string) => {
    const body = editingDraft.trim();
    if (!body) return;
    setEditingId(null);
    const { error } = await supabase.from("customer_notes" as any).update({ body }).eq("id", id);
    if (error) toast({ title: "Could not update", description: error.message, variant: "destructive" });
  };

  const deleteNote = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    await supabase.from("customer_notes" as any).delete().eq("id", id);
  };

  // Presence excluding self
  const others = Object.values(presence).filter(p => p.user_id !== myId);
  const typingOthers = others.filter(p => p.typing);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Pencil className="w-3 h-3" /> Team notes ({notes.length})
        </p>
        {others.length > 0 && (
          <div className="flex items-center gap-1">
            {others.slice(0, 5).map(p => (
              <div
                key={p.user_id}
                title={`${p.name}${p.typing ? " (typing…)" : " viewing"}`}
                className="relative w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white ring-2 ring-card"
                style={{ background: p.color }}
              >
                {p.name.charAt(0).toUpperCase()}
                {p.typing && <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-card animate-pulse" />}
              </div>
            ))}
            <span className="text-[10px] text-muted-foreground ml-1">{others.length} viewing</span>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="rounded-lg border border-border bg-background p-2 focus-within:ring-2 focus-within:ring-primary/30">
        <textarea
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onBlur={() => broadcastTyping(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submitNote(); }
          }}
          rows={2}
          placeholder="Add a note for the team… (⌘/Ctrl + Enter to post)"
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none"
        />
        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="text-[10px] text-muted-foreground min-h-[14px]">
            <AnimatePresence>
              {typingOthers.length > 0 && (
                <motion.span
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="inline-flex items-center gap-1"
                >
                  <span className="inline-flex gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: "120ms" }} />
                    <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: "240ms" }} />
                  </span>
                  {typingOthers.map(p => p.name).join(", ")} {typingOthers.length === 1 ? "is" : "are"} typing…
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={submitNote}
            disabled={!draft.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            <Send className="w-3 h-3" /> Post
          </button>
        </div>
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No notes yet. Anything posted here is visible to your whole team in realtime.</p>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {notes.map(n => {
              const isMine = n.author_user_id === user?.id;
              const color = colorFor(n.author_user_id || n.author_name || "x");
              const edited = n.updated_at && n.updated_at !== n.created_at;
              return (
                <motion.li
                  key={n.id}
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-muted/40 rounded-lg p-3 border border-border/50"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white shrink-0" style={{ background: color }}>
                      {(n.author_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-xs font-medium text-foreground">{n.author_name || "Unknown"}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatWhen(n.created_at)}{edited ? " · edited" : ""}
                        </p>
                      </div>
                      {editingId === n.id ? (
                        <div className="mt-1.5">
                          <textarea
                            value={editingDraft}
                            onChange={(e) => setEditingDraft(e.target.value)}
                            rows={2}
                            className="w-full px-2 py-1.5 rounded-md bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                          />
                          <div className="flex justify-end gap-2 mt-1">
                            <button onClick={() => setEditingId(null)} className="text-[11px] text-muted-foreground hover:text-foreground">Cancel</button>
                            <button onClick={() => saveEdit(n.id)} className="text-[11px] font-medium text-primary hover:underline">Save</button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-foreground whitespace-pre-wrap mt-0.5">{n.body}</p>
                      )}
                      {isMine && editingId !== n.id && (
                        <div className="flex gap-3 mt-1.5">
                          <button onClick={() => { setEditingId(n.id); setEditingDraft(n.body); }} className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                          <button onClick={() => deleteNote(n.id)} className="text-[10px] text-muted-foreground hover:text-destructive inline-flex items-center gap-1">
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
};

export default CustomerNotes;
