import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, ExternalLink, CheckCircle, Trash2, ChevronRight, Inbox, FileText, Send, MessageCircleX, Layers, RefreshCw, AlertTriangle, FileSignature, Search } from "lucide-react";
import { lookupCemeteryContactMatch } from "@/lib/cemeteryContactLookup";
import SendQuoteDialog from "./SendQuoteDialog";
import SendBuyerQuoteDialog from "./SendBuyerQuoteDialog";
import SendDeclineDialog from "./SendDeclineDialog";
import CustomerKindBadge, { resolveKind } from "./CustomerKindBadge";
import BayerBadge from "./BayerBadge";
import TexasBadge from "./TexasBadge";
import CustomerJourney from "./CustomerJourney";
import EmailThread from "./EmailThread";
import BuyerJourneyPanel from "./BuyerJourneyPanel";
import BayerPipelinePanel, { deriveBayerStage, BAYER_STAGE_META, BAYER_STAGE_ORDER, type BayerStage } from "./BayerPipelinePanel";
import TexasPipelinePanel from "./TexasPipelinePanel";
import TexasCemeteriesPanel from "./TexasCemeteriesPanel";
import CemeteryMatchDialog from "./CemeteryMatchDialog";
import { useActiveListings } from "@/hooks/useActiveListings";
import { getPlotImage } from "@/lib/listingImages";
import CustomerNotes from "./CustomerNotes";
import CustomerFiles from "./CustomerFiles";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { RealtimeChannel } from "@supabase/supabase-js";
import BroadcastDialog from "./BroadcastDialog";
import AddSubmissionDialog from "./AddSubmissionDialog";
import { Megaphone, UserPlus } from "lucide-react";
import { cleanDisplayName } from "@/lib/displayName";
import { useIsMobile } from "@/hooks/use-mobile";
import { bayCemeteries } from "@/data/cemeteries";
import { isOutgoing } from "@/lib/emailReply";

// Canonicalized set of known Texas cemetery names (registry lives in src/data/cemeteries.ts).
const _canon = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const TX_CEMETERY_NAMES = new Set(bayCemeteries.map(c => _canon(c.name)));
const TX_CITIES = new Set(bayCemeteries.map(c => _canon(c.city)));

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
  /** Soft-deleted submissions available for restore via the Trash dialog. */
  deletedSubmissions?: any[];
  /** Restore a soft-deleted submission by id. */
  onRestore?: (id: string) => Promise<void>;
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

type StatusFilter = "all" | "new" | "awaiting_reply";
type KindFilter = "all" | "seller" | "buyer" | "contact";
type RegionFilter = "all" | "texas" | "bayer";
type DocsFilter = "all" | "with" | "without";


// Strict tag-based classification, matching the visible badges (BayerBadge / TexasBadge).
// A submission is Bayer iff its visible badge is Bayer (inquiry_channel === "bayer_sell_a_plot").
// Everything else lands in Texas — that mirrors what the user sees as the "Texas" tag.
const subRegion = (s: Submission): "texas" | "bayer" => {
  if ((s as any).inquiry_channel === "bayer_sell_a_plot") return "bayer";
  return "texas";
};

interface ViewRow { submission_id: string; user_id: string; user_name: string | null; viewed_at: string }

const SubmissionsPanel = ({ submissions, searchQuery, onUpdate, onDelete, focusSubmissionId, onRefresh, deletedSubmissions = [], onRestore }: Props) => {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [stageFilter, setStageFilter] = useState<BayerStage | "all">("all");
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("all");
  const [notesDraft, setNotesDraft] = useState("");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [buyerOpen, setBuyerOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);
  const [views, setViews] = useState<ViewRow[]>([]);
  // Map of submission_id -> latest incoming email received_at (ISO) when the latest
  // message in the thread is from the customer (i.e. we haven't replied yet).
  const [awaitingMap, setAwaitingMap] = useState<Record<string, string>>({});
  const [activeWorkers, setActiveWorkers] = useState<Record<string, { user_id: string; user_name: string }[]>>({});
  const presenceChanRef = useRef<RealtimeChannel | null>(null);
  const [typingUsers, setTypingUsers] = useState<{ name: string; color: string }[]>([]);
  const [pendingAction, setPendingAction] = useState<null | { label: string; run: () => void }>(null);
  const typingChanRef = useRef<RealtimeChannel | null>(null);
  const { countFor } = useActiveListings();
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const isMobile = useIsMobile();
  const [pipelineOpenMobile, setPipelineOpenMobile] = useState(false);
  // Texas-only: filter the list to a single cemetery (canonical key set from the directory panel).
  const [cemeteryCanon, setCemeteryCanon] = useState<string | null>(null);
  const [cemeteryLabel, setCemeteryLabel] = useState<string | null>(null);
  // Texas-only: set of customer email addresses (lower-case) that have at least one uploaded file.
  const [docsEmails, setDocsEmails] = useState<Set<string>>(new Set());
  const [docsFilter, setDocsFilter] = useState<DocsFilter>("all");
  // Soft-delete UX: a deliberate confirmation dialog + a "Recently deleted" panel for restore.
  const [confirmDeleteFor, setConfirmDeleteFor] = useState<Submission | null>(null);
  const [deleteText, setDeleteText] = useState("");
  const [trashOpen, setTrashOpen] = useState(false);




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

  // Build the "awaiting reply" map. Texas submissions ONLY (Bayer pipeline never
  // gets this tag). For each Texas submission we gather every email connected to
  // that customer — either matched_submission_id == s.id OR the customer's email
  // address appears in from_email / to_email. We pick the latest message in that
  // combined thread; if it's from the customer (not from one of our addresses),
  // the submission is awaiting our reply.
  useEffect(() => {
    const texasSubs = submissions.filter(s => subRegion(s) === "texas");
    if (texasSubs.length === 0) { setAwaitingMap({}); return; }
    const texasIds = texasSubs.map(s => s.id);
    // Lower-case address index for matching
    const emailToSub = new Map<string, string>();
    for (const s of texasSubs) {
      if (s.email) emailToSub.set(s.email.trim().toLowerCase(), s.id);
    }
    let cancelled = false;
    const extractAddr = (raw: string | null | undefined): string => {
      if (!raw) return "";
      // from_email/to_email may be "Name <a@b.com>" or comma-separated addresses
      const out: string[] = [];
      const parts = raw.split(",");
      for (const p of parts) {
        const m = p.match(/<([^>]+)>/);
        out.push((m ? m[1] : p).trim().toLowerCase());
      }
      return out.join(",");
    };
    const recompute = async () => {
      // Pull recent messages (most projects have a few thousand at most).
      // Ordered desc so the first hit per submission is the latest message.
      const { data } = await supabase
        .from("email_messages" as any)
        .select("matched_submission_id, from_email, to_email, received_at")
        .order("received_at", { ascending: false })
        .limit(5000);
      if (cancelled || !data) return;
      // For each submission, find its latest related message.
      const latestPerSub = new Map<string, { received_at: string; outgoing: boolean }>();
      for (const row of data as any[]) {
        const fromAddr = extractAddr(row.from_email);
        const toAddrs = extractAddr(row.to_email);
        // Direct match via matched_submission_id (must be a Texas sub).
        const candidateIds = new Set<string>();
        if (row.matched_submission_id && texasIds.includes(row.matched_submission_id)) {
          candidateIds.add(row.matched_submission_id);
        }
        // Address match — incoming (customer -> us) or outgoing (us -> customer).
        for (const [addr, sid] of emailToSub.entries()) {
          if (fromAddr.includes(addr) || toAddrs.includes(addr)) candidateIds.add(sid);
        }
        for (const sid of candidateIds) {
          if (latestPerSub.has(sid)) continue; // already have a newer message
          latestPerSub.set(sid, { received_at: row.received_at, outgoing: isOutgoing(row.from_email) });
        }
      }
      const next: Record<string, string> = {};
      for (const [sid, info] of latestPerSub.entries()) {
        if (!info.outgoing) next[sid] = info.received_at;
      }
      // Also flag Texas submissions where we've never sent any email at all
      // (form came in, no outgoing reply yet) — use their created_at as the
      // "waiting since" timestamp so they sort alongside customer replies.
      for (const s of texasSubs) {
        if (next[s.id]) continue;
        const info = latestPerSub.get(s.id);
        if (!info) {
          // No matched messages at all → definitely awaiting a first reply.
          next[s.id] = s.created_at;
        }
        // If info exists and is outgoing, we've already replied — skip.
      }
      setAwaitingMap(next);
    };
    recompute();
    const ch = supabase.channel("email_messages_awaiting")
      .on("postgres_changes", { event: "*", schema: "public", table: "email_messages" }, () => { recompute(); })
      .subscribe();
    return () => { cancelled = true; ch.unsubscribe(); supabase.removeChannel(ch); };
  }, [submissions]);

  // Texas-only: build a set of customer emails that have uploaded files (customer_files
  // joined through customer_profiles by primary/alt email). Used to group the list by
  // "documents received" vs "awaiting documents".
  useEffect(() => {
    const texasEmails = submissions
      .filter(s => subRegion(s) === "texas")
      .map(s => (s.email || "").trim().toLowerCase())
      .filter(Boolean);
    if (texasEmails.length === 0) { setDocsEmails(new Set()); return; }
    let cancelled = false;
    const load = async () => {
      // Get customer profiles whose primary_email matches any texas submission email.
      const { data: profiles } = await supabase
        .from("customer_profiles" as any)
        .select("id, primary_email, alt_emails");
      if (cancelled || !profiles) return;
      const profileIds: string[] = [];
      const idToEmails = new Map<string, string[]>();
      for (const p of profiles as any[]) {
        const emails: string[] = [];
        if (p.primary_email) emails.push(String(p.primary_email).toLowerCase());
        if (Array.isArray(p.alt_emails)) emails.push(...p.alt_emails.map((e: string) => String(e).toLowerCase()));
        if (emails.some(e => texasEmails.includes(e))) {
          profileIds.push(p.id);
          idToEmails.set(p.id, emails);
        }
      }
      if (profileIds.length === 0) { setDocsEmails(new Set()); return; }
      const { data: files } = await supabase
        .from("customer_files" as any)
        .select("customer_profile_id")
        .in("customer_profile_id", profileIds);
      if (cancelled || !files) return;
      const withFiles = new Set<string>();
      for (const f of files as any[]) {
        const ems = idToEmails.get(f.customer_profile_id) || [];
        ems.forEach(e => withFiles.add(e));
      }
      setDocsEmails(withFiles);
    };
    load();
    const ch = supabase.channel("customer_files_for_texas")
      .on("postgres_changes", { event: "*", schema: "public", table: "customer_files" }, () => { load(); })
      .subscribe();
    return () => { cancelled = true; ch.unsubscribe(); supabase.removeChannel(ch); };
  }, [submissions]);

  const hasDocs = (s: Submission) => {
    const e = (s.email || "").trim().toLowerCase();
    return !!e && docsEmails.has(e);
  };




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

  // On mobile, ignore filters — always show "all" with no kind/stage scoping so the
  // toolbar can stay minimal (just Refresh inbox).
  const eFilter = isMobile ? "all" : filter;
  const eKind = isMobile ? "all" : kindFilter;
  const eStage = isMobile ? "all" : stageFilter;
  const eSellerView = !isMobile && isSellerView;
  const filtered = useMemo(() => {
    const matches = submissions.filter(s => {
      if (regionFilter !== "all" && subRegion(s) !== regionFilter) return false;
      if (regionFilter === "texas" && cemeteryCanon) {
        const sc = _canon(s.cemetery || "");
        if (!sc) return false;
        const STOP = new Set(["the","of","and","memorial","park","cemetery","mortuary","mausoleum","association","assoc","garden","gardens","lawn","at","in"]);
        const qTokens = cemeteryCanon.split(" ").filter(t => t && !STOP.has(t));
        const sTokens = new Set(sc.split(" ").filter(t => t && !STOP.has(t)));
        const substringHit = sc.includes(cemeteryCanon) || cemeteryCanon.includes(sc);
        const tokenHit = qTokens.length > 0 && qTokens.some(t => sTokens.has(t));
        if (!substringHit && !tokenHit) return false;
      }
      if (regionFilter === "texas" && docsFilter !== "all") {
        const has = hasDocs(s);
        if (docsFilter === "with" && !has) return false;
        if (docsFilter === "without" && has) return false;
      }

      if (eFilter === "new" && !isNew(s)) return false;
      if (eFilter === "awaiting_reply" && !awaitingMap[s.id]) return false;
      if (eKind !== "all" && resolveKind(s.customer_kind, s.source) !== eKind) return false;
      if (eSellerView && eStage !== "all" && deriveBayerStage(s as any) !== eStage) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return [s.name, s.email, s.phone, s.cemetery, s.message, s.details, s.source]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q));
    });
    // Pin awaiting-reply submissions to the top (most recent incoming first).
    // Everything else keeps its incoming order (already sorted by created_at desc upstream).
    const awaitingRows = matches.filter(s => awaitingMap[s.id]).sort((a, b) =>
      (awaitingMap[b.id] || "").localeCompare(awaitingMap[a.id] || "")
    );
    const otherRows = matches.filter(s => !awaitingMap[s.id]);
    return [...awaitingRows, ...otherRows];
  }, [submissions, regionFilter, cemeteryCanon, docsFilter, docsEmails, eFilter, eKind, eStage, eSellerView, searchQuery, startOfToday, awaitingMap]);


  const texasSubmissions = useMemo(() => submissions.filter(s => subRegion(s) === "texas"), [submissions]);

  // Texas-only: count submissions per canonical cemetery name for the "N other submissions" chip.
  const texasCemeteryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of texasSubmissions) {
      const k = _canon(s.cemetery || "");
      if (!k) continue;
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }, [texasSubmissions]);

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
      {/* === Region tabs: Texas vs Bayer pipelines === */}
      <div className="lg:col-span-12 flex items-center gap-2 flex-wrap">
        {(["all", "texas", "bayer"] as const).map(r => {
          const count = r === "all"
            ? submissions.length
            : submissions.filter(s => subRegion(s) === r).length;
          const active = regionFilter === r;
          const label = r === "all" ? "All inquiries" : r === "texas" ? "Texas pipeline" : "Bayer pipeline";
          return (
            <button
              key={r}
              onClick={() => { setRegionFilter(r); setSelectedId(null); setKindFilter("all"); setStageFilter("all"); setCemeteryCanon(null); setCemeteryLabel(null); setDocsFilter("all"); }}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                active
                  ? r === "texas"
                    ? "bg-amber-600 text-white border-amber-600"
                    : r === "bayer"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-foreground text-background border-foreground"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {label} <span className="opacity-70 font-normal">({count})</span>
            </button>
          );
        })}
      </div>

      {/* === Texas cemetery directory (texas tab only) === */}
      {regionFilter === "texas" && !isMobile && (
        <div className="lg:col-span-12">
          <TexasCemeteriesPanel
            texasSubmissions={texasSubmissions}
            activeCemeteryCanon={cemeteryCanon}
            onSelectCemetery={(canon, label) => {
              setCemeteryCanon(canon);
              setCemeteryLabel(label);
              setSelectedId(null);
            }}
            onRefresh={onRefresh}
          />

        </div>
      )}


      {/* === Team pipeline overview — sellers (Bayer only, desktop) === */}
      {!isMobile && regionFilter === "bayer" && (
        <PipelineOverview
          sellers={sellersAll.filter(s => subRegion(s) === "bayer")}
          views={views}
          colorFor={colorFor}
          onSelectStage={(st) => { setKindFilter("seller"); setStageFilter(st); }}
          activeStage={kindFilter === "seller" ? stageFilter : "all"}
        />
      )}

      {/* Mobile: refresh lives in the admin header to save space */}

      {/* Status pills (desktop only) */}
      {!isMobile && (
      <div data-tour="filters" className="lg:col-span-12 flex items-center gap-2 flex-wrap">
        {(["awaiting_reply", "new", "all"] as const).map(f => {
          const count = f === "all"
            ? submissions.length
            : f === "new"
              ? submissions.filter(s => isNew(s)).length
              : submissions.filter(s => awaitingMap[s.id]).length;
          const labels = { new: "New today", all: "All", awaiting_reply: "Needs reply" } as const;
          const activeCls = f === "awaiting_reply"
            ? "bg-rose-600 text-white border-rose-600"
            : "bg-foreground text-background border-foreground";
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
                filter === f ? activeCls : "bg-card text-muted-foreground border-border hover:text-foreground"
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
            data-tour="add-submission"
            onClick={() => setAddOpen(true)}
            className="px-3 py-1.5 rounded-full text-xs font-medium border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 transition-all inline-flex items-center gap-1.5"
            title="Add a submission manually (e.g. info taken over the phone)"
          >
            <UserPlus className="w-3.5 h-3.5" /> Add submission
          </button>
          <button
            data-tour="message-team"
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
          <button
            onClick={() => setTrashOpen(true)}
            className="px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-card text-muted-foreground hover:text-foreground transition-all inline-flex items-center gap-1.5"
            title="View and restore recently deleted submissions"
          >
            <Trash2 className="w-3.5 h-3.5" /> Recently deleted
            {deletedSubmissions.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-foreground font-semibold">
                {deletedSubmissions.length}
              </span>
            )}
          </button>

        </div>
      </div>
      )}
      <BroadcastDialog open={broadcastOpen} onClose={() => setBroadcastOpen(false)} />
      <AddSubmissionDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(id) => { setSelectedId(id); onRefresh?.(); }}
      />

      {/* Pipeline stage filter intentionally removed — it duplicated the stepper inside the Bayer pipeline panel.
          Stage info is still visible per-row via the inline stage badge, and inside the detail view's pipeline panel. */}


      <div data-tour="submissions-list" className={`lg:col-span-5 bg-card rounded-xl border border-border/50 overflow-hidden ${isMobile ? "" : "max-h-[calc(100vh-120px)] min-h-[calc(100vh-180px)] overflow-y-auto"} lg:order-none`}>
        {regionFilter === "texas" && (
          <div className="flex items-center gap-1.5 flex-wrap px-3 py-2 border-b border-border/50 bg-muted/30">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mr-1">Attachments:</span>
            {(["all", "with", "without"] as const).map(f => {
              const labels = { all: "All", with: "With attachments", without: "Without attachments" } as const;
              const counts = {
                all: regionFilter === "texas" ? submissions.filter(s => subRegion(s) === "texas").length : 0,
                with: submissions.filter(s => subRegion(s) === "texas" && hasDocs(s)).length,
                without: submissions.filter(s => subRegion(s) === "texas" && !hasDocs(s)).length,
              };
              const isActive = docsFilter === f;
              return (
                <button
                  key={f}
                  onClick={() => setDocsFilter(f)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                    isActive
                      ? f === "with"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : f === "without"
                          ? "bg-amber-600 text-white border-amber-600"
                          : "bg-foreground text-background border-foreground"
                      : "bg-card text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {labels[f]} ({counts[f]})
                </button>
              );
            })}
          </div>
        )}
        {regionFilter === "texas" && cemeteryLabel && (
          <div className="flex items-center justify-between gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-500/30 text-xs">
            <span className="text-amber-900 dark:text-amber-100">
              Showing submissions for <span className="font-semibold">{cemeteryLabel}</span> ({filtered.length})
            </span>
            <button
              onClick={() => { setCemeteryCanon(null); setCemeteryLabel(null); }}
              className="text-amber-700 hover:text-amber-900 font-medium underline-offset-2 hover:underline"
            >
              Clear filter
            </button>
          </div>
        )}

        {(() => {
          const renderRow = (s: Submission, i: number) => {
            const isActive = selected?.id === s.id;
            const sKind = resolveKind(s.customer_kind, s.source);
            const bayer = sKind === "seller" ? deriveBayerStage(s as any) : null;
            // Hide the "Inquiry" badge — it's the default stage for every new seller, so it's noise.
            const stageMeta = bayer && bayer !== "initial_inquiry" ? BAYER_STAGE_META[bayer] : null;
            const rowViewers = viewersFor(s.id);
            const otherViewers = rowViewers.filter(v => v.user_id !== myId);
            const fresh = isNew(s);
            const workers = workersFor(s.id);
            const beingWorked = workers.length > 0;
            const bgCls = isActive
              ? "bg-primary/15 border-l-4 border-l-primary"
              : beingWorked
                ? "bg-accent/10 hover:bg-accent/15 border-l-4 border-l-accent"
                : fresh
                  ? "bg-sky-50 dark:bg-sky-950/20 hover:bg-sky-100/70 dark:hover:bg-sky-950/30 border-l-4 border-l-sky-500"
                  : "bg-card hover:bg-muted/40 border-l-4 border-l-transparent";
            return (
              <div key={s.id}>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.2) }}
                  onClick={() => {
                    if (isMobile && isActive) { setSelectedId(null); return; }
                    setSelectedId(s.id); setNotesDraft(s.admin_notes || ""); recordView(s.id);
                  }}
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
                        {beingWorked && (
                          <span
                            className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30"
                            title={`${workers.map(w => w.user_name).join(", ")} viewing now`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                            {workers[0].user_name}{workers.length > 1 ? ` +${workers.length - 1}` : ""}
                          </span>
                        )}
                        {sKind !== "seller" && <CustomerKindBadge kind={sKind} size="xs" />}
                        <BayerBadge inquiryChannel={s.inquiry_channel} size="xs" />
                        <TexasBadge inquiryChannel={s.inquiry_channel} state={(s as any).state} source={s.source} sourceEmailId={(s as any).source_email_id} size="xs" />
                        {awaitingMap[s.id] && (
                          <span
                            className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded-full bg-rose-600 text-white"
                            title={`Customer replied ${new Date(awaitingMap[s.id]).toLocaleString()} — no response sent yet`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            Needs reply
                          </span>
                        )}
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
                    {(s as any).cemetery_original && (s as any).cemetery_original !== s.cemetery && (
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 italic truncate mt-0.5" title={`Customer originally wrote: "${(s as any).cemetery_original}"`}>
                        ✎ originally: "{(s as any).cemetery_original}"
                      </p>
                    )}
                    {!isActive && (
                      <p className="text-xs text-muted-foreground/80 truncate mt-0.5">
                        {s.message || s.details || s.email || s.phone || "—"}
                      </p>
                    )}
                  </div>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground/40 shrink-0 mt-1 transition-transform ${isMobile && isActive ? "rotate-90" : ""}`} />
                </motion.button>

                {isMobile && isActive && (
                  <MobileInlineDetail submission={s} />
                )}
              </div>
            );
          };

          if (filtered.length === 0) {
            return (
              <div className="p-10 text-center">
                <Inbox className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No submissions in this view.</p>
              </div>
            );
          }

          return <>{filtered.map((s, i) => renderRow(s, i))}</>;

        })()}
      </div>



      {/* Detail (desktop) — on mobile, the detail is rendered inline beneath the row */}
      <div data-tour="detail-panel" className={`lg:col-span-7 lg:order-none ${isMobile ? "hidden" : ""}`}>
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
                    <TexasBadge inquiryChannel={selected.inquiry_channel} state={(selected as any).state} source={selected.source} sourceEmailId={(selected as any).source_email_id} />
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

            {/* Texas pipeline — pinned to the TOP of the detail view for Texas submissions */}
            {subRegion(selected) === "texas" && !isMobile && (
              <TexasPipelinePanel
                submission={selected}
                onPatch={(patch) => onUpdate(selected.id, patch)}
              />
            )}

            {/* Email chain — Texas submissions (Bayer shows it inside CustomerJourney) */}
            {subRegion(selected) === "texas" && (
              <EmailThread submissionId={selected.id} customerEmail={selected.email} />
            )}

            {/* Contact actions */}
            <div className="flex flex-wrap gap-2">
              {selected.email && (
                <a
                  href={buildGmailComposeUrl({ to: selected.email })}
                  target="_blank"
                  rel="noopener noreferrer"
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

            {/* Texas submissions: just show what the customer wrote — no CA contact directory */}
            {selected.cemetery && (((selected as any).inquiry_channel === "texas_buy_wizard") || (selected as any).state === "TX") && (() => {
              const selCanon = _canon(selected.cemetery || "");
              return (
              <div className="bg-muted/40 rounded-lg p-4 border border-border/50">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Cemetery</p>
                <p className="text-sm font-medium text-foreground break-words">{selected.cemetery}</p>
                {(selected as any).cemetery_original && (selected as any).cemetery_original !== selected.cemetery && (
                  <div className="mt-2 pt-2 border-t border-border/40">
                    <p className="text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-1">
                      Originally written by customer
                    </p>
                    <p className="text-xs text-foreground break-words italic">"{(selected as any).cemetery_original}"</p>
                    {Array.isArray((selected as any).cemetery_merge_history) && (selected as any).cemetery_merge_history.length > 0 && (
                      <details className="mt-1.5">
                        <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
                          Merge history ({(selected as any).cemetery_merge_history.length})
                        </summary>
                        <ul className="mt-1 space-y-0.5 text-[10px] text-muted-foreground pl-2">
                          {(selected as any).cemetery_merge_history.map((h: any, i: number) => (
                            <li key={i}>
                              {new Date(h.at).toLocaleDateString()}: "{h.from}" → "{h.to}"
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}
                {selected.region && (
                  <p className="text-[11px] text-muted-foreground mt-2">Region: {selected.region}</p>
                )}
                {selCanon && (
                  <button
                    onClick={() => {
                      setRegionFilter("texas");
                      setCemeteryCanon(selCanon);
                      setCemeteryLabel(selected.cemetery);
                      setSelectedId(null);
                      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                    title="Search Texas submissions for this cemetery (fuzzy match, handles spelling variations)"
                  >
                    <Search className="w-3.5 h-3.5" /> Search submissions at this cemetery
                  </button>
                )}
              </div>
              );
            })()}

            {/* Cemetery contact directory + inventory match — CA submissions only */}
            {selected.cemetery && !(((selected as any).inquiry_channel === "texas_buy_wizard") || (selected as any).state === "TX") && (() => {
              const count = countFor(selected.cemetery);
              const match = lookupCemeteryContactMatch(selected.cemetery);
              const contact = match?.contact ?? null;
              const uncertain = match?.uncertain ?? false;
              return (
                <div data-tour="cemetery-box" className="bg-muted/40 rounded-lg p-4 border border-border/50 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Cemetery (as written by customer)</p>
                      <p className="text-sm font-medium text-foreground break-words">{selected.cemetery}</p>
                      {contact && (
                        <p className={`text-[11px] mt-1 ${uncertain ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                          {uncertain ? "⚠ Best guess match — please verify: " : "Matched directory entry: "}
                          <span className="font-medium text-foreground">{contact.name}</span>
                        </p>
                      )}
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
              {(selected as any).prepaid_endowment_info && <Field label="Prepaid endowment / fees" value={(selected as any).prepaid_endowment_info} />}
              {(selected as any).bayer_entry_id && <Field label="Bayer entry #" value={(selected as any).bayer_entry_id} />}
            </div>

            {/* Files the seller uploaded with the form */}
            {Array.isArray((selected as any).seller_attachments) && (selected as any).seller_attachments.length > 0 && (
              <SellerAttachmentsBlock files={(selected as any).seller_attachments} />
            )}



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

            {/* Mobile keeps it lean — view-only. Notes, pipelines, reply/action buttons and files
                are hidden on mobile since admin work is done from desktop. */}
            {!isMobile && (
              <>
                {/* Collaborative team notes — Enter to post, replies threaded, realtime presence */}
                <div data-tour="notes-section">
                  <CustomerNotes submissionId={selected.id} customerName={selected.name} />
                </div>

                {/* Texas pipeline now lives at the top of the detail view — no duplicate here. */}


                {/* Sellers (Bayer): pipeline below notes, above listings/dropbox */}
                {subRegion(selected) === "bayer" && selectedKind === "seller" && (() => {
                  const dropboxStages: BayerStage[] = [
                    "la_issued", "la_signed_awaiting_payment", "la_signed_paid",
                    "la_confirmed_poa_issued", "awaiting_notarized_docs",
                    "file_compiled", "listing_live",
                  ];
                  const showDropbox = selectedBayerStage ? dropboxStages.includes(selectedBayerStage) : false;
                  return (
                    <div data-tour="seller-pipeline">
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
                    </div>
                  );
                })()}

                {subRegion(selected) === "bayer" && selectedKind === "buyer" && (
                  <div data-tour="buyer-pipeline">
                    <BuyerJourneyPanel
                      submission={selected}
                      onOpenSend={() => setBuyerOpen(true)}
                    />
                  </div>
                )}

                {subRegion(selected) === "bayer" && selectedKind !== "seller" && selectedKind !== "buyer" && (
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

                {/* Actions — sellers: only show quote/decline before/at the quote stages.
                    Once they've accepted (or moved into L.A. flow), the pipeline owns those buttons. */}
                {(() => {
                  const sellerEarlyStages: BayerStage[] = ["initial_inquiry", "quote_issued", "quote_morgued"];
                  const sellerCanQuote = selectedKind === "seller" && (!selectedBayerStage || sellerEarlyStages.includes(selectedBayerStage));
                  const showQuoteBtn = selectedKind !== "seller" || sellerCanQuote;
                  const showDeclineBtn = selectedKind !== "seller" || sellerCanQuote;
                  return (
                    <div data-tour="actions-bar" className="flex items-center justify-between pt-2 border-t border-border/50 flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {showQuoteBtn && (selectedKind === "seller" ? (
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
                        ))}

                        {showDeclineBtn && (
                          <button
                            onClick={guard("Polite decline", () => setDeclineOpen(true))}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium border border-border text-foreground hover:bg-muted/50 transition-colors"
                          >
                            <MessageCircleX className="w-3.5 h-3.5" />
                            Polite decline
                          </button>
                        )}

                        {selectedKind === "seller" && !sellerCanQuote && (
                          <span className="text-[11px] text-muted-foreground italic">
                            Seller is past the quote stage — use the pipeline above to advance.
                          </span>
                        )}
                      </div>
                      <button
                        onClick={guard("Delete submission", () => { setConfirmDeleteFor(selected); setDeleteText(""); })}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-destructive hover:bg-destructive/5 rounded-full transition-colors"
                        title="Move to trash — you can restore it later from Recently deleted"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>

                    </div>
                  );
                })()}

                {/* Per-customer files (PoA, deeds, IDs, etc.) — at very bottom of detail view, below pipeline + actions. */}
                {(selected as any).customer_profile_id ? (
                  <div data-tour="files-section" className="border-t border-border/40 pt-4">
                    <CustomerFiles
                      customerId={(selected as any).customer_profile_id}
                      customerName={selected.name}
                    />
                  </div>
                ) : (
                  <div className="border-t border-border/40 pt-4">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Files & documents</p>
                    <p className="text-xs text-muted-foreground">
                      This submission isn't linked to a customer profile yet. Files attach to a customer profile so they appear across all of their submissions.
                    </p>
                  </div>
                )}
              </>
            )}
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

      {/* Delete confirmation — soft-delete only. Requires typing "DELETE" so it can't
          happen by accident; the submission goes to trash and can be restored. */}
      {confirmDeleteFor && (() => {
        const target = confirmDeleteFor;
        const expected = "DELETE";
        const ready = deleteText.trim().toUpperCase() === expected;
        return (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setConfirmDeleteFor(null)}>
            <div onClick={e => e.stopPropagation()} className="bg-card rounded-xl border border-border shadow-xl max-w-md w-full p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-foreground">Move submission to trash?</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <span className="font-medium text-foreground">{target.name || "Anonymous"}</span>
                    {target.email ? ` · ${target.email}` : ""}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                This won't permanently delete anything — the submission moves to "Recently deleted" and any teammate can restore it. To confirm, type <span className="font-mono font-semibold text-foreground">DELETE</span> below.
              </p>
              <input
                autoFocus
                value={deleteText}
                onChange={e => setDeleteText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setConfirmDeleteFor(null); setDeleteText(""); }}
                  className="px-4 py-2 rounded-full text-xs font-medium border border-border text-foreground hover:bg-muted/50"
                >
                  Cancel
                </button>
                <button
                  disabled={!ready}
                  onClick={async () => {
                    const id = target.id;
                    setConfirmDeleteFor(null);
                    setDeleteText("");
                    await onDelete(id);
                  }}
                  className="px-4 py-2 rounded-full text-xs font-semibold bg-destructive text-destructive-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Move to trash
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Recently deleted — list of soft-deleted submissions with one-click restore. */}
      {trashOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setTrashOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-card rounded-xl border border-border shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Recently deleted submissions</h3>
                <span className="text-[11px] text-muted-foreground">({deletedSubmissions.length})</span>
              </div>
              <button onClick={() => setTrashOpen(false)} className="p-1 rounded-full hover:bg-muted/50">
                <MessageCircleX className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {deletedSubmissions.length === 0 ? (
                <div className="p-10 text-center">
                  <Trash2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nothing in the trash.</p>
                </div>
              ) : (
                deletedSubmissions.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/40 hover:bg-muted/30">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{d.name || "Anonymous"}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {sourceLabel(d.source)}
                        {d.cemetery ? ` · ${d.cemetery}` : ""}
                        {d.email ? ` · ${d.email}` : ""}
                      </p>
                      <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                        Deleted {d.deleted_at ? new Date(d.deleted_at).toLocaleString() : "—"}
                        {d.deleted_by ? ` by ${d.deleted_by}` : ""}
                      </p>
                    </div>
                    {onRestore && (
                      <button
                        onClick={async () => { await onRestore(d.id); }}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Restore
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="p-3 border-t border-border/50 text-[11px] text-muted-foreground text-center">
              Restored submissions reappear at the top of the list immediately.
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
// MobileInlineDetail — compact, read-only detail card shown directly beneath
// the tapped submission row on mobile. No actions, no pipeline — just the info
// needed to glance at what the person said.
// ===========================================================================
const MobileInlineDetail = ({ submission: s }: { submission: Submission }) => {
  const body = s.message || s.details || "";
  return (
    <div className="bg-muted/30 border-b border-border/40 px-4 py-4 space-y-3">
      {(s.email || s.phone) && (
        <div className="flex flex-wrap gap-2">
          {s.email && (
            <a
              href={buildGmailComposeUrl({ to: s.email })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-medium hover:opacity-90 transition-opacity break-all"
            >
              <Mail className="w-3.5 h-3.5 shrink-0" /> {s.email}
            </a>
          )}
          {s.phone && (
            <a
              href={`tel:${s.phone.replace(/[^\d+]/g, "")}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-foreground text-background rounded-full text-xs font-medium hover:opacity-90 transition-opacity"
            >
              <Phone className="w-3.5 h-3.5" /> {s.phone}
            </a>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {s.cemetery && <Field label="Cemetery" value={s.cemetery} />}
        {s.property_type && <Field label="Property" value={s.property_type} />}
        {s.spaces && <Field label="Spaces" value={String(s.spaces)} />}
        {s.section && <Field label="Section" value={s.section} />}
        {s.budget && <Field label="Budget" value={s.budget} />}
        {s.timeline && <Field label="Timeline" value={s.timeline} />}
        {s.region && <Field label="Region" value={s.region} />}
      </div>

      {body && (
        <div className="bg-card rounded-lg p-3 border border-border/50">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Message</p>
          <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">{body}</p>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">Received {formatDate(s.created_at)}</p>

      {/* Collaborative team notes — visible & writable on mobile too */}
      <div className="bg-card rounded-lg p-3 border border-border/50">
        <CustomerNotes submissionId={s.id} customerName={s.name} />
      </div>
    </div>
  );
};

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

// Renders the files a seller uploaded through the public quote form. Each file
// lives in the private `customer-files` bucket under `public-intake/<submission>/...`
// — we download it as a blob before opening so ad blockers do not block backend URLs.
const SellerAttachmentsBlock = ({ files }: { files: Array<{ path: string; name: string; size?: number; type?: string }> }) => {
  const open = async (file: { path: string; name: string; type?: string }) => {
    const { data, error } = await supabase.storage.from("customer-files").download(file.path);
    if (error || !data) {
      alert("Couldn't open file: " + (error?.message || "unknown"));
      return;
    }
    const blob = file.type ? new Blob([data], { type: file.type }) : data;
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };
  return (
    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4 space-y-2">
      <p className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
        <FileText className="w-3 h-3" /> Uploaded with the form ({files.length})
      </p>
      <ul className="space-y-1.5">
        {files.map((f) => (
          <li key={f.path}>
            <button
              onClick={() => open(f)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-background border border-border/50 hover:border-primary/40 hover:bg-primary/5 text-left transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-xs text-foreground truncate flex-1">{f.name}</span>
              {typeof f.size === "number" && (
                <span className="text-[10px] text-muted-foreground shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
              )}
              <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SubmissionsPanel;
