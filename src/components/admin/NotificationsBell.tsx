import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, ArrowRight, Check } from "lucide-react";

import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Notif {
  id: string;
  title: string;
  body: string | null;
  link_url: string | null;
  read_at: string | null;
  created_at: string;
}

const formatWhen = (iso: string) => {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

const NotificationsBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Notif[]>([]);
  const [pendingAck, setPendingAck] = useState<Notif[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_notifications" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!cancelled && data) {
        setNotes(data as any);
        // Queue any existing unread notifications for acknowledgment
        const unread = (data as any as Notif[]).filter(n => !n.read_at);
        if (unread.length > 0) setPendingAck(unread.slice().reverse());
      }
    })();

    const channel = supabase.channel(`notif:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` }, (p) => {
        const newNote = p.new as Notif;
        setNotes(prev => [newNote, ...prev].slice(0, 20));
        setPendingAck(prev => [...prev, newNote]);
        try { new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=").play().catch(() => {}); } catch {}
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [user]);


  const unread = notes.filter(n => !n.read_at).length;

  const markAllRead = async () => {
    if (!user || unread === 0) return;
    const ids = notes.filter(n => !n.read_at).map(n => n.id);
    setNotes(prev => prev.map(n => n.read_at ? n : { ...n, read_at: new Date().toISOString() }));
    await supabase.from("user_notifications" as any).update({ read_at: new Date().toISOString() }).in("id", ids);
  };

  if (!user) return null;

  const currentAck = pendingAck[0];

  const acknowledgeCurrent = async (opts?: { follow?: boolean }) => {
    if (!currentAck) return;
    const id = currentAck.id;
    const link = currentAck.link_url;
    setPendingAck(prev => prev.slice(1));
    setNotes(prev => prev.map(n => n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n));
    await supabase.from("user_notifications" as any).update({ read_at: new Date().toISOString() }).eq("id", id);
    if (opts?.follow && link) {
      navigate(link);
      setTimeout(() => window.dispatchEvent(new PopStateEvent("popstate")), 0);
    }
  };

  return (
    <div className="relative">

      <button
        onClick={() => { setOpen(o => !o); if (!open) markAllRead(); }}
        className="relative inline-flex items-center justify-center w-10 h-10 rounded-full border border-border text-muted-foreground hover:text-foreground"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 w-80 max-h-[60vh] overflow-auto bg-card border border-border rounded-lg shadow-lg z-50">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">Notifications</p>
              <span className="text-[10px] text-muted-foreground">{notes.length} recent</span>
            </div>
            {notes.length === 0 ? (
              <p className="text-xs text-muted-foreground italic p-4 text-center">No notifications yet.</p>
            ) : (
              <ul>
                {notes.map(n => (
                  <li key={n.id} className={`px-3 py-2.5 border-b border-border/50 hover:bg-muted/50 ${!n.read_at ? "bg-primary/5" : ""}`}>
                    <a
                      href={n.link_url || "#"}
                      onClick={(e) => {
                        e.preventDefault();
                        setOpen(false);
                        if (n.link_url) {
                          // Use SPA navigation; if already on /admin, also dispatch a popstate so Admin re-reads params
                          navigate(n.link_url);
                          setTimeout(() => window.dispatchEvent(new PopStateEvent("popstate")), 0);
                        }
                      }}
                      className="block"
                    >
                      <p className="text-xs font-medium text-foreground">{n.title}</p>
                      {n.body && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">{formatWhen(n.created_at)}</p>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
      {currentAck && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-foreground/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-card rounded-2xl shadow-[0_25px_80px_-20px_hsl(var(--foreground)/0.35)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border border-border/60">
            <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/70 to-accent" />
            <div className="px-7 pt-7 pb-2 flex items-start gap-4">
              <div className="shrink-0 w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center ring-4 ring-primary/5">
                <Bell className="w-5 h-5 text-primary" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
                  New notification{pendingAck.length > 1 ? ` · ${pendingAck.length - 1} more queued` : ""}
                </p>
                <h2 className="mt-1.5 text-xl font-serif text-foreground leading-snug">
                  {currentAck.title}
                </h2>
              </div>
            </div>
            {currentAck.body && (
              <div className="px-7 pt-3">
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {currentAck.body}
                </p>
              </div>
            )}
            <div className="px-7 pt-4 pb-6">
              <p className="text-[11px] text-muted-foreground">{formatWhen(currentAck.created_at)}</p>
            </div>
            <div className="px-7 py-4 border-t border-border/60 bg-muted/30 flex items-center justify-end gap-2.5">
              {currentAck.link_url && (
                <button
                  onClick={() => acknowledgeCurrent({ follow: true })}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-medium tracking-wide border border-border bg-background hover:bg-muted text-foreground transition-colors"
                >
                  Open & acknowledge
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => acknowledgeCurrent()}
                autoFocus
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Acknowledge
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );

};

export default NotificationsBell;
