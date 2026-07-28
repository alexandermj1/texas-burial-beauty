import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  Search,
  Filter,
  Radio,
  FileText,
  Upload,
  Eye,
  Mail,
  StickyNote,
  GitBranch,
  Sparkles,
  Send,
  DollarSign,
  UserCircle,
  Clock,
  Download,
  RefreshCw,
  ShieldCheck,
  Maximize2,
  Minimize2,
  ChevronRight,
  FileSignature,
  Stamp,
  X,
} from "lucide-react";
import { cleanDisplayName } from "@/lib/displayName";
import { formatDistanceToNow, format } from "date-fns";

type EventKind =
  | "note"
  | "file_upload"
  | "file_delete"
  | "stage_change"
  | "view"
  | "ai_draft"
  | "ai_sent"
  | "email_sent"
  | "quote_sent"
  | "handled"
  | "payment"
  | "la_sent"
  | "la_signed"
  | "la_countersigned"
  | "poa_sent"
  | "poa_signed";

interface FeedEvent {
  id: string;
  kind: EventKind;
  actorName: string;
  actorId?: string | null;
  timestamp: string;
  summary: string;
  detail?: string;
  submissionId?: string | null;
  customerName?: string | null;
  meta?: Record<string, any>;
  children?: FeedEvent[];
}


const KIND_META: Record<
  EventKind,
  { label: string; Icon: any; color: string; ring: string; dot: string }
> = {
  note: {
    label: "Note",
    Icon: StickyNote,
    color: "text-amber-300",
    ring: "ring-amber-400/30",
    dot: "bg-amber-400",
  },
  file_upload: {
    label: "File upload",
    Icon: Upload,
    color: "text-sky-300",
    ring: "ring-sky-400/30",
    dot: "bg-sky-400",
  },
  file_delete: {
    label: "File deleted",
    Icon: FileText,
    color: "text-rose-300",
    ring: "ring-rose-400/30",
    dot: "bg-rose-400",
  },
  stage_change: {
    label: "Stage change",
    Icon: GitBranch,
    color: "text-violet-300",
    ring: "ring-violet-400/30",
    dot: "bg-violet-400",
  },
  view: {
    label: "Viewed",
    Icon: Eye,
    color: "text-slate-300",
    ring: "ring-slate-400/20",
    dot: "bg-slate-400",
  },
  ai_draft: {
    label: "AI draft",
    Icon: Sparkles,
    color: "text-fuchsia-300",
    ring: "ring-fuchsia-400/30",
    dot: "bg-fuchsia-400",
  },
  ai_sent: {
    label: "AI reply sent",
    Icon: Send,
    color: "text-emerald-300",
    ring: "ring-emerald-400/30",
    dot: "bg-emerald-400",
  },
  email_sent: {
    label: "Email",
    Icon: Mail,
    color: "text-cyan-300",
    ring: "ring-cyan-400/30",
    dot: "bg-cyan-400",
  },
  quote_sent: {
    label: "Quote sent",
    Icon: Send,
    color: "text-indigo-300",
    ring: "ring-indigo-400/30",
    dot: "bg-indigo-400",
  },
  handled: {
    label: "Marked handled",
    Icon: ShieldCheck,
    color: "text-teal-300",
    ring: "ring-teal-400/30",
    dot: "bg-teal-400",
  },
  payment: {
    label: "Payment",
    Icon: DollarSign,
    color: "text-lime-300",
    ring: "ring-lime-400/30",
    dot: "bg-lime-400",
  },
  la_sent: {
    label: "LA sent",
    Icon: FileSignature,
    color: "text-blue-300",
    ring: "ring-blue-400/30",
    dot: "bg-blue-400",
  },
  la_signed: {
    label: "LA signed",
    Icon: FileSignature,
    color: "text-emerald-300",
    ring: "ring-emerald-400/30",
    dot: "bg-emerald-400",
  },
  la_countersigned: {
    label: "LA countersigned",
    Icon: Stamp,
    color: "text-teal-300",
    ring: "ring-teal-400/30",
    dot: "bg-teal-400",
  },
  poa_sent: {
    label: "POA sent",
    Icon: FileSignature,
    color: "text-orange-300",
    ring: "ring-orange-400/30",
    dot: "bg-orange-400",
  },
  poa_signed: {
    label: "POA signed",
    Icon: Stamp,
    color: "text-emerald-300",
    ring: "ring-emerald-400/30",
    dot: "bg-emerald-400",
  },

};

const RANGE_OPTIONS: { key: string; label: string; hours: number }[] = [
  { key: "1h", label: "1h", hours: 1 },
  { key: "24h", label: "24h", hours: 24 },
  { key: "7d", label: "7d", hours: 24 * 7 },
  { key: "30d", label: "30d", hours: 24 * 30 },
  { key: "all", label: "All", hours: 24 * 365 * 5 },
];

export default function ActivityMonitorPanel() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rangeKey, setRangeKey] = useState("24h");
  const [actorFilter, setActorFilter] = useState<string>("all");
  const [kindFilter, setKindFilter] = useState<EventKind | "all">("all");
  const [query, setQuery] = useState("");
  const [live, setLive] = useState(true);
  const [selected, setSelected] = useState<FeedEvent | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [bundle, setBundle] = useState(true);
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(new Set());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selected) setSelected(null);
        else if (fullscreen) setFullscreen(false);
      }
      if (e.key === "f" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setFullscreen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, selected]);


  const load = async () => {
    setRefreshing(true);
    const range = RANGE_OPTIONS.find((r) => r.key === rangeKey) || RANGE_OPTIONS[1];
    const since = new Date(Date.now() - range.hours * 3600 * 1000).toISOString();

    const [logs, notes, aiEdits, views, subs, payments, contracts] = await Promise.all([
      supabase
        .from("customer_activity_log" as any)
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("customer_notes" as any)
        .select("id, body, author_name, author_user_id, created_at, submission_id, customer_profile_id")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("ai_draft_edits" as any)
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("submission_views" as any)
        .select("id, user_name, user_id, viewed_at, submission_id")
        .gte("viewed_at", since)
        .order("viewed_at", { ascending: false })
        .limit(500),
      supabase
        .from("contact_submissions" as any)
        .select(
          "id, name, email, handled_by_name, handled_at, quote_sent_at, sold_at, sold_price, accepted_quote_amount, la_issued_at, poa_signed_at, updated_at, cemetery"
        )
        .gte("updated_at", since)
        .order("updated_at", { ascending: false })
        .limit(500),
      supabase
        .from("payment_transactions" as any)
        .select("id, amount_cents, description, status, created_by_name, created_at, paid_at, submission_id, kind")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("contracts" as any)
        .select("id, kind, status, submission_id, sent_at, signed_at, countersigned_at, countersigner_name, created_at, updated_at")
        .or(`sent_at.gte.${since},signed_at.gte.${since},countersigned_at.gte.${since}`)
        .order("updated_at", { ascending: false })
        .limit(300),
    ]) as any;

    // Build submission id -> display name map so every event row shows WHO it
    // is about, not just an 8-char UUID slice. Also fetch names for submissions
    // referenced by other event sources but not in the recent-subs slice.
    const subNameMap = new Map<string, string>();
    for (const s of (subs.data as any[]) || []) {
      const label = s.name || s.email || (s.cemetery ? `${s.cemetery} inquiry` : "Submission");
      subNameMap.set(s.id, label);
    }
    const missingIds = new Set<string>();
    const collectIds = (rows: any[] | null | undefined, key: string) => {
      (rows || []).forEach((r) => {
        const id = r?.[key];
        if (id && !subNameMap.has(id)) missingIds.add(id);
      });
    };
    collectIds(logs.data as any[], "submission_id");
    collectIds(notes.data as any[], "submission_id");
    collectIds(aiEdits.data as any[], "submission_id");
    collectIds(views.data as any[], "submission_id");
    collectIds(payments.data as any[], "submission_id");
    collectIds(contracts?.data as any[], "submission_id");
    if (missingIds.size > 0) {
      const { data: extra } = await supabase
        .from("contact_submissions" as any)
        .select("id, name, email, cemetery")
        .in("id", Array.from(missingIds));
      for (const s of (extra as any[]) || []) {
        const label = s.name || s.email || (s.cemetery ? `${s.cemetery} inquiry` : "Submission");
        subNameMap.set(s.id, label);
      }
    }
    const nameFor = (id?: string | null) => (id && subNameMap.get(id)) || null;

    const feed: FeedEvent[] = [];

    for (const row of (logs.data as any[]) || []) {
      const isDelete = row.action_type === "file_deleted";
      const isStage = row.action_type === "stage_changed";
      const kind: EventKind = isDelete
        ? "file_delete"
        : isStage
        ? "stage_change"
        : "file_upload";
      feed.push({
        id: `log-${row.id}`,

        kind,
        actorName: cleanDisplayName(row.actor_name) || "System",
        actorId: row.actor_user_id,
        timestamp: row.created_at,
        summary: row.action_summary || KIND_META[kind].label,
        detail: row.details ? JSON.stringify(row.details, null, 2) : undefined,
        submissionId: row.submission_id,
      });
    }

    for (const n of (notes.data as any[]) || []) {
      feed.push({
        id: `note-${n.id}`,
        kind: "note",
        actorName: cleanDisplayName(n.author_name) || "Unknown",
        actorId: n.author_user_id,
        timestamp: n.created_at,
        summary: (n.body || "").slice(0, 140),
        detail: n.body,
        submissionId: n.submission_id,
      });
    }

    for (const e of (aiEdits.data as any[]) || []) {
      feed.push({
        id: `aid-${e.id}`,
        kind: e.was_sent ? "ai_sent" : "ai_draft",
        actorName: cleanDisplayName(e.actor_name) || "Unknown",
        actorId: e.actor_user_id,
        timestamp: e.created_at,
        summary: e.was_sent
          ? `Sent AI reply to ${e.recipient_name || e.recipient_email || "recipient"}`
          : `Drafted AI reply for ${e.recipient_name || e.recipient_email || "recipient"}`,
        detail: `Subject: ${e.subject || "(no subject)"}\n\n--- Original AI draft ---\n${
          e.original_draft || ""
        }\n\n--- Revision instructions ---\n${
          Array.isArray(e.revision_instructions)
            ? e.revision_instructions.join("\n")
            : JSON.stringify(e.revision_instructions)
        }\n\n--- Final sent text ---\n${e.final_sent_text || "(not sent)"}`,
        submissionId: e.submission_id,
        meta: { editDistance: e.edit_distance },
      });
    }

    for (const v of (views.data as any[]) || []) {
      const who = nameFor(v.submission_id);
      feed.push({
        id: `view-${v.id}`,
        kind: "view",
        actorName: cleanDisplayName(v.user_name) || "Unknown",
        actorId: v.user_id,
        timestamp: v.viewed_at,
        summary: who ? `Opened ${who}'s submission` : "Opened a submission",
        submissionId: v.submission_id,
        customerName: who,
      });
    }

    for (const s of (subs.data as any[]) || []) {
      const name = s.name || s.email || "Submission";
      if (s.handled_at && new Date(s.handled_at) >= new Date(since)) {
        feed.push({
          id: `sub-h-${s.id}`,
          kind: "handled",
          actorName: cleanDisplayName(s.handled_by_name) || "System",
          timestamp: s.handled_at,
          summary: `Marked ${name} as handled`,
          submissionId: s.id,
          customerName: name,
        });
      }
      if (s.quote_sent_at && new Date(s.quote_sent_at) >= new Date(since)) {
        feed.push({
          id: `sub-q-${s.id}`,
          kind: "quote_sent",
          actorName: cleanDisplayName(s.handled_by_name) || "System",
          timestamp: s.quote_sent_at,
          summary: `Quote sent to ${name}`,
          submissionId: s.id,
          customerName: name,
        });
      }
      if (s.sold_at && new Date(s.sold_at) >= new Date(since)) {
        feed.push({
          id: `sub-s-${s.id}`,
          kind: "payment",
          actorName: cleanDisplayName(s.handled_by_name) || "System",
          timestamp: s.sold_at,
          summary: `Sold ${name}${s.sold_price ? ` for $${Number(s.sold_price).toLocaleString()}` : ""}`,
          submissionId: s.id,
          customerName: name,
        });
      }
    }

    for (const p of (payments.data as any[]) || []) {
      const paid = p.status === "paid";
      const amount = ((p.amount_cents || 0) / 100).toFixed(2);
      feed.push({
        id: `pay-${p.id}`,
        kind: "payment",
        actorName: cleanDisplayName(p.created_by_name) || "System",
        timestamp: p.paid_at || p.created_at,
        summary: `${paid ? "Payment received" : "Payment link created"} — $${amount}${
          p.description ? ` · ${p.description}` : ""
        }`,
        submissionId: p.submission_id,
        meta: { status: p.status, kind: p.kind, paid, isLinkCreation: !paid },
      });
    }

    for (const c of (contracts?.data as any[]) || []) {
      const isPoa = c.kind === "poa";
      const label = isPoa ? "POA" : "Listing agreement";
      if (c.sent_at && new Date(c.sent_at) >= new Date(since)) {
        feed.push({
          id: `ct-sent-${c.id}`,
          kind: isPoa ? "poa_sent" : "la_sent",
          actorName: "System",
          timestamp: c.sent_at,
          summary: `${label} sent to seller`,
          submissionId: c.submission_id,
        });
      }
      if (c.signed_at && new Date(c.signed_at) >= new Date(since)) {
        feed.push({
          id: `ct-signed-${c.id}`,
          kind: isPoa ? "poa_signed" : "la_signed",
          actorName: "Seller",
          timestamp: c.signed_at,
          summary: `${label} signed by seller`,
          submissionId: c.submission_id,
        });
      }
      if (c.countersigned_at && new Date(c.countersigned_at) >= new Date(since)) {
        feed.push({
          id: `ct-cs-${c.id}`,
          kind: "la_countersigned",
          actorName: cleanDisplayName(c.countersigner_name) || "Broker",
          timestamp: c.countersigned_at,
          summary: `${label} countersigned`,
          submissionId: c.submission_id,
        });
      }
    }

    // Enrich every event with the customer/submission display name so the row
    // and inspector can lead with WHO this is about.
    for (const evt of feed) {
      if (!evt.customerName) {
        const n = nameFor(evt.submissionId);
        if (n) evt.customerName = n;
      }
    }
    feed.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    setEvents(feed);
    setLoading(false);
    setRefreshing(false);
  };


  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey]);

  useEffect(() => {
    if (!live) return;
    const iv = setInterval(load, 20000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, rangeKey]);

  const actors = useMemo(() => {
    const set = new Map<string, number>();
    events.forEach((e) => set.set(e.actorName, (set.get(e.actorName) || 0) + 1));
    return Array.from(set.entries()).sort((a, b) => b[1] - a[1]);
  }, [events]);

  const filteredFlat = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (actorFilter !== "all" && e.actorName !== actorFilter) return false;
      if (kindFilter !== "all" && e.kind !== kindFilter) return false;
      if (q) {
        const hay = `${e.actorName} ${e.summary} ${e.detail || ""} ${e.customerName || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [events, actorFilter, kindFilter, query]);

  // Bundle related events on the same submission that happen close together.
  // e.g. "Quote sent" + payment-link creations from that same quote email get
  // grouped under the quote as children, instead of showing 4 separate rows.
  const filtered = useMemo(() => {
    if (!bundle) return filteredFlat;
    // Group priority: parent event kinds (in order) absorb nearby children.
    const PARENT_RULES: {
      parent: EventKind;
      children: EventKind[];
      windowMin: number;
    }[] = [
      { parent: "quote_sent", children: ["payment"], windowMin: 10 },
      { parent: "la_sent", children: ["payment", "email_sent"], windowMin: 5 },
      { parent: "poa_sent", children: ["payment", "email_sent"], windowMin: 5 },
      { parent: "la_signed", children: ["email_sent"], windowMin: 5 },
    ];
    const used = new Set<string>();
    const out: FeedEvent[] = [];
    // Iterate newest-first (filteredFlat is already sorted desc).
    for (const evt of filteredFlat) {
      if (used.has(evt.id)) continue;
      const rule = PARENT_RULES.find((r) => r.parent === evt.kind);
      if (!rule || !evt.submissionId) {
        out.push(evt);
        used.add(evt.id);
        continue;
      }
      const parentTs = new Date(evt.timestamp).getTime();
      const children = filteredFlat.filter((c) => {
        if (used.has(c.id) || c.id === evt.id) return false;
        if (c.submissionId !== evt.submissionId) return false;
        if (!rule.children.includes(c.kind)) return false;
        // Children can be created just before or just after the parent (link
        // rows are inserted before the quote email fires, then paid later).
        const diff = Math.abs(new Date(c.timestamp).getTime() - parentTs);
        return diff <= rule.windowMin * 60_000;
      });
      children.forEach((c) => used.add(c.id));
      out.push({ ...evt, children: children.length ? children : undefined });
      used.add(evt.id);
    }
    return out;
  }, [filteredFlat, bundle]);

  const stats = useMemo(() => {
    const byKind = new Map<EventKind, number>();
    filteredFlat.forEach((e) => byKind.set(e.kind, (byKind.get(e.kind) || 0) + 1));
    return byKind;
  }, [filteredFlat]);


  const exportCsv = () => {
    const rows = [
      ["timestamp", "actor", "kind", "summary", "submission_id"],
      ...filtered.map((e) => [
        e.timestamp,
        e.actorName,
        e.kind,
        (e.summary || "").replace(/"/g, '""'),
        e.submissionId || "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const scrollClass = fullscreen ? "max-h-[calc(100vh-220px)]" : "max-h-[70vh]";

  const body = (
    <div
      className={`${
        fullscreen
          ? "fixed inset-0 z-[100] rounded-none border-0"
          : "rounded-3xl border border-slate-800 shadow-2xl"
      } overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100`}
    >

      {/* Header bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 bg-slate-900/60 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio className="w-5 h-5 text-emerald-400" />
            {live && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide text-slate-100 uppercase">
              Activity Monitor
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Team surveillance feed
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 rounded-full bg-slate-800/60 border border-slate-700 p-1">
            {RANGE_OPTIONS.map((r) => (
              <button
                key={r.key}
                onClick={() => setRangeKey(r.key)}
                className={`px-3 py-1 rounded-full text-xs font-mono transition-colors ${
                  rangeKey === r.key
                    ? "bg-emerald-500/90 text-slate-950"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setLive((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors ${
              live
                ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                : "border-slate-700 bg-slate-800/60 text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${live ? "bg-emerald-400" : "bg-slate-500"}`} />
            {live ? "Live" : "Paused"}
          </button>
          <button
            onClick={load}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-slate-700 bg-slate-800/60 text-slate-300 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setBundle((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors ${
              bundle
                ? "border-indigo-400/40 bg-indigo-500/10 text-indigo-200"
                : "border-slate-700 bg-slate-800/60 text-slate-400 hover:text-slate-200"
            }`}
            title="Group related events on the same submission (e.g. quote + its payment links)"
          >
            <GitBranch className="w-3.5 h-3.5" />
            {bundle ? "Bundled" : "Flat"}
          </button>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-slate-700 bg-slate-800/60 text-slate-300 hover:text-white"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button
            onClick={() => setFullscreen((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-slate-700 bg-slate-800/60 text-slate-300 hover:text-white"
            title={fullscreen ? "Exit fullscreen (Esc)" : "Fullscreen (⌘/Ctrl+F)"}
          >
            {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            {fullscreen ? "Exit" : "Fullscreen"}
          </button>
        </div>
      </div>


      {/* Stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-px bg-slate-800 border-b border-slate-800">
        {(
          [
            { label: "Events", value: filtered.length, Icon: Activity, color: "text-emerald-300" },
            { label: "Notes", value: stats.get("note") || 0, Icon: StickyNote, color: "text-amber-300" },
            { label: "AI replies", value: (stats.get("ai_sent") || 0) + (stats.get("ai_draft") || 0), Icon: Sparkles, color: "text-fuchsia-300" },
            { label: "Uploads", value: stats.get("file_upload") || 0, Icon: Upload, color: "text-sky-300" },
            { label: "Views", value: stats.get("view") || 0, Icon: Eye, color: "text-slate-300" },
            { label: "Payments", value: stats.get("payment") || 0, Icon: DollarSign, color: "text-lime-300" },
          ] as const
        ).map((s) => (
          <div key={s.label} className="bg-slate-950/60 px-4 py-3 flex items-center gap-3">
            <s.Icon className={`w-4 h-4 ${s.color}`} />
            <div>
              <div className="text-lg font-mono font-semibold text-slate-100 leading-none">
                {s.value}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-[260px_1fr_minmax(0,380px)]">
        {/* Left rail: actors */}
        <aside className={`border-r border-slate-800 bg-slate-950/40 p-4 space-y-4 ${scrollClass} overflow-y-auto`}>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1">
              <UserCircle className="w-3 h-3" /> Operators
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setActorFilter("all")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                  actorFilter === "all"
                    ? "bg-emerald-500/10 text-emerald-200 border border-emerald-500/30"
                    : "text-slate-300 hover:bg-slate-800/60 border border-transparent"
                }`}
              >
                <span>All operators</span>
                <span className="font-mono text-slate-500">{events.length}</span>
              </button>
              {actors.map(([name, count]) => (
                <button
                  key={name}
                  onClick={() => setActorFilter(name)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                    actorFilter === name
                      ? "bg-emerald-500/10 text-emerald-200 border border-emerald-500/30"
                      : "text-slate-300 hover:bg-slate-800/60 border border-transparent"
                  }`}
                >
                  <span className="truncate">{name}</span>
                  <span className="font-mono text-slate-500">{count}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Event type
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setKindFilter("all")}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                  kindFilter === "all"
                    ? "bg-slate-800 text-slate-100 border border-slate-700"
                    : "text-slate-400 hover:bg-slate-800/60 border border-transparent"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                All events
              </button>
              {(Object.keys(KIND_META) as EventKind[]).map((k) => {
                const meta = KIND_META[k];
                const count = stats.get(k) || 0;
                return (
                  <button
                    key={k}
                    onClick={() => setKindFilter(k)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                      kindFilter === k
                        ? "bg-slate-800 text-slate-100 border border-slate-700"
                        : "text-slate-400 hover:bg-slate-800/60 border border-transparent"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                    <meta.Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                    <span className="flex-1 text-left">{meta.label}</span>
                    <span className="font-mono text-slate-500">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Center: feed */}
        <section className={`${scrollClass} overflow-y-auto`}>
          <div className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur border-b border-slate-800 px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search actor, action, note text, subject..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-500 text-sm">Booting feed...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-sm">
              No events match the current filters.
            </div>
          ) : (
            <ol className="relative">
              {filtered.map((e, idx) => {
                const meta = KIND_META[e.kind];
                const isSel = selected?.id === e.id;
                return (
                  <li
                    key={e.id}
                    className={`relative border-b border-slate-800/70 px-5 py-3 cursor-pointer transition-colors ${
                      isSel ? "bg-slate-800/50" : "hover:bg-slate-900/60"
                    }`}
                    onClick={() => setSelected(e)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`shrink-0 mt-0.5 w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center ring-2 ${meta.ring}`}
                      >
                        <meta.Icon className={`w-4 h-4 ${meta.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="font-semibold text-slate-100">
                            {e.actorName}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-slate-800 ${meta.color}`}>
                            {meta.label}
                          </span>
                          {e.customerName && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800/70 border border-slate-700 text-slate-200">
                              re: {e.customerName}
                            </span>
                          )}
                          <span className="text-slate-500 font-mono ml-auto flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-slate-300 line-clamp-2">
                          {e.summary || "(no summary)"}
                        </div>
                        <div className="mt-1 text-[10px] text-slate-600 font-mono flex items-center gap-2 flex-wrap">
                          <span>{format(new Date(e.timestamp), "yyyy-MM-dd HH:mm:ss")}</span>
                          {e.submissionId && <span>· sub {e.submissionId.slice(0, 8)}</span>}
                          {e.children && e.children.length > 0 && (
                            <button
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setExpandedBundles((s) => {
                                  const n = new Set(s);
                                  n.has(e.id) ? n.delete(e.id) : n.add(e.id);
                                  return n;
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 font-sans hover:bg-indigo-500/25"
                            >
                              <ChevronRight className={`w-3 h-3 transition-transform ${expandedBundles.has(e.id) ? "rotate-90" : ""}`} />
                              +{e.children.length} related
                            </button>
                          )}
                        </div>
                        {e.children && expandedBundles.has(e.id) && (
                          <ul className="mt-2 space-y-1 border-l-2 border-indigo-500/30 pl-3">
                            {e.children.map((c) => {
                              const cm = KIND_META[c.kind];
                              return (
                                <li
                                  key={c.id}
                                  className="flex items-center gap-2 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
                                  onClick={(ev) => { ev.stopPropagation(); setSelected(c); }}
                                >
                                  <cm.Icon className={`w-3 h-3 ${cm.color}`} />
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider bg-slate-800/60 ${cm.color}`}>{cm.label}</span>
                                  <span className="truncate">{c.summary}</span>
                                  <span className="ml-auto font-mono text-slate-600">
                                    {format(new Date(c.timestamp), "HH:mm:ss")}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </div>
                  </li>

                );
              })}
            </ol>
          )}
        </section>

        {/* Right: detail inspector */}
        <aside className={`border-l border-slate-800 bg-slate-950/40 ${scrollClass} overflow-y-auto`}>
          {selected ? (
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                {(() => {
                  const meta = KIND_META[selected.kind];
                  return (
                    <div
                      className={`shrink-0 w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center ring-2 ${meta.ring}`}
                    >
                      <meta.Icon className={`w-5 h-5 ${meta.color}`} />
                    </div>
                  );
                })()}
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-widest text-slate-500">
                    {KIND_META[selected.kind].label}
                  </div>
                  <div className="text-sm font-semibold text-slate-100 break-words">
                    {selected.summary}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-slate-900/70 border border-slate-800 p-3">
                  <div className="text-[10px] uppercase text-slate-500 tracking-widest">
                    Operator
                  </div>
                  <div className="text-slate-100 mt-1">{selected.actorName}</div>
                </div>
                <div className="rounded-lg bg-slate-900/70 border border-slate-800 p-3">
                  <div className="text-[10px] uppercase text-slate-500 tracking-widest">
                    Timestamp
                  </div>
                  <div className="text-slate-100 mt-1 font-mono">
                    {format(new Date(selected.timestamp), "yyyy-MM-dd HH:mm:ss")}
                  </div>
                </div>
                {selected.submissionId && (
                  <div className="col-span-2 rounded-lg bg-slate-900/70 border border-slate-800 p-3">
                    <div className="text-[10px] uppercase text-slate-500 tracking-widest">
                      Submission
                    </div>
                    <a
                      href={`/admin?sub=${selected.submissionId}`}
                      className="text-emerald-300 hover:underline text-xs font-mono break-all"
                    >
                      {selected.submissionId}
                    </a>
                  </div>
                )}
              </div>

              {selected.detail && (
                <div>
                  <div className="text-[10px] uppercase text-slate-500 tracking-widest mb-2">
                    Payload
                  </div>
                  <pre className="rounded-lg bg-black/60 border border-slate-800 p-3 text-[11px] text-slate-300 whitespace-pre-wrap break-words font-mono max-h-80 overflow-auto">
                    {selected.detail}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="p-10 text-center text-slate-500 text-xs">
              Select an event to inspect the full payload.
            </div>
          )}
        </aside>
      </div>
    </div>
  );

  if (!fullscreen) return body;
  return (
    <>
      <div className="fixed inset-0 z-[99] bg-slate-950/70 backdrop-blur-sm" onClick={() => setFullscreen(false)} />
      {body}
      <button
        onClick={() => setFullscreen(false)}
        className="fixed top-4 right-4 z-[101] inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-200 text-xs hover:bg-slate-700"
        title="Close (Esc)"
      >
        <X className="w-3.5 h-3.5" /> Close
      </button>
    </>
  );
}

