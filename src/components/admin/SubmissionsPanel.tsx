import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, ExternalLink, CheckCircle, Trash2, ChevronRight, Inbox, FileText, Send, MessageCircleX, Layers, RefreshCw, AlertTriangle, FileSignature } from "lucide-react";
import { lookupCemeteryContact } from "@/lib/cemeteryContactLookup";
import SendQuoteDialog from "./SendQuoteDialog";
import SendBuyerQuoteDialog from "./SendBuyerQuoteDialog";
import SendDeclineDialog from "./SendDeclineDialog";
import CustomerKindBadge, { resolveKind } from "./CustomerKindBadge";
import BayerBadge from "./BayerBadge";
import CustomerJourney from "./CustomerJourney";
import BuyerJourneyPanel from "./BuyerJourneyPanel";
import BayerPipelinePanel, { deriveBayerStage, BAYER_STAGE_META, BAYER_STAGE_ORDER, type BayerStage } from "./BayerPipelinePanel";
import CemeteryMatchDialog from "./CemeteryMatchDialog";
import { useActiveListings } from "@/hooks/useActiveListings";
import { getPlotImage } from "@/lib/listingImages";
import CustomerNotes from "./CustomerNotes";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { RealtimeChannel } from "@supabase/supabase-js";
import BroadcastDialog from "./BroadcastDialog";
import AddSubmissionDialog from "./AddSubmissionDialog";
import { Megaphone, UserPlus } from "lucide-react";
import { cleanDisplayName } from "@/lib/displayName";

export interface Submission {
  id: string;
  source: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  cemetery: string | null;
  property_type: string | null;
  spaces: string | null;
  section: string | null;
  message: string | null;
  details: string | null;
  timeline: string | null;
  budget: string | null;
  region: string | null;
  handled: boolean;
  admin_notes: string | null;
  created_at: string;
  quote_amount?: number | null;
  transfer_fee_amount?: number | null;
  quote_message?: string | null;
  quote_sent_at?: string | null;
  quote_response?: string | null;
  quote_responded_at?: string | null;
  customer_kind?: string | null;
  docusign_status?: string | null;
  docusign_sent_at?: string | null;
  docusign_signed_at?: string | null;
  docusign_envelope_url?: string | null;
  documents_requested_at?: string | null;
  closed_at?: string | null;
  closed_outcome?: string | null;
  inquiry_channel?: string | null;
  handled_by_name?: string | null;
}

interface Props {
  submissions: Submission[];
  searchQuery: string;
  onUpdate: (id: string, patch: Partial<Submission>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  /** Optional: focus a specific submission (used when arriving from the Gmail inbox). */
  focusSubmissionId?: string | null;
  /** Optional: trigger a Gmail sync + reload submissions. */
  onRefresh?: () => Promise<void>;
}

const sourceLabel = (s: string | null) => {
  switch (s) {
    case "contact": return "Contact form";
    case "seller_quote": return "Seller quote";
    case "buy_property_wizard": return "Buyer wizard";
    case "manual_phone": return "Manually added";
    default: return s || "Unknown";
  }
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
};

const cemeterySearchUrl = (cemetery: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(cemetery + " Texas phone number")}`;

type StatusFilter = "all" | "new";
type KindFilter = "all" | "seller" | "buyer" | "contact";

interface ViewRow { submission_id: string; user_id: string; user_name: string | null; viewed_at: string }

const SubmissionsPanel = ({ submissions, searchQuery, onUpdate, onDelete, focusSubmissionId, onRefresh }: Props) => {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [stageFilter, setStageFilter] = useState<BayerStage | "all">("all");
  const [notesDraft, setNotesDraft] = useState("");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [buyerOpen, setBuyerOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);
  const [views, setViews] = useState<ViewRow[]>([]);
  const [activeWorkers, setActiveWorkers] = useState<Record<string, { user_id: string; user_name: string }[]>>({});
  const presenceChanRef = useRef<RealtimeChannel | null>(null);
  const [typingUsers, setTypingUsers] = useState<{ name: string; color: string }[]>([]);
  const [pendingAction, setPendingAction] = useState<null | { label: string; run: () => void }>(null);
  const typingChanRef = useRef<RealtimeChannel | null>(null);
  const { countFor } = useActiveListings();
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const myId = user?.id ?? "";
  const myName = cleanDisplayName((user?.user_metadata as any)?.full_name) || user?.email?.split("@")[0] || "Someone";

  // Stable color per viewer
  const VIEW_COLORS = ["#0ea5e9", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];
  const colorFor = (id: string) => {
    let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return VIEW_COLORS[h % VIEW_COLORS.length];
  };

  // Load all view records (admin-scope) + subscribe to live changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("submission_views" as any).select("*");
      if (!cancelled && data) setViews(data as any);
    })();
    const ch = supabase.channel("submission_views_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "submission_views" }, (payload) => {
        setViews(prev => {
          if (payload.eventType === "DELETE") return prev.filter(v => v.submission_id !== (payload.old as any).submission_id || v.user_id !== (payload.old as any).user_id);
          const row = payload.new as ViewRow;
          const filtered = prev.filter(v => !(v.submission_id === row.submission_id && v.user_id === row.user_id));
          return [...filtered, row];
        });
      })
      .subscribe();
    return () => { cancelled = true; ch.unsubscribe(); supabase.removeChannel(ch); };
  }, []);

  // Real-time "who is working on what" — broadcasts the currently-open submission
  // for every admin via Supabase Presence. Updates instantly when anyone switches.
  useEffect(() => {
    if (!myId) return;
    const ch = supabase.channel("submission_workers", {
      config: { presence: { key: myId } },
    });
    const recompute = () => {
      const state = ch.presenceState<any>();
      const map: Record<string, { user_id: string; user_name: string }[]> = {};
      Object.values(state).forEach((arr: any) => {
        arr.forEach((p: any) => {
          if (!p?.submission_id) return;
          if (!map[p.submission_id]) map[p.submission_id] = [];
          if (!map[p.submission_id].some(u => u.user_id === p.user_id)) {
            map[p.submission_id].push({ user_id: p.user_id, user_name: p.user_name || "Teammate" });
          }
        });
      });
      setActiveWorkers(map);
    };
    ch.on("presence", { event: "sync" }, recompute)
      .on("presence", { event: "join" }, recompute)
      .on("presence", { event: "leave" }, recompute)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await ch.track({ user_id: myId, user_name: myName, submission_id: null });
        }
      });
    presenceChanRef.current = ch;
    return () => { ch.unsubscribe(); supabase.removeChannel(ch); presenceChanRef.current = null; };
  }, [myId, myName]);

  const viewersFor = (sid: string) => views.filter(v => v.submission_id === sid);
  const workersFor = (sid: string) => (activeWorkers[sid] || []).filter(w => w.user_id !== myId);
  const haveIViewed = (sid: string) => !!myId && views.some(v => v.submission_id === sid && v.user_id === myId);

  const recordView = async (sid: string) => {
    if (!sid || !myId) return;
    if (haveIViewed(sid)) return;
    // optimistic
    setViews(prev => [...prev, { submission_id: sid, user_id: myId, user_name: myName, viewed_at: new Date().toISOString() }]);
    await supabase.from("submission_views" as any).upsert(
      { submission_id: sid, user_id: myId, user_name: myName, viewed_at: new Date().toISOString() },
      { onConflict: "submission_id,user_id" }
    );
  };

  // Honor an external focus request (e.g. clicking "Open customer" from the Gmail inbox).
  useEffect(() => {
    if (focusSubmissionId) {
      setSelectedId(focusSubmissionId);
      setFilter("all");
      setKindFilter("all");
      setStageFilter("all");
      const target = submissions.find(s => s.id === focusSubmissionId);
      setNotesDraft(target?.admin_notes ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSubmissionId]);

  // Bayer stages only apply to sellers; for everyone else stage filtering is a no-op.
  const isSellerView = kindFilter === "seller";

  // "new" = arrived today (since local midnight). These are the items the welcome
  // overlay calls out and that show up in notifications. Everything else is just "all".
  const startOfToday = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); }, []);
  const isNew = (s: Submission) => new Date(s.created_at).getTime() >= startOfToday;
  const isUntouched = (sid: string) => !views.some(v => v.submission_id === sid);

  const filtered = useMemo(() => {
    return submissions.filter(s => {
      if (filter === "new" && !isNew(s)) return false;
      if (kindFilter !== "all" && resolveKind(s.customer_kind, s.source) !== kindFilter) return false;
      if (isSellerView && stageFilter !== "all" && deriveBayerStage(s as any) !== stageFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return [s.name, s.email, s.phone, s.cemetery, s.message, s.details, s.source]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q));
    });
  }, [submissions, filter, kindFilter, stageFilter, isSellerView, searchQuery, startOfToday]);

  const selected = submissions.find(s => s.id === selectedId) || filtered[0] || null;
  const selectedKind = selected ? resolveKind(selected.customer_kind, selected.source) : null;
  const selectedBayerStage = selected && selectedKind === "seller" ? deriveBayerStage(selected as any) : null;

  // Record a view for this admin when they open a submission
  useEffect(() => { if (selected?.id) recordView(selected.id); }, [selected?.id, myId]);

  // Broadcast my "currently working on" submission so teammates see it instantly.
  useEffect(() => {
    const ch = presenceChanRef.current;
    if (!ch || !myId) return;
    ch.track({ user_id: myId, user_name: myName, submission_id: selected?.id || null });
  }, [selected?.id, myId, myName]);

  // Subscribe to the same notes presence channel CustomerNotes uses, so we know when
  // somebody else is actively typing a note on this submission. We don't track ourselves
  // as typing here — we only listen.
  useEffect(() => {
    if (!selected?.id) { setTypingUsers([]); return; }
    const channel = supabase.channel(`notes-watch:${selected.id}:${myId}`, {
      config: { presence: { key: `watcher-${myId}` } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<any>();
        const flat: any[] = [];
        Object.values(state).forEach((arr: any) => arr.forEach((p: any) => flat.push(p)));
        const others = flat.filter(p => p.user_id && p.user_id !== myId && p.typing);
        // de-dupe by user_id
        const seen = new Set<string>();
        const uniq: { name: string; color: string }[] = [];
        others.forEach(o => { if (!seen.has(o.user_id)) { seen.add(o.user_id); uniq.push({ name: o.name, color: o.color }); } });
        setTypingUsers(uniq);
      })
      .subscribe();
    typingChanRef.current = channel;
    return () => { channel.unsubscribe(); supabase.removeChannel(channel); typingChanRef.current = null; };
  }, [selected?.id, myId]);

  // Guarded action wrapper — if someone else is typing, intercept with a confirmation popup.
  const guard = (label: string, fn: () => void) => () => {
    if (typingUsers.length > 0) { setPendingAction({ label, run: fn }); return; }
    fn();
  };

  // Counts for the kind pills (respect status filter so the numbers reflect what you'd see).
  const kindBase = useMemo(() => submissions.filter(s => {
    if (filter === "new" && !isNew(s)) return false;
    return true;
  }), [submissions, filter, startOfToday]);
  const kindCount = (k: KindFilter) =>
    k === "all" ? kindBase.length : kindBase.filter(s => resolveKind(s.customer_kind, s.source) === k).length;

  // Stage counts (sellers only).
  const stageBase = useMemo(
    () => kindBase.filter(s => resolveKind(s.customer_kind, s.source) === "seller"),
    [kindBase],
  );
  const stageCount = (st: BayerStage | "all") =>
    st === "all" ? stageBase.length : stageBase.filter(s => deriveBayerStage(s as any) === st).length;

  // Team-wide pipeline overview — all sellers regardless of current filter.
  const sellersAll = useMemo(
    () => submissions.filter(s => resolveKind(s.customer_kind, s.source) === "seller"),
    [submissions],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* === Team pipeline overview — sellers, full team view === */}
      <PipelineOverview
        sellers={sellersAll}
        views={views}
        colorFor={colorFor}
        onSelectStage={(st) => { setKindFilter("seller"); setStageFilter(st); }}
        activeStage={kindFilter === "seller" ? stageFilter : "all"}
      />

      {/* Status pills */}
      <div className="lg:col-span-12 flex items-center gap-2 flex-wrap">
        {(["new", "all"] as const).map(f => {
          const count = f === "all"
            ? submissions.length
            : submissions.filter(s => isNew(s)).length;
          const labels = { new: "New today", all: "All" } as const;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
                filter === f ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {labels[f]} ({count})
            </button>
          );
        })}

        {/* Divider + customer-kind pills */}
        <span className="w-px h-5 bg-border mx-1" />
        {(["all", "seller", "buyer", "contact"] as const).map(k => {
          const isActive = kindFilter === k;
          const labels: Record<KindFilter, string> = { all: "All types", seller: "Sellers", buyer: "Buyers", contact: "General" };
          const activeCls: Record<KindFilter, string> = {
            all: "bg-foreground text-background border-foreground",
            seller: "bg-primary text-primary-foreground border-primary",
            buyer: "bg-emerald-600 text-white border-emerald-600",
            contact: "bg-foreground text-background border-foreground",
          };
          return (
            <button
              key={k}
              onClick={() => setKindFilter(k)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all inline-flex items-center gap-1.5 ${
                isActive ? activeCls[k] : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {k !== "all" && <CustomerKindBadge kind={k} variant="dot" />}
              {labels[k]} ({kindCount(k)})
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setAddOpen(true)}
            className="px-3 py-1.5 rounded-full text-xs font-medium border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 transition-all inline-flex items-center gap-1.5"
            title="Add a submission manually (e.g. info taken over the phone)"
          >
            <UserPlus className="w-3.5 h-3.5" /> Add submission
          </button>
          <button
            onClick={() => setBroadcastOpen(true)}
            className="px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-card text-muted-foreground hover:text-foreground transition-all inline-flex items-center gap-1.5"
            title="Send a notification to the whole team"
          >
            <Megaphone className="w-3.5 h-3.5" /> Message team
          </button>
          {onRefresh && (
            <button
              onClick={async () => {
                if (refreshing) return;
                setRefreshing(true);
                try { await onRefresh(); } finally { setRefreshing(false); }
              }}
              disabled={refreshing}
              className="px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-card text-muted-foreground hover:text-foreground transition-all inline-flex items-center gap-1.5 disabled:opacity-60"
              title="Sync Gmail and reload submissions"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh inbox"}
            </button>
          )}
        </div>
      </div>
      <BroadcastDialog open={broadcastOpen} onClose={() => setBroadcastOpen(false)} />
      <AddSubmissionDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(id) => { setSelectedId(id); onRefresh?.(); }}
      />

      {/* Pipeline stage filter intentionally removed — it duplicated the stepper inside the Bayer pipeline panel.
          Stage info is still visible per-row via the inline stage badge, and inside the detail view's pipeline panel. */}


      <div className="lg:col-span-5 bg-card rounded-xl border border-border/50 overflow-hidden max-h-[calc(100vh-120px)] min-h-[calc(100vh-180px)] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Inbox className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No submissions in this view.</p>
          </div>
        ) : (
          filtered.map((s, i) => {
            const isActive = selected?.id === s.id;
            const sKind = resolveKind(s.customer_kind, s.source);
            const bayer = sKind === "seller" ? deriveBayerStage(s as any) : null;
            const stageMeta = bayer ? BAYER_STAGE_META[bayer] : null;
            const rowViewers = viewersFor(s.id);
            const iViewed = haveIViewed(s.id);
            const otherViewers = rowViewers.filter(v => v.user_id !== myId);
            const fresh = isNew(s);
            const workers = workersFor(s.id);
            const beingWorked = workers.length > 0;
            // Background priority:
            //  • Active row (mine) → primary tint
            //  • Teammate currently working → soft terracotta/accent tint with pulse
            //  • New today → soft sky tint
            //  • Otherwise → neutral
            const bgCls = isActive
              ? "bg-primary/15 border-l-4 border-l-primary"
              : beingWorked
                ? "bg-accent/10 hover:bg-accent/15 border-l-4 border-l-accent"
                : fresh
                  ? "bg-sky-50 dark:bg-sky-950/20 hover:bg-sky-100/70 dark:hover:bg-sky-950/30 border-l-4 border-l-sky-500"
                  : "bg-card hover:bg-muted/40 border-l-4 border-l-transparent";
            return (
              <motion.button
                key={s.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.2) }}
                onClick={() => { setSelectedId(s.id); setNotesDraft(s.admin_notes || ""); recordView(s.id); }}
                className={`w-full text-left px-4 py-3 border-b border-border/40 transition-colors flex items-start gap-3 ${bgCls}`}
              >
                
                <img
                  src={getPlotImage(s.property_type || "", Number(s.spaces || 1) || 1)}
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover bg-muted/40 shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className={`text-sm truncate ${fresh ? "font-bold text-foreground" : "font-medium text-foreground"}`}>{s.name || "Anonymous"}</p>
                      {fresh && <span className="text-[9px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded-full bg-sky-500 text-white">New</span>}
                      <CustomerKindBadge kind={sKind} size="xs" />
                      <BayerBadge inquiryChannel={s.inquiry_channel} size="xs" />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {otherViewers.length > 0 && (
                        <div className="flex -space-x-1" title={`Also viewed by: ${otherViewers.map(v => v.user_name || "teammate").join(", ")}`}>
                          {otherViewers.slice(0, 3).map(v => (
                            <span
                              key={v.user_id}
                              className="w-4 h-4 rounded-full ring-1 ring-card flex items-center justify-center text-[8px] font-bold text-white"
                              style={{ background: colorFor(v.user_id) }}
                            >
                              {(v.user_name || "?").charAt(0).toUpperCase()}
                            </span>
                          ))}
                          {otherViewers.length > 3 && (
                            <span className="w-4 h-4 rounded-full ring-1 ring-card bg-muted text-muted-foreground flex items-center justify-center text-[8px] font-medium">
                              +{otherViewers.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      <span className="text-[10px] text-muted-foreground">{formatDate(s.created_at).split(",")[0]}</span>
                    </div>
                  </div>
                  {stageMeta && (
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${stageMeta.cls}`}>
                        <span className={`w-1 h-1 rounded-full ${stageMeta.dot}`} />
                        {stageMeta.short}
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground truncate">
                    <span className="text-primary/80">{sourceLabel(s.source)}</span>
                    {s.property_type ? ` · ${s.property_type}${s.spaces ? ` ×${s.spaces}` : ""}` : ""}
                    {s.cemetery ? ` · ${s.cemetery}` : ""}
                    {s.cemetery && countFor(s.cemetery) > 0 ? (
                      <span className="ml-1.5 text-[10px] text-primary font-medium">· {countFor(s.cemetery)} in stock</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground/80 truncate mt-0.5">
                    {s.message || s.details || s.email || s.phone || "—"}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-1" />
              </motion.button>
            );
          })
        )}
      </div>

      {/* Detail */}
      <div className="lg:col-span-7">
        {!selected ? (
          <div className="bg-card rounded-xl border border-border/50 p-10 text-center text-sm text-muted-foreground">
            Select a submission to view details.
          </div>
        ) : (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl border border-border/50 p-6 space-y-5"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <img
                  src={getPlotImage(selected.property_type || "", Number(selected.spaces || 1) || 1)}
                  alt=""
                  className="w-14 h-14 rounded-xl object-cover bg-muted/40 shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <CustomerKindBadge kind={resolveKind(selected.customer_kind, selected.source)} />
                    <BayerBadge inquiryChannel={selected.inquiry_channel} />
                    <p className="text-xs text-primary font-medium tracking-wide uppercase">{sourceLabel(selected.source)}</p>
                    {selected.source === "manual_phone" && (selected as any).handled_by_name && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                        <UserPlus className="w-3 h-3" /> Added by {cleanDisplayName((selected as any).handled_by_name)}
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-xl text-foreground">{selected.name || "Anonymous"}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {[selected.property_type, selected.spaces ? `${selected.spaces} space${Number(selected.spaces) > 1 ? "s" : ""}` : null]
                      .filter(Boolean).join(" · ") || "—"} · {formatDate(selected.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {selectedBayerStage && (
                  <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-medium border ${BAYER_STAGE_META[selectedBayerStage].cls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${BAYER_STAGE_META[selectedBayerStage].dot}`} />
                    {BAYER_STAGE_META[selectedBayerStage].label}
                  </span>
                )}
                {(() => {
                  const sViewers = viewersFor(selected.id);
                  return (
                    <div className="flex items-center gap-1.5">
                      {isNew(selected) && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-sky-500 text-white">New today</span>
                      )}
                      {sViewers.length > 0 && (
                        <div className="flex items-center gap-1.5" title={`Viewed by: ${sViewers.map(v => v.user_name || "teammate").join(", ")}`}>
                          <div className="flex -space-x-1">
                            {sViewers.slice(0, 4).map(v => (
                              <span key={v.user_id} className="w-5 h-5 rounded-full ring-1 ring-card flex items-center justify-center text-[9px] font-bold text-white" style={{ background: colorFor(v.user_id) }}>
                                {(v.user_name || "?").charAt(0).toUpperCase()}
                              </span>
                            ))}
                            {sViewers.length > 4 && (
                              <span className="w-5 h-5 rounded-full ring-1 ring-card bg-muted text-muted-foreground flex items-center justify-center text-[9px] font-medium">+{sViewers.length - 4}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Contact actions */}
            <div className="flex flex-wrap gap-2">
              {selected.email && (
                <a
                  href={`mailto:${selected.email}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  <Mail className="w-3.5 h-3.5" /> {selected.email}
                </a>
              )}
              {selected.phone && (
                <a
                  href={`tel:${selected.phone.replace(/[^\d+]/g, "")}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-foreground text-background rounded-full text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  <Phone className="w-3.5 h-3.5" /> {selected.phone}
                </a>
              )}
            </div>

            {/* Cemetery contact directory + inventory match */}
            {selected.cemetery && (() => {
              const count = countFor(selected.cemetery);
              const contact = lookupCemeteryContact(selected.cemetery);
              return (
                <div className="bg-muted/40 rounded-lg p-4 border border-border/50 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Cemetery</p>
                      <p className="text-sm font-medium text-foreground truncate">{selected.cemetery}</p>
                      {contact?.address && <p className="text-[11px] text-muted-foreground mt-0.5">{contact.address}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => setMatchOpen(true)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium border shrink-0 transition-all hover:opacity-90 ${
                        count > 0 ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"
                      }`}
                      title="View matched inventory and recent comps at this cemetery"
                    >
                      <Layers className="w-3 h-3" />
                      View inventory & comps
                    </button>
                  </div>

                  {contact ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {contact.salesPhone && (
                        <a href={`tel:${contact.salesPhone.replace(/[^\d+]/g, "")}`} className="flex items-start gap-2 p-2 rounded-md bg-card border border-border/50 hover:border-primary/40 transition-colors">
                          <Phone className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Sales</p>
                            <p className="text-foreground font-medium">{contact.salesPhone}</p>
                            {contact.salesHours && <p className="text-[10px] text-muted-foreground mt-0.5">{contact.salesHours}</p>}
                          </div>
                        </a>
                      )}
                      {contact.transferPhone && (
                        <a href={`tel:${contact.transferPhone.replace(/[^\d+]/g, "")}`} className="flex items-start gap-2 p-2 rounded-md bg-card border border-border/50 hover:border-primary/40 transition-colors">
                          <FileSignature className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Transfer office</p>
                            <p className="text-foreground font-medium">{contact.transferPhone}</p>
                            {contact.transferFee && <p className="text-[10px] text-muted-foreground mt-0.5">Fee: {contact.transferFee}</p>}
                          </div>
                        </a>
                      )}
                      {contact.website && (
                        <a href={`https://${contact.website.replace(/^https?:\/\//, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 p-2 rounded-md bg-card border border-border/50 hover:border-primary/40 transition-colors">
                          <ExternalLink className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Website</p>
                            <p className="text-foreground font-medium truncate">{contact.website}</p>
                          </div>
                        </a>
                      )}
                      {contact.notes && (
                        <div className="sm:col-span-2 text-[11px] text-muted-foreground p-2 rounded-md bg-card/50 border border-border/40">
                          <span className="font-medium text-foreground">Notes: </span>{contact.notes}
                        </div>
                      )}
                    </div>
                  ) : (
                    <a
                      href={cemeterySearchUrl(selected.cemetery)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" /> Not in directory — search Google for phone
                    </a>
                  )}
                </div>
              );
            })()}

            {/* Property details grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              {selected.property_type && (
                <Field label="Property type" value={selected.property_type} />
              )}
              {selected.timeline && <Field label="Timeline" value={selected.timeline} />}
              {selected.budget && <Field label="Budget" value={selected.budget} />}
              {selected.region && <Field label="Region" value={selected.region} />}
              {selected.spaces && <Field label="Spaces" value={selected.spaces} />}
              {selected.section && <Field label="Section / Lot" value={selected.section} />}
              {(selected as any).cemetery_city && <Field label="Cemetery city/state" value={(selected as any).cemetery_city} />}
              {(selected as any).deed_owner_names && <Field label="Deed owner(s)" value={(selected as any).deed_owner_names} />}
              {(selected as any).deed_owners_status && <Field label="Owner status" value={(selected as any).deed_owners_status} />}
              {(selected as any).relationship_to_owner && <Field label="Relationship to owner" value={(selected as any).relationship_to_owner} />}
              {(selected as any).purchase_info && <Field label="Purchase date / amount" value={(selected as any).purchase_info} />}
              {(selected as any).bayer_entry_id && <Field label="Bayer entry #" value={(selected as any).bayer_entry_id} />}
            </div>

            {/* Message / details */}
            {(selected.message || selected.details) && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                  {selected.message ? "Message" : "Additional details"}
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {selected.message || selected.details}
                </p>
              </div>
            )}

            {/* Collaborative team notes — Enter to post, replies threaded, realtime presence */}
            <div>
              <CustomerNotes submissionId={selected.id} customerName={selected.name} />
            </div>

            {/* Sellers: pipeline below notes, above listings/dropbox */}
            {selectedKind === "seller" && (() => {
              const dropboxStages: BayerStage[] = [
                "la_issued", "la_signed_awaiting_payment", "la_signed_paid",
                "la_confirmed_poa_issued", "awaiting_notarized_docs",
                "file_compiled", "listing_live",
              ];
              const showDropbox = selectedBayerStage ? dropboxStages.includes(selectedBayerStage) : false;
              return (
                <>
                  <BayerPipelinePanel
                    submission={selected}
                    onPatch={(patch) => onUpdate(selected.id, patch)}
                  />
                  {showDropbox && (
                    <CustomerJourney
                      submission={selected}
                      onSubmissionPatched={(patch) => onUpdate(selected.id, patch)}
                    />
                  )}
                </>
              );
            })()}

            {selectedKind === "buyer" && (
              <BuyerJourneyPanel
                submission={selected}
                onOpenSend={() => setBuyerOpen(true)}
              />
            )}

            {selectedKind !== "seller" && selectedKind !== "buyer" && (
              <CustomerJourney
                submission={selected}
                onSubmissionPatched={(patch) => onUpdate(selected.id, patch)}
              />
            )}
            {/* Typing banner — iMessage style */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-300/50 bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
                <span className="inline-flex gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-bounce" style={{ animationDelay: "120ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-bounce" style={{ animationDelay: "240ms" }} />
                </span>
                <p className="text-xs text-amber-900 dark:text-amber-200">
                  <span className="font-semibold">{typingUsers.map(t => t.name).join(", ")}</span> {typingUsers.length === 1 ? "is" : "are"} typing a note… please wait before sending.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {selected.source === "seller_quote" ? (
                  <button
                    onClick={guard("Send seller quote", () => setQuoteOpen(true))}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {selected.quote_sent_at ? "Update quote" : "Send seller quote"}
                  </button>
                ) : (
                  <button
                    onClick={guard("Send available plots", () => setBuyerOpen(true))}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send available plots
                  </button>
                )}

                <button
                  onClick={guard("Polite decline", () => setDeclineOpen(true))}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium border border-border text-foreground hover:bg-muted/50 transition-colors"
                >
                  <MessageCircleX className="w-3.5 h-3.5" />
                  Polite decline
                </button>
              </div>
              <button
                onClick={guard("Delete submission", () => onDelete(selected.id))}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-destructive hover:bg-destructive/5 rounded-full transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {selected && (
        <>
          <SendQuoteDialog
            submission={selected}
            open={quoteOpen}
            onClose={() => setQuoteOpen(false)}
            onSave={onUpdate}
          />
          <SendBuyerQuoteDialog
            submission={selected}
            open={buyerOpen}
            onClose={() => setBuyerOpen(false)}
          />
          <SendDeclineDialog
            submission={selected}
            open={declineOpen}
            onClose={() => setDeclineOpen(false)}
          />
          {selected.cemetery && (
            <CemeteryMatchDialog
              open={matchOpen}
              onClose={() => setMatchOpen(false)}
              cemetery={selected.cemetery}
              city={(selected as any).cemetery_city || selected.region}
              propertyType={selected.property_type}
              spaces={selected.spaces}
            />
          )}
        </>
      )}

      {/* "Someone is typing" confirmation gate */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPendingAction(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card rounded-xl border border-border max-w-md w-full p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-base text-foreground">Hold up — someone's still typing</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="font-medium text-foreground">{typingUsers.map(t => t.name).join(", ") || "A teammate"}</span> {typingUsers.length === 1 ? "is" : "are"} writing a note on this submission right now. You can wait for them, or proceed with <span className="font-medium text-foreground">"{pendingAction.label}"</span> anyway.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setPendingAction(null)} className="px-4 py-2 rounded-full text-xs font-medium border border-border text-foreground hover:bg-muted/50">
                Wait
              </button>
              <button
                onClick={() => { const a = pendingAction; setPendingAction(null); a.run(); }}
                className="px-4 py-2 rounded-full text-xs font-medium bg-foreground text-background hover:opacity-90"
              >
                Proceed anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-muted/40 rounded-lg px-3 py-2 border border-border/40">
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="text-sm text-foreground capitalize">{value}</p>
  </div>
);

// ===========================================================================
// PipelineOverview — full-team seller funnel that lives ABOVE the inbox.
// Shows each Bayer stage with a count + the avatars of admins actively
// working that stage (i.e. who has opened a submission currently in it).
// Click a stage to filter the inbox to sellers in that stage.
// ===========================================================================
const PipelineOverview = ({
  sellers, views, colorFor, onSelectStage, activeStage,
}: {
  sellers: Submission[];
  views: ViewRow[];
  colorFor: (id: string) => string;
  onSelectStage: (st: BayerStage | "all") => void;
  activeStage: BayerStage | "all";
}) => {
  const stages = BAYER_STAGE_ORDER;

  const byStage = stages.map(st => {
    const subs = sellers.filter(s => deriveBayerStage(s as any) === st);
    const ids = new Set(subs.map(s => s.id));
    // Distinct admins who have viewed at least one submission in this stage.
    const viewerMap = new Map<string, string>();
    views.forEach(v => { if (ids.has(v.submission_id)) viewerMap.set(v.user_id, v.user_name || "?"); });
    const viewers = Array.from(viewerMap, ([user_id, user_name]) => ({ user_id, user_name }));
    return { stage: st, count: subs.length, viewers };
  });

  const totalSellers = sellers.length;

  return (
    <section className="lg:col-span-12 bg-card rounded-xl border border-border/50 shadow-soft p-4">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <h3 className="text-base font-display text-foreground leading-tight">Seller pipeline · Team view</h3>
          <span className="text-xs text-muted-foreground ml-1">{totalSellers} active sellers</span>
        </div>
        <button
          onClick={() => onSelectStage("all")}
          className={`text-[11px] px-3 py-1 rounded-full border ${activeStage === "all" ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground border-border hover:text-foreground"}`}
        >
          All stages
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {byStage.map(({ stage, count, viewers }) => {
          const m = BAYER_STAGE_META[stage];
          const isActive = activeStage === stage;
          return (
            <button
              key={stage}
              onClick={() => onSelectStage(stage)}
              className={`text-left rounded-lg border p-2.5 transition-all hover:shadow-sm bg-card ${
                isActive
                  ? "border-primary ring-1 ring-primary/30"
                  : "border-border/60 hover:border-primary/40"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                <span className="text-[10px] font-medium text-foreground/80 truncate">{m.short}</span>
              </div>
              <div className="flex items-end justify-between gap-1">
                <span className="font-display text-2xl leading-none">{count}</span>
                {viewers.length > 0 ? (
                  <div className="flex -space-x-1" title={`Working: ${viewers.map(v => v.user_name).join(", ")}`}>
                    {viewers.slice(0, 3).map(v => (
                      <span key={v.user_id} className="w-4 h-4 rounded-full ring-1 ring-card flex items-center justify-center text-[8px] font-bold text-white" style={{ background: colorFor(v.user_id) }}>
                        {(v.user_name || "?").charAt(0).toUpperCase()}
                      </span>
                    ))}
                    {viewers.length > 3 && (
                      <span className="w-4 h-4 rounded-full ring-1 ring-card bg-muted text-muted-foreground flex items-center justify-center text-[8px] font-medium">+{viewers.length - 3}</span>
                    )}
                  </div>
                ) : count > 0 ? (
                  <span className="text-[9px] text-sky-600 dark:text-sky-400 font-medium">untouched</span>
                ) : null}
              </div>
              <p className="text-[9px] text-muted-foreground mt-1 truncate">Owner: {m.owner}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default SubmissionsPanel;
