// Buyer workspace: every live listing and every seller at the buyer's cemetery,
// expandable in place so staff never leave the buyer record. Sellers are
// colour-coded by their pipeline stage.
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ExternalLink, Globe, Users, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { AdminListing } from "@/hooks/useActiveListings";
import type { Submission } from "./SubmissionsPanel";

const money = (v: any) => (v != null && v !== "" && !isNaN(Number(v)) ? `$${Number(v).toLocaleString()}` : null);
const spacesLabel = (n: any) => (n ? `${n} space${Number(n) > 1 ? "s" : ""}` : null);
const fmtDate = (d: any) => (d ? new Date(d).toLocaleDateString() : null);

interface Props {
  cemetery: string | null;
  listings: AdminListing[];
  sellers: Submission[];
  manualIds: string[];
  onRemoveManual: (id: string) => void;
}

type DocCount = { total: number; received: number; poaPending: number };

// Detailed seller progress, read straight from the milestones on the record
// plus the live document checklist — so "Docs out 3/7" etc. is always current.
const STEPS = [
  { key: "inquiry",   label: "Inquiry",            cls: "bg-primary/10 text-primary border-primary/25", dot: "bg-primary" },
  { key: "quiet",     label: "Quote gone quiet",   cls: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
  { key: "quoted",    label: "Quote sent",         cls: "bg-amber-500/10 text-amber-700 border-amber-500/25", dot: "bg-amber-500" },
  { key: "accepted",  label: "Quote accepted",     cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25", dot: "bg-emerald-500" },
  { key: "la_out",    label: "Agreement out",      cls: "bg-sky-500/10 text-sky-700 border-sky-500/25", dot: "bg-sky-500" },
  { key: "unpaid",    label: "Signed · awaiting payment", cls: "bg-amber-500/10 text-amber-700 border-amber-500/25", dot: "bg-amber-500" },
  { key: "signed",    label: "Agreement signed",   cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25", dot: "bg-emerald-500" },
  { key: "tree_out",  label: "Family tree out",    cls: "bg-sky-500/10 text-sky-700 border-sky-500/25", dot: "bg-sky-500" },
  { key: "tree_done", label: "Family tree done",   cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25", dot: "bg-emerald-500" },
  { key: "docs_out",  label: "Docs out",           cls: "bg-orange-500/10 text-orange-700 border-orange-500/30", dot: "bg-orange-500" },
  { key: "docs_in",   label: "Docs complete",      cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", dot: "bg-emerald-600" },
  { key: "compiled",  label: "File compiled",      cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", dot: "bg-emerald-600" },
  { key: "live",      label: "Listing live",       cls: "bg-emerald-600/20 text-emerald-800 border-emerald-600/40", dot: "bg-emerald-700" },
  { key: "sold",      label: "Sold",               cls: "bg-foreground/10 text-foreground border-foreground/20", dot: "bg-foreground" },
] as const;
type StepKey = typeof STEPS[number]["key"];
const STEP = Object.fromEntries(STEPS.map((x, i) => [x.key, { ...x, i }])) as Record<StepKey, typeof STEPS[number] & { i: number }>;

const progressOf = (s: any, d?: DocCount): { key: StepKey; text: string } => {
  const a = s.ownership_answers || {};
  const docsReq = (d && d.total > 0) || !!s.documents_requested_at;
  const docsDone = !!s.documents_completed_at || (d && d.total > 0 && d.received >= d.total);
  if (s.sold_at) return { key: "sold", text: "Sold" };
  if (s.listing_live_at) return { key: "live", text: "Listing live" };
  if (s.listing_number) return { key: "compiled", text: "File compiled" };
  if (docsReq && docsDone) return { key: "docs_in", text: "Docs complete" };
  if (docsReq) return { key: "docs_out", text: d && d.total ? `Docs out · ${d.received}/${d.total} in` : "Docs out" };
  if (a.sellerConfirmedAt) return { key: "tree_done", text: "Family tree done" };
  if (a.questionsSentAt) return { key: "tree_out", text: "Family tree out" };
  if (s.la_signed_at) {
    const paidTier = s.listing_option && !["free", "starter_waived"].includes(s.listing_option);
    if (paidTier && !s.payment_received_at && !s.listing_paid_at) return { key: "unpaid", text: "Signed · awaiting payment" };
    return { key: "signed", text: "Agreement signed" };
  }
  if (s.la_issued_at) return { key: "la_out", text: "Agreement out" };
  if (s.quote_response === "accepted") return { key: "accepted", text: "Quote accepted" };
  if (s.quote_response === "declined") return { key: "quiet", text: "Quote declined" };
  if (s.morgued_at) return { key: "quiet", text: "Quote gone quiet" };
  if (s.quote_sent_at) return { key: "quoted", text: "Quote sent" };
  return { key: "inquiry", text: "Inquiry" };
};

const Detail = ({ k, v }: { k: string; v: any }) =>
  v ? (
    <div className="min-w-0">
      <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{k}</p>
      <p className="text-xs text-foreground font-medium break-words">{v}</p>
    </div>
  ) : null;

const BuyerCemeteryInventory = ({ cemetery, listings, sellers, manualIds, onRemoveManual }: Props) => {
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (id: string) => setOpen((o) => (o === id ? null : id));

  const [docs, setDocs] = useState<Record<string, DocCount>>({});
  const idsKey = sellers.map((s) => s.id).sort().join(",");
  useEffect(() => {
    if (!idsKey) { setDocs({}); return; }
    let live = true;
    (async () => {
      const { data } = await supabase
        .from("submission_documents")
        .select("submission_id, status, doc_code, document_type")
        .is("deleted_at", null)
        .in("submission_id", idsKey.split(","));
      const m: Record<string, DocCount> = {};
      for (const r of (data as any[]) || []) {
        const c = (m[r.submission_id] ||= { total: 0, received: 0, poaPending: 0 });
        c.total++;
        if (r.status === "received") c.received++;
        else if (/poa/i.test(`${r.doc_code || ""} ${r.document_type || ""}`)) c.poaPending++;
      }
      if (live) setDocs(m);
    })();
    return () => { live = false; };
  }, [idsKey]);

  const prog = useMemo(() => {
    const m: Record<string, { key: StepKey; text: string }> = {};
    for (const s of sellers) m[s.id] = progressOf(s, docs[s.id]);
    return m;
  }, [sellers, docs]);
  const sorted = [...sellers].sort((a, b) => STEP[prog[b.id].key].i - STEP[prog[a.id].key].i);
  const stagesPresent = STEPS.filter((st) => sellers.some((s) => prog[s.id].key === st.key));

  return (
    <div className="space-y-4">
      {/* Live listings */}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5 inline-flex items-center gap-1.5">
          <Globe className="w-3 h-3" /> Live listings at {cemetery || "this cemetery"} ({listings.length})
        </p>
        {listings.length === 0 ? (
          <p className="text-xs text-muted-foreground">No live listings here right now.</p>
        ) : (
          <ul className="space-y-1.5">
            {listings.map((l) => {
              const isOpen = open === `l-${l.id}`;
              return (
                <li key={l.id} className="rounded-lg bg-card border border-border/60 overflow-hidden">
                  <button
                    onClick={() => toggle(`l-${l.id}`)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium text-foreground truncate">
                        {l.plot_type || "Plot"}{l.section ? ` · ${l.section}` : ""}
                      </span>
                      <span className="block text-[11px] text-muted-foreground truncate">
                        {[spacesLabel(l.spaces), l.city].filter(Boolean).join(" · ") || "Details on file"}
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 shrink-0">
                      {money(l.asking_price) || "Price on request"}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 pt-1 border-t border-border/50 space-y-3">
                      {l.photos && l.photos.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {l.photos.slice(0, 6).map((p) => (
                            <img key={p} src={p} alt="" className="h-20 w-28 object-cover rounded-md border border-border/50 shrink-0" />
                          ))}
                        </div>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Detail k="Type" v={l.plot_type} />
                        <Detail k="Section" v={l.section} />
                        <Detail k="Spaces" v={l.spaces} />
                        <Detail k="Asking" v={money(l.asking_price)} />
                      </div>
                      {l.description && <p className="text-xs text-muted-foreground whitespace-pre-line">{l.description}</p>}
                      <a
                        href={`/properties?listing=${l.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" /> Public listing page (new tab)
                      </a>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Sellers in the pipeline */}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5 inline-flex items-center gap-1.5">
          <Users className="w-3 h-3" /> Sellers at {cemetery || "this cemetery"} ({sellers.length})
        </p>
        {stagesPresent.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {stagesPresent.map((m) => {
              const n = sellers.filter((s) => prog[s.id].key === m.key).length;
              return (
                <span key={m.key} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${m.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} /> {m.label} · {n}
                </span>
              );
            })}
          </div>
        )}
        {sellers.length === 0 ? (
          <p className="text-xs text-muted-foreground">No sellers at this cemetery yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {sorted.map((s) => {
              const x = s as any;
              const p = prog[s.id];
              const m = STEP[p.key];
              const d = docs[s.id];
              const a = x.ownership_answers || {};
              const paidTier = x.listing_option && !["free", "starter_waived"].includes(x.listing_option);
              const milestones: { label: string; done: boolean; note?: string | null }[] = [
                { label: "Quote sent", done: !!s.quote_sent_at, note: fmtDate(s.quote_sent_at) },
                { label: "Quote accepted", done: x.quote_response === "accepted", note: x.quote_response === "declined" ? "declined" : fmtDate(x.quote_responded_at) },
                { label: "Agreement sent", done: !!x.la_issued_at, note: fmtDate(x.la_issued_at) },
                { label: "Agreement signed", done: !!x.la_signed_at, note: fmtDate(x.la_signed_at) },
                ...(paidTier ? [{ label: "Listing fee paid", done: !!(x.payment_received_at || x.listing_paid_at), note: fmtDate(x.payment_received_at || x.listing_paid_at) }] : []),
                { label: "Family tree sent", done: !!a.questionsSentAt, note: fmtDate(a.questionsSentAt) },
                { label: "Family tree completed", done: !!a.sellerConfirmedAt, note: fmtDate(a.sellerConfirmedAt) },
                { label: "Docs requested", done: !!(d?.total || x.documents_requested_at), note: d?.total ? `${d.total} items` : fmtDate(x.documents_requested_at) },
                { label: "Docs received", done: !!x.documents_completed_at || (!!d && d.total > 0 && d.received >= d.total), note: d?.total ? `${d.received}/${d.total}` : null },
                { label: "POA signed & notarised", done: !!x.poa_notarized_at, note: d?.poaPending ? `${d.poaPending} POA outstanding` : fmtDate(x.poa_notarized_at) },
                { label: "Counter-signed", done: !!x.la_countersigned_at, note: fmtDate(x.la_countersigned_at) },
                { label: "Listing live", done: !!x.listing_live_at, note: x.listing_number ? `#${x.listing_number}` : fmtDate(x.listing_live_at) },
              ];
              const isOpen = open === `s-${s.id}`;
              const isManual = manualIds.includes(s.id);
              const has = [s.property_type, x.section, spacesLabel(s.spaces)].filter(Boolean).join(" · ");
              const price = money(x.list_price) || money(x.quote_amount);
              return (
                <li key={s.id} className="rounded-lg bg-card border border-border/60 overflow-hidden">
                  <div className="flex items-center">
                    <span className={`self-stretch w-1 shrink-0 ${m.dot}`} />
                    <button
                      onClick={() => toggle(`s-${s.id}`)}
                      className="flex-1 min-w-0 flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium text-foreground truncate">
                          {s.name || s.email || "Seller"}
                          {isManual && <span className="ml-2 text-[9px] uppercase tracking-wide text-muted-foreground">matched by you</span>}
                        </span>
                        <span className="block text-[11px] text-muted-foreground truncate">
                          Has: {has || "plot details not yet given"}
                        </span>
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${m.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} /> {p.text}
                      </span>
                      {price && <span className="text-xs font-semibold text-foreground shrink-0 hidden sm:inline">{price}</span>}
                      <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isManual && (
                      <button
                        onClick={() => onRemoveManual(s.id)}
                        className="p-2 text-muted-foreground hover:text-destructive"
                        title="Remove this match"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {isOpen && (
                    <div className="px-4 pb-3 pt-2 border-t border-border/50 space-y-3">
                      <p className="text-[11px] text-muted-foreground">
                        Now: <span className="font-medium text-foreground">{p.text}</span>
                      </p>
                      <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                        {milestones.map((ms) => (
                          <li key={ms.label} className="flex items-center gap-2 text-[11px]">
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${ms.done ? "bg-emerald-600 border-emerald-600 text-primary-foreground" : "border-border bg-card"}`}>
                              {ms.done && <Check className="w-2.5 h-2.5" />}
                            </span>
                            <span className={ms.done ? "text-foreground" : "text-muted-foreground"}>{ms.label}</span>
                            {ms.note && <span className="text-muted-foreground/80 ml-auto">{ms.note}</span>}
                          </li>
                        ))}
                      </ol>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Detail k="Plot type" v={s.property_type} />
                        <Detail k="Section" v={x.section} />
                        <Detail k="Spaces" v={s.spaces} />
                        <Detail k="Locations" v={x.plot_description} />
                        <Detail k="Quote" v={money(x.quote_amount)} />
                        <Detail k="List price" v={money(x.list_price)} />
                        <Detail k="Phone" v={s.phone} />
                        <Detail k="Email" v={s.email} />
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default BuyerCemeteryInventory;
