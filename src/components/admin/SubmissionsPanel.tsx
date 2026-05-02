import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, ExternalLink, CheckCircle, Trash2, ChevronRight, Inbox, FileText, Send, MessageCircleX, Layers, ThumbsUp, ThumbsDown } from "lucide-react";
import SendQuoteDialog from "./SendQuoteDialog";
import SendBuyerQuoteDialog from "./SendBuyerQuoteDialog";
import SendDeclineDialog from "./SendDeclineDialog";
import CustomerKindBadge, { resolveKind } from "./CustomerKindBadge";
import CustomerJourney from "./CustomerJourney";
import { useActiveListings } from "@/hooks/useActiveListings";

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
}

interface Props {
  submissions: Submission[];
  searchQuery: string;
  onUpdate: (id: string, patch: Partial<Submission>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  /** Optional: focus a specific submission (used when arriving from the Gmail inbox). */
  focusSubmissionId?: string | null;
}

const sourceLabel = (s: string | null) => {
  switch (s) {
    case "contact": return "Contact form";
    case "seller_quote": return "Seller quote";
    case "buy_property_wizard": return "Buyer wizard";
    default: return s || "Unknown";
  }
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
};

const cemeterySearchUrl = (cemetery: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(cemetery + " Texas phone number")}`;

type StatusFilter = "all" | "new" | "handled";
type KindFilter = "all" | "seller" | "buyer" | "contact";

const SubmissionsPanel = ({ submissions, searchQuery, onUpdate, onDelete, focusSubmissionId }: Props) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("new");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [notesDraft, setNotesDraft] = useState("");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [buyerOpen, setBuyerOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const { countFor } = useActiveListings();

  // Honor an external focus request (e.g. clicking "Open customer" from the Gmail inbox).
  // Switch the status filter to "all" so the chosen submission is guaranteed to be visible.
  useEffect(() => {
    if (focusSubmissionId) {
      setSelectedId(focusSubmissionId);
      setFilter("all");
      setKindFilter("all");
      const target = submissions.find(s => s.id === focusSubmissionId);
      setNotesDraft(target?.admin_notes ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSubmissionId]);

  const filtered = useMemo(() => {
    return submissions.filter(s => {
      if (filter === "new" && s.handled) return false;
      if (filter === "handled" && !s.handled) return false;
      if (kindFilter !== "all" && resolveKind(s.customer_kind, s.source) !== kindFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return [s.name, s.email, s.phone, s.cemetery, s.message, s.details, s.source]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q));
    });
  }, [submissions, filter, kindFilter, searchQuery]);

  const selected = submissions.find(s => s.id === selectedId) || filtered[0] || null;

  // Counts for the kind pills (respect status filter so the numbers reflect what you'd see).
  const kindBase = useMemo(() => submissions.filter(s => {
    if (filter === "new" && s.handled) return false;
    if (filter === "handled" && !s.handled) return false;
    return true;
  }), [submissions, filter]);
  const kindCount = (k: KindFilter) =>
    k === "all" ? kindBase.length : kindBase.filter(s => resolveKind(s.customer_kind, s.source) === k).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Status pills */}
      <div className="lg:col-span-12 flex items-center gap-2 flex-wrap">
        {(["new", "handled", "all"] as const).map(f => {
          const count = f === "all" ? submissions.length : f === "new" ? submissions.filter(s => !s.handled).length : submissions.filter(s => s.handled).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
                filter === f ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {f === "new" ? "New" : f === "handled" ? "Handled" : "All"} ({count})
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
      </div>


      {/* List */}
      <div className="lg:col-span-5 bg-card rounded-xl border border-border/50 overflow-hidden max-h-[70vh] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Inbox className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No submissions in this view.</p>
          </div>
        ) : (
          filtered.map((s, i) => {
            const isActive = selected?.id === s.id;
            return (
              <motion.button
                key={s.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.2) }}
                onClick={() => { setSelectedId(s.id); setNotesDraft(s.admin_notes || ""); }}
                className={`w-full text-left px-4 py-3 border-b border-border/40 transition-colors flex items-start gap-3 ${
                  isActive ? "bg-primary/5" : "hover:bg-muted/40"
                }`}
              >
                <CustomerKindBadge kind={resolveKind(s.customer_kind, s.source)} variant="dot" className="mt-2" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{s.name || "Anonymous"}</p>
                      <CustomerKindBadge kind={resolveKind(s.customer_kind, s.source)} size="xs" />
                      {!s.handled && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" title="New" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{formatDate(s.created_at).split(",")[0]}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    <span className="text-primary/80">{sourceLabel(s.source)}</span>
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
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <CustomerKindBadge kind={resolveKind(selected.customer_kind, selected.source)} />
                  <p className="text-xs text-primary font-medium tracking-wide uppercase">{sourceLabel(selected.source)}</p>
                </div>
                <h3 className="font-display text-xl text-foreground">{selected.name || "Anonymous"}</h3>
                <p className="text-xs text-muted-foreground mt-1">{formatDate(selected.created_at)}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${selected.handled ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                {selected.handled ? "Handled" : "New"}
              </span>
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

            {/* Cemetery + lookup */}
            {selected.cemetery && (() => {
              const count = countFor(selected.cemetery);
              return (
                <div className="bg-muted/40 rounded-lg p-4 border border-border/50">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Cemetery</p>
                      <p className="text-sm font-medium text-foreground truncate">{selected.cemetery}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium border shrink-0 ${
                        count > 0
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                      title={count > 0 ? `${count} active listing${count === 1 ? "" : "s"} in our inventory` : "No listings in our inventory"}
                    >
                      <Layers className="w-3 h-3" />
                      {count} {count === 1 ? "plot" : "plots"} in inventory
                    </span>
                  </div>
                  <a
                    href={cemeterySearchUrl(selected.cemetery)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" /> Look up cemetery phone on Google
                  </a>
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

            {/* Admin notes */}
            <div>
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 block">Internal notes</label>
              <textarea
                value={notesDraft}
                onChange={e => setNotesDraft(e.target.value)}
                onBlur={() => {
                  if (notesDraft !== (selected.admin_notes || "")) {
                    onUpdate(selected.id, { admin_notes: notesDraft });
                  }
                }}
                rows={3}
                placeholder="Add notes for your team…"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            {/* Quote sent indicator */}
            {selected.quote_sent_at && (
              <div className="bg-primary/5 border border-primary/15 rounded-lg p-3 text-xs text-foreground">
                <span className="font-medium">Quote sent</span>
                {selected.quote_amount ? ` · $${Number(selected.quote_amount).toLocaleString()}` : ""} ·{" "}
                <span className="text-muted-foreground">
                  {new Date(selected.quote_sent_at).toLocaleString("en-US", {
                    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
                  })}
                </span>
              </div>
            )}

            {/* Customer journey: DocuSign + documents + linked emails + reminders */}
            <CustomerJourney
              submission={selected}
              onSubmissionPatched={(patch) => onUpdate(selected.id, patch)}
            />

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => onUpdate(selected.id, { handled: !selected.handled })}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all ${
                    selected.handled
                      ? "border border-border text-muted-foreground hover:text-foreground"
                      : "bg-foreground text-background hover:opacity-90"
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  {selected.handled ? "Mark as new" : "Mark as handled"}
                </button>

                {selected.source === "seller_quote" ? (
                  <button
                    onClick={() => setQuoteOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {selected.quote_sent_at ? "Update quote" : "Send seller quote"}
                  </button>
                ) : (
                  <button
                    onClick={() => setBuyerOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send available plots
                  </button>
                )}

                <button
                  onClick={() => setDeclineOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium border border-border text-foreground hover:bg-muted/50 transition-colors"
                >
                  <MessageCircleX className="w-3.5 h-3.5" />
                  Polite decline
                </button>
              </div>
              <button
                onClick={() => onDelete(selected.id)}
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
        </>
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

export default SubmissionsPanel;
