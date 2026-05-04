import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Eye, Sparkles, Plus, Check, Search, FileText } from "lucide-react";
import type { Submission } from "./SubmissionsPanel";
import { useActiveListings, type AdminListing } from "@/hooks/useActiveListings";
import { getCemeteryImage, getPlotImage } from "@/lib/listingImages";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  submission: Submission;
  open: boolean;
  onClose: () => void;
}

const PHONE = "(424) 234-1678";
const WEBSITE = "TexasCemeteryBrokers.com";

const formatMoney = (v: number | null | undefined) => {
  if (v === null || v === undefined) return "Price on request";
  return Number(v).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
};

const norm = (s: string | null | undefined) => (s || "").toLowerCase();

// ---------- Smart suggestion logic ----------
const PLOT_TYPE_KEYWORDS: Record<string, string[]> = {
  niche: ["niche", "cremation", "urn", "ash"],
  mausoleum: ["mausoleum", "crypt", "above ground", "above-ground"],
  companion: ["companion", "double", "two side", "side by side", "side-by-side", "couple", "spouse", "wife", "husband"],
  family: ["family", "estate", "plot for", "multiple"],
  veteran: ["veteran", "military", "service member"],
  lawn: ["lawn crypt", "lawn"],
  single: ["single", "one plot", "1 plot", "burial plot", "burial space"],
};

const detectInterestType = (s: Submission): string[] => {
  const haystack = [s.message, s.details, s.property_type, s.section]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const matched: string[] = [];
  for (const [type, kws] of Object.entries(PLOT_TYPE_KEYWORDS)) {
    if (kws.some((k) => haystack.includes(k))) matched.push(type);
  }
  return matched;
};

const matchesInterest = (listing: AdminListing, interests: string[]): boolean => {
  if (interests.length === 0) return true;
  const t = norm(listing.plot_type);
  return interests.some((i) => {
    if (i === "single") return t.includes("single") || t.includes("burial") || (!t.includes("companion") && !t.includes("niche") && !t.includes("crypt") && !t.includes("mausoleum") && !t.includes("family"));
    if (i === "companion") return t.includes("companion") || t.includes("double");
    if (i === "mausoleum") return t.includes("mausoleum") || t.includes("crypt");
    if (i === "niche") return t.includes("niche") || t.includes("cremation");
    if (i === "family") return t.includes("family") || t.includes("estate");
    if (i === "veteran") return t.includes("veteran");
    if (i === "lawn") return t.includes("lawn");
    return false;
  });
};

// Same-region fallback using cemetery name (we don't have a direct region column on listings,
// so we group by city as a reasonable proxy).
const rankSuggestions = (
  all: AdminListing[],
  submission: Submission,
): AdminListing[] => {
  const targetCem = norm(submission.cemetery);
  const interests = detectInterestType(submission);

  const sameCem = all.filter((l) => targetCem && norm(l.cemetery) === targetCem);
  const sameCemMatched = sameCem.filter((l) => matchesInterest(l, interests));
  const sameCemRest = sameCem.filter((l) => !matchesInterest(l, interests));

  // Region fallback by city of the matched cemetery
  let nearby: AdminListing[] = [];
  if (sameCem.length > 0) {
    const city = norm(sameCem[0].city);
    nearby = all.filter(
      (l) => norm(l.city) === city && norm(l.cemetery) !== targetCem && matchesInterest(l, interests),
    );
  }

  const byPrice = (a: AdminListing, b: AdminListing) =>
    (a.asking_price ?? Number.MAX_SAFE_INTEGER) - (b.asking_price ?? Number.MAX_SAFE_INTEGER);

  return [
    ...sameCemMatched.sort(byPrice),
    ...sameCemRest.sort(byPrice),
    ...nearby.sort(byPrice),
  ];
};

// ---------- Email composition ----------
type Need = "preneed" | "atneed";

const detectNeed = (s: Submission): Need => {
  const t = `${s.message || ""} ${s.details || ""} ${s.timeline || ""}`.toLowerCase();
  if (t.includes("immediate") || t.includes("urgent") || t.includes("at need") || t.includes("at-need") || t.includes("passed away") || t.includes("funeral") || t.includes("this week") || t.includes("asap")) {
    return "atneed";
  }
  return "preneed";
};

const FINANCING_PRENEED = `Because you're planning ahead, you also qualify for our 0% financing for 3 years with 25% down — a comfortable way to secure your property today at today's prices, without any interest charges.`;

const FINANCING_ATNEED = `We understand the timing matters right now. To make this easier, we offer 0% financing for 3 years with 25% down so you can move forward without delay while spreading out the cost interest-free.`;

const buildSubject = (s: Submission) => {
  const cem = s.cemetery ? ` at ${s.cemetery}` : "";
  return `Available Plots${cem} — Texas Cemetery Brokers`;
};

const buildListingBlock = (listings: AdminListing[]) =>
  listings
    .map((l, i) => {
      const lines = [
        `${i + 1}. ${l.cemetery}${l.city ? `, ${l.city}` : ""}`,
        `   ${l.plot_type}${l.spaces > 1 ? ` · ${l.spaces} spaces` : ""}${l.section ? ` · Section ${l.section}` : ""}`,
        `   Price: ${formatMoney(l.asking_price)}`,
      ];
      if (l.description) lines.push(`   ${l.description.slice(0, 140)}${l.description.length > 140 ? "…" : ""}`);
      lines.push(`   View: https://texascemeterybrokers.com/properties?listing=${l.id}`);
      return lines.join("\n");
    })
    .join("\n\n");

const buildBody = (
  s: Submission,
  selected: AdminListing[],
  need: Need,
  includeFinancing: boolean,
  intro: string,
  closing: string,
) => {
  const name = s.name || "there";
  const cemMention = s.cemetery ? ` regarding ${s.cemetery}` : "";

  const introLine = intro.trim() ||
    `Thank you for reaching out to Texas Cemetery Brokers${cemMention}. Based on what you shared, here ${selected.length === 1 ? "is a property" : "are some properties"} from our current inventory that may be a good fit:`;

  const financing = includeFinancing
    ? `\n\n${need === "preneed" ? FINANCING_PRENEED : FINANCING_ATNEED}`
    : "";

  const close = closing.trim() ||
    `If any of these interest you, simply reply to this email or call ${PHONE} and we'll arrange a private showing. We're licensed and bonded, and we handle every step of the transfer for you.`;

  return `Dear ${name},

${introLine}

${selected.length ? buildListingBlock(selected) : "[Add at least one property]"}${financing}

${close}

Sincerely,
The Team at Texas Cemetery Brokers
${PHONE}
${WEBSITE}`;
};

// ---------- Component ----------
const SendBuyerQuoteDialog = ({ submission, open, onClose }: Props) => {
  const { listings, listingsAt } = useActiveListings();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [need, setNeed] = useState<Need>(() => detectNeed(submission));
  const [includeFinancing, setIncludeFinancing] = useState(true);
  const [intro, setIntro] = useState("");
  const [closing, setClosing] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [search, setSearch] = useState("");
  const [blankMode, setBlankMode] = useState(false);

  useEffect(() => {
    if (open) {
      setNeed(detectNeed(submission));
      setIncludeFinancing(true);
      setIntro("");
      setClosing("");
      setShowPreview(false);
      setSearch("");
      setBlankMode(false);
      setSelectedIds([]);
    }
  }, [open, submission]);

  const suggested = useMemo(() => rankSuggestions(listings, submission), [listings, submission]);
  const cemListings = useMemo(() => listingsAt(submission.cemetery), [listings, submission.cemetery]);

  // Auto-select top 3 suggestions when dialog first opens (unless blank mode).
  useEffect(() => {
    if (open && !blankMode && selectedIds.length === 0 && suggested.length > 0) {
      setSelectedIds(suggested.slice(0, 3).map((l) => l.id));
    }
  }, [open, blankMode, suggested]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredAll = useMemo(() => {
    if (!search.trim()) return listings;
    const q = search.toLowerCase();
    return listings.filter((l) =>
      [l.cemetery, l.city, l.plot_type, l.section, l.description].some((v) =>
        (v || "").toLowerCase().includes(q),
      ),
    );
  }, [listings, search]);

  const selected = useMemo(
    () => selectedIds.map((id) => listings.find((l) => l.id === id)).filter(Boolean) as AdminListing[],
    [selectedIds, listings],
  );

  const toggle = (id: string) =>
    setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const subject = buildSubject(submission);
  const body = buildBody(submission, selected, need, includeFinancing, intro, closing);

  const handleSendMailto = async () => {
    if (!submission.email) return;
    // Persist recommendations so they show up in the buyer's journey panel.
    if (selected.length > 0) {
      const rows = selected.map((l) => ({
        submission_id: submission.id,
        listing_id: l.id,
        cemetery: l.cemetery,
        plot_type: l.plot_type,
        asking_price: l.asking_price,
      }));
      await supabase.from("buyer_recommendations" as any).insert(rows);
      window.dispatchEvent(new Event("buyer-rec-saved"));
    }
    const mailto = `mailto:${submission.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-2xl shadow-hover border border-border/50 w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-border/40">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold mb-1">
                  Send Available Plots
                </p>
                <h3 className="font-display text-xl text-foreground truncate">
                  {submission.name || "Anonymous"}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {submission.email || "No email"} {submission.cemetery ? `· interested in ${submission.cemetery}` : ""}
                </p>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode toggles */}
            <div className="px-6 py-3 border-b border-border/40 flex flex-wrap items-center gap-2">
              <button
                onClick={() => { setBlankMode(false); setIntro(""); setClosing(""); }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                  !blankMode ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="w-3 h-3" /> Smart template
              </button>
              <button
                onClick={() => { setBlankMode(true); setIntro(" "); setClosing(" "); setSelectedIds([]); }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                  blankMode ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="w-3 h-3" /> Blank email
              </button>

              <span className="mx-2 h-4 w-px bg-border" />

              <div className="inline-flex rounded-full border border-border overflow-hidden text-[11px]">
                <button
                  onClick={() => setNeed("preneed")}
                  className={`px-3 py-1.5 ${need === "preneed" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  Pre-need
                </button>
                <button
                  onClick={() => setNeed("atneed")}
                  className={`px-3 py-1.5 ${need === "atneed" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  At-need
                </button>
              </div>

              <label className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground ml-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeFinancing}
                  onChange={(e) => setIncludeFinancing(e.target.checked)}
                  className="accent-primary"
                />
                Include 0% financing block
              </label>
            </div>

            {/* Body: 2 columns */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
              {/* LEFT: picker / preview */}
              <div className="lg:col-span-7 overflow-y-auto p-6 border-r border-border/40">
                {!showPreview ? (
                  <>
                    {/* Their message */}
                    {(submission.message || submission.details) && (
                      <div className="bg-muted/40 border border-border/40 rounded-xl p-4 mb-5">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">What they said</p>
                        <p className="text-sm text-foreground italic leading-relaxed">
                          "{submission.message || submission.details}"
                        </p>
                        {detectInterestType(submission).length > 0 && (
                          <p className="text-[11px] text-primary mt-2">
                            Detected interest: {detectInterestType(submission).join(", ")}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Suggested */}
                    {suggested.length > 0 && (
                      <>
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles className="w-3.5 h-3.5 text-primary" />
                          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold">
                            Suggested matches
                          </p>
                          <span className="text-[10px] text-muted-foreground">({suggested.length})</span>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3 mb-6">
                          {suggested.slice(0, 6).map((l) => (
                            <ListingCard
                              key={l.id}
                              listing={l}
                              selected={selectedIds.includes(l.id)}
                              onToggle={() => toggle(l.id)}
                              highlighted={norm(l.cemetery) === norm(submission.cemetery)}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    {/* Browse all */}
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                        Browse all listings
                      </p>
                      <p className="text-[10px] text-muted-foreground">{filteredAll.length} total</p>
                    </div>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search cemetery, city, plot type…"
                        className="w-full h-9 pl-8 pr-3 rounded-lg bg-background border border-border/60 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {filteredAll.slice(0, 30).map((l) => (
                        <ListingCard
                          key={l.id}
                          listing={l}
                          selected={selectedIds.includes(l.id)}
                          onToggle={() => toggle(l.id)}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="bg-muted/30 rounded-lg p-5 border border-border/40 font-mono text-[12px] leading-relaxed text-foreground whitespace-pre-wrap">
                    <p className="font-semibold text-foreground/70 mb-2">Subject: {subject}</p>
                    <div className="border-t border-border/40 pt-3">{body}</div>
                  </div>
                )}
              </div>

              {/* RIGHT: editor + selected */}
              <div className="lg:col-span-5 overflow-y-auto p-6 space-y-5 bg-background/30">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-2">
                    Selected for email ({selected.length})
                  </p>
                  {selected.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      {blankMode ? "Optionally add listings, or send an empty body." : "Pick at least one listing on the left."}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selected.map((l) => (
                        <div key={l.id} className="flex items-center gap-2 text-xs bg-muted/40 rounded-lg p-2 border border-border/40">
                          <img src={getPlotImage(l.plot_type, l.spaces)} alt="" className="w-8 h-8 rounded object-cover bg-card" />
                          <div className="flex-1 min-w-0">
                            <p className="text-foreground font-medium truncate">{l.cemetery}</p>
                            <p className="text-muted-foreground truncate">{l.plot_type} · {formatMoney(l.asking_price)}</p>
                          </div>
                          <button
                            onClick={() => toggle(l.id)}
                            className="text-muted-foreground hover:text-destructive p-1"
                            aria-label="Remove"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-2 block">
                    Intro <span className="normal-case tracking-normal text-muted-foreground/60">— leave blank for default</span>
                  </label>
                  <textarea
                    value={intro}
                    onChange={(e) => setIntro(e.target.value)}
                    rows={3}
                    placeholder="Thank you for reaching out…"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border/60 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-2 block">
                    Closing <span className="normal-case tracking-normal text-muted-foreground/60">— leave blank for default</span>
                  </label>
                  <textarea
                    value={closing}
                    onChange={(e) => setClosing(e.target.value)}
                    rows={3}
                    placeholder="If any of these interest you…"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border/60 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border/40 p-4 flex items-center justify-between gap-3">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <Eye className="w-3.5 h-3.5" />
                {showPreview ? "Back to picker" : "Preview email"}
              </button>
              <button
                onClick={handleSendMailto}
                disabled={!submission.email || (!blankMode && selected.length === 0)}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                title={!submission.email ? "No email on file" : !selected.length && !blankMode ? "Select at least one listing" : ""}
              >
                <Mail className="w-3.5 h-3.5" /> Open in email
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ---------- Listing card ----------
const ListingCard = ({
  listing,
  selected,
  onToggle,
  highlighted,
}: {
  listing: AdminListing;
  selected: boolean;
  onToggle: () => void;
  highlighted?: boolean;
}) => {
  const photo = listing.photos && listing.photos.length > 0 ? listing.photos[0] : null;
  const fallback = getPlotImage(listing.plot_type, listing.spaces);
  const cemImg = getCemeteryImage(listing.cemetery);

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`group relative text-left rounded-xl border overflow-hidden transition-all bg-card ${
        selected
          ? "border-primary shadow-soft ring-2 ring-primary/20"
          : highlighted
          ? "border-primary/40 hover:border-primary/60"
          : "border-border/50 hover:border-border"
      }`}
    >
      <div className="relative h-24 bg-muted overflow-hidden">
        <img
          src={photo || fallback}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = cemImg;
          }}
        />
        {selected && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow">
            <Check className="w-3.5 h-3.5" strokeWidth={3} />
          </div>
        )}
        {!selected && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-card/90 border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            <Plus className="w-3.5 h-3.5 text-foreground" />
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-[12px] font-medium text-foreground truncate leading-tight">{listing.cemetery}</p>
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
          {listing.plot_type}{listing.spaces > 1 ? ` · ${listing.spaces} sp` : ""}
          {listing.section ? ` · ${listing.section}` : ""}
        </p>
        <p className="text-[11px] text-foreground font-semibold mt-1">{formatMoney(listing.asking_price)}</p>
      </div>
    </button>
  );
};

export default SendBuyerQuoteDialog;
