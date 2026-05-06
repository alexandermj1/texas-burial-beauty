// Realtime collaborative notes for a customer profile.
// - Live presence shows who is currently typing (Google Docs style)
// - Saved notes record author + timestamp and stream in for everyone instantly
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Send, Pencil, Trash2, Reply, X, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { cleanDisplayName } from "@/lib/displayName";

interface Note {
  id: string;
  customer_profile_id: string;
  body: string;
  author_user_id: string | null;
  author_name: string | null;
  parent_note_id: string | null;
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
  const diff = (Date.now() - d.getTime()) / 1000;
  let rel: string;
  if (diff < 60) rel = "just now";
  else if (diff < 3600) rel = `${Math.floor(diff / 60)}m ago`;
  else if (diff < 86400) rel = `${Math.floor(diff / 3600)}h ago`;
  else rel = d.toLocaleString("en-US", { month: "short", day: "numeric" });
  const exact = d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  return { rel, exact };
};

const renderBody = (body: string) => {
  // Highlight @mentions visually
  const parts = body.split(/(@[\w.\-]+(?:\s[\w.\-]+)?)/g);
  return parts.map((p, i) =>
    p.startsWith("@")
      ? <span key={i} className="inline-block px-1 rounded bg-primary/15 text-primary font-medium">{p}</span>
      : <span key={i}>{p}</span>
  );
};

interface Props {
  customerId?: string;
  submissionId?: string;
  customerName?: string | null;
}

interface TeamMember { id: string; name: string; handle: string; }

const CustomerNotes = ({ customerId, submissionId }: Props) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Note | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [presence, setPresence] = useState<Record<string, PresenceState>>({});
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIdx, setMentionIdx] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const myId = user?.id ?? "anon";
  const myName = cleanDisplayName(user?.user_metadata?.full_name) || user?.email?.split("@")[0] || "Someone";
  const myColor = useMemo(() => colorFor(myId), [myId]);

  const scopeColumn = submissionId ? "submission_id" : "customer_profile_id";
  const scopeId = submissionId || customerId || "";

  // Load team (admins + agents) for @mention picker
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, email");
      if (data) {
        const used = new Set<string>();
        setTeam((data as any[]).map(p => {
          const cleaned = cleanDisplayName(p.full_name) || (p.email ? p.email.split("@")[0] : "user");
          // Handle = first word, alphanumerics only, lowercased. Disambiguate dupes with a numeric suffix.
          const base = (cleaned.split(/\s+/)[0] || "user").replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "user";
          let handle = base;
          let n = 2;
          while (used.has(handle)) handle = `${base}${n++}`;
          used.add(handle);
          return { id: p.id, name: cleaned, handle };
        }));
      }
    })();
  }, []);

  const filteredMentions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    const everyone: TeamMember = { id: "__everyone__", name: "Everyone on the team", handle: "everyone" };
    const list: TeamMember[] = [];
    if ("everyone".includes(q) || q === "") list.push(everyone);
    list.push(...team.filter(t => t.id !== user?.id && (t.handle.includes(q) || t.name.toLowerCase().includes(q))));
    return list.slice(0, 6);
  }, [mentionQuery, team, user?.id]);


  // Load notes
  useEffect(() => {
    if (!scopeId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("customer_notes" as any)
        .select("*")
        .eq(scopeColumn, scopeId)
        .order("created_at", { ascending: false });
      if (!cancelled && data) setNotes(data as any);
    })();
    return () => { cancelled = true; };
  }, [scopeId, scopeColumn]);

  // Realtime: postgres changes + presence
  useEffect(() => {
    if (!scopeId) return;
    const channel = supabase.channel(`notes:${scopeColumn}:${scopeId}`, {
      config: { presence: { key: myId } },
    });

    const filter = `${scopeColumn}=eq.${scopeId}`;
    channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "customer_notes", filter }, (payload) => {
        const n = payload.new as Note;
        setNotes(prev => prev.some(x => x.id === n.id) ? prev : [n, ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "customer_notes", filter }, (payload) => {
        const n = payload.new as Note;
        setNotes(prev => prev.map(x => x.id === n.id ? n : x));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "customer_notes", filter }, (payload) => {
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
  }, [scopeId, scopeColumn, myId, myName, myColor]);

  // Broadcast typing status
  const broadcastTyping = (typing: boolean) => {
    channelRef.current?.track({ user_id: myId, name: myName, typing, color: myColor });
  };

  const onDraftChange = (v: string) => {
    setDraft(v);
    broadcastTyping(true);
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => broadcastTyping(false), 1500);
    // Detect "@..." token at caret
    const ta = textareaRef.current;
    const pos = ta?.selectionStart ?? v.length;
    const before = v.slice(0, pos);
    const m = before.match(/(?:^|\s)@([\w.\-]*)$/);
    setMentionQuery(m ? m[1] : null);
    setMentionIdx(0);
  };

  const insertMention = (member: TeamMember) => {
    const ta = textareaRef.current;
    const pos = ta?.selectionStart ?? draft.length;
    const before = draft.slice(0, pos);
    const after = draft.slice(pos);
    const replaced = before.replace(/@([\w.\-]*)$/, `@${member.handle} `);
    const newDraft = replaced + after;
    setDraft(newDraft);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      const newPos = replaced.length;
      ta?.focus();
      ta?.setSelectionRange(newPos, newPos);
    });
  };

  const submitNote = async () => {
    const body = draft.trim();
    if (!body || !scopeId) return;
    setDraft("");
    setMentionQuery(null);
    broadcastTyping(false);
    const parentId = replyTo?.id ?? null;
    const insertPayload: any = {
      body,
      author_user_id: user?.id ?? null,
      author_name: myName,
      parent_note_id: parentId,
    };
    insertPayload[scopeColumn] = scopeId;
    const { data, error } = await supabase.from("customer_notes" as any).insert(insertPayload).select().single();
    if (error) {
      toast({ title: "Could not save note", description: error.message, variant: "destructive" });
      setDraft(body);
      return;
    }
    setReplyTo(null);
    if (data) setNotes(prev => prev.some(x => x.id === (data as any).id) ? prev : [data as any, ...prev]);
    if (customerId) {
      await supabase.from("customer_profiles" as any).update({ last_interaction_at: new Date().toISOString() }).eq("id", customerId);
    }
    // Notify mentioned teammates and (for replies) the parent author
    const mentions = Array.from(new Set((body.match(/@([\w.\-]+)/g) || []).map(m => m.slice(1).toLowerCase())));
    const targets: { id: string; isReplyAuthor?: boolean }[] = team
      .filter(t => mentions.includes(t.handle.toLowerCase()) && t.id !== user?.id)
      .map(t => ({ id: t.id }));
    if (parentId) {
      const parent = notes.find(n => n.id === parentId);
      if (parent?.author_user_id && parent.author_user_id !== user?.id && !targets.some(t => t.id === parent.author_user_id)) {
        targets.push({ id: parent.author_user_id, isReplyAuthor: true });
      }
    }
    if (targets.length) {
      const link = submissionId ? `/admin?tab=submissions&submission=${submissionId}` : `/admin?tab=customers&customer=${customerId}`;
      await supabase.from("user_notifications" as any).insert(
        targets.map(t => ({
          user_id: t.id,
          title: t.isReplyAuthor ? `${myName} replied to your note` : `${myName} mentioned you in a note`,
          body: body.slice(0, 240),
          link_url: link,
          source_type: "customer_note",
          source_id: (data as any)?.id,
        }))
      );
    }
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
        {replyTo && (
          <div className="flex items-center justify-between gap-2 mb-1.5 px-2 py-1 rounded bg-muted/60 border-l-2 border-primary">
            <div className="text-[11px] text-muted-foreground truncate">
              Replying to <span className="font-medium text-foreground">{replyTo.author_name || "Unknown"}</span>: <span className="italic">{replyTo.body.slice(0, 80)}{replyTo.body.length > 80 ? "…" : ""}</span>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground shrink-0">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onBlur={() => { broadcastTyping(false); setTimeout(() => setMentionQuery(null), 150); }}
            onKeyDown={(e) => {
              if (mentionQuery !== null && filteredMentions.length > 0) {
                if (e.key === "ArrowDown") { e.preventDefault(); setMentionIdx(i => (i + 1) % filteredMentions.length); return; }
                if (e.key === "ArrowUp") { e.preventDefault(); setMentionIdx(i => (i - 1 + filteredMentions.length) % filteredMentions.length); return; }
                if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(filteredMentions[mentionIdx]); return; }
                if (e.key === "Escape") { e.preventDefault(); setMentionQuery(null); return; }
              }
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitNote(); }
            }}
            rows={2}
            placeholder={replyTo ? "Write your reply… (Enter to send, @ to mention)" : "Add a note for the team… (Enter to post, @ to mention)"}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none"
          />
          {mentionQuery !== null && filteredMentions.length > 0 && (
            <ul className="absolute left-0 bottom-full mb-1 w-56 max-h-48 overflow-auto bg-popover border border-border rounded-md shadow-lg z-50">
              {filteredMentions.map((m, i) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); insertMention(m); }}
                    className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center gap-2 ${i === mentionIdx ? "bg-primary/10 text-foreground" : "text-foreground hover:bg-muted"}`}
                  >
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white" style={{ background: colorFor(m.id) }}>
                      {m.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="font-medium">{m.name}</span>
                    <span className="text-muted-foreground">@{m.handle}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

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
            <Send className="w-3 h-3" /> {replyTo ? "Reply" : "Post"}
          </button>
        </div>
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No notes yet. Press Enter to post — your team sees it instantly.</p>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {notes.filter(n => !n.parent_note_id).map(n => {
              const replies = notes.filter(r => r.parent_note_id === n.id).sort((a, b) => a.created_at.localeCompare(b.created_at));
              const renderNote = (note: Note, isReply = false) => {
                const isMine = note.author_user_id === user?.id;
                const color = colorFor(note.author_user_id || note.author_name || "x");
                const edited = note.updated_at && note.updated_at !== note.created_at;
                return (
                  <div key={note.id} className={`rounded-lg p-3 border border-border/50 ${isReply ? "ml-6 mt-2 bg-muted/20" : "bg-muted/40"}`}>
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white shrink-0" style={{ background: color }}>
                        {(note.author_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-xs font-medium text-foreground">{note.author_name || "Unknown"}</p>
                          {(() => { const w = formatWhen(note.created_at); return (
                            <p className="text-[10px] text-muted-foreground" title={w.exact}>{w.rel} · {w.exact}{edited ? " · edited" : ""}</p>
                          ); })()}
                        </div>
                        {editingId === note.id ? (
                          <div className="mt-1.5">
                            <textarea value={editingDraft} onChange={(e) => setEditingDraft(e.target.value)} rows={2} className="w-full px-2 py-1.5 rounded-md bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                            <div className="flex justify-end gap-2 mt-1">
                              <button onClick={() => setEditingId(null)} className="text-[11px] text-muted-foreground hover:text-foreground">Cancel</button>
                              <button onClick={() => saveEdit(note.id)} className="text-[11px] font-medium text-primary hover:underline">Save</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-foreground whitespace-pre-wrap mt-0.5">{renderBody(note.body)}</p>
                        )}
                        {editingId !== note.id && (
                          <div className="flex gap-3 mt-1.5">
                            <button onClick={() => setReplyTo(note)} className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                              <Reply className="w-3 h-3" /> Reply
                            </button>
                            {isMine && (
                              <>
                                <button onClick={() => { setEditingId(note.id); setEditingDraft(note.body); }} className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                                  <Pencil className="w-3 h-3" /> Edit
                                </button>
                                <button onClick={() => deleteNote(note.id)} className="text-[10px] text-muted-foreground hover:text-destructive inline-flex items-center gap-1">
                                  <Trash2 className="w-3 h-3" /> Delete
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              };
              return (
                <motion.li key={n.id} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {renderNote(n)}
                  {replies.map(r => renderNote(r, true))}
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
