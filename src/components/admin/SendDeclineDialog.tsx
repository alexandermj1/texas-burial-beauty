import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Eye, AlertCircle, FileText } from "lucide-react";
import type { Submission } from "./SubmissionsPanel";
import { useActiveListings } from "@/hooks/useActiveListings";

interface Props {
  submission: Submission;
  open: boolean;
  onClose: () => void;
}

const PHONE = "(424) 234-1678";
const WEBSITE = "TexasCemeteryBrokers.com";

type Reason = "outside_area" | "no_inventory" | "not_our_service" | "ownership_unclear" | "custom";

const REASON_META: Record<Reason, { label: string; flag: string; tone: string }> = {
  outside_area: {
    label: "Outside our service area",
    flag: "Cemetery is outside Texas — we only operate in Texas.",
    tone:
      "Unfortunately, the property you mentioned falls outside our current Texas service area. We focus exclusively on Texas cemeteries so we can give every client the highest level of attention and accurate, locally-informed valuations.",
  },
  no_inventory: {
    label: "No matching inventory",
    flag: "We don't currently have listings that match what they're looking for.",
    tone:
      "Right now we don't have inventory that matches exactly what you described. The Texas cemetery resale market moves quickly, so this can change week to week — we'd be glad to keep your details on file and reach out the moment something suitable comes available.",
  },
  not_our_service: {
    label: "Not a service we offer",
    flag: "Request is for a service we don't provide (e.g. funeral arrangements, monuments).",
    tone:
      "What you're looking for falls outside the services we offer. We specialize specifically in the resale of cemetery interment property — buying and selling existing plots, niches, and crypts — rather than the broader funeral or memorial services side of the industry.",
  },
  ownership_unclear: {
    label: "Ownership / deed unclear",
    flag: "Seller cannot confirm ownership or has no deed.",
    tone:
      "Before we can move forward with listing a property, we need to be able to verify clear ownership and have a copy of the deed or certificate of ownership on file. Once you're able to locate that documentation we'd be happy to take another look.",
  },
  custom: {
    label: "Custom reason",
    flag: "Write your own.",
    tone: "",
  },
};

// ---------- Auto-flag detection ----------
interface Flag {
  reason: Reason;
  confidence: "high" | "medium";
  evidence: string;
}

const detectFlag = (s: Submission, hasInventory: boolean): Flag | null => {
  const text = `${s.cemetery || ""} ${s.message || ""} ${s.details || ""} ${s.region || ""}`.toLowerCase();

  // Outside Texas?
  const nonTexasStates = [
    "california", "florida", "new york", "arizona", "nevada", "oregon", "washington",
    "colorado", "georgia", "alabama", "louisiana", "oklahoma", "new mexico", "kansas",
    "missouri", "arkansas", "tennessee", "north carolina", "south carolina", "ohio",
    "michigan", "illinois", "pennsylvania", "virginia", "maryland", "massachusetts",
  ];
  const matchedState = nonTexasStates.find((st) => text.includes(st));
  if (matchedState) {
    return {
      reason: "outside_area",
      confidence: "high",
      evidence: `Mentions "${matchedState}" — appears to be outside Texas.`,
    };
  }

  // No deed / ownership signals
  if (text.includes("no deed") || text.includes("can't find") || text.includes("cant find") || text.includes("lost the deed") || text.includes("not sure if i own") || text.includes("inherited but")) {
    return {
      reason: "ownership_unclear",
      confidence: "high",
      evidence: "Message suggests deed or ownership documentation is missing.",
    };
  }

  // Out-of-scope services
  if (text.includes("monument") || text.includes("headstone") || text.includes("funeral home") || text.includes("cremation service") || text.includes("memorial service") || text.includes("urn purchase")) {
    return {
      reason: "not_our_service",
      confidence: "high",
      evidence: "Mentions a service outside our scope (monuments, funeral, etc.).",
    };
  }

  // No inventory at requested cemetery (only relevant for buyer-side requests)
  if (s.source !== "seller_quote" && s.cemetery && !hasInventory) {
    return {
      reason: "no_inventory",
      confidence: "medium",
      evidence: `We have no active listings at ${s.cemetery} right now.`,
    };
  }

  return null;
};

// ---------- Email composition ----------
const buildSubject = (s: Submission) => {
  if (s.source === "seller_quote") return "Regarding your property — Texas Cemetery Brokers";
  return "Following up on your inquiry — Texas Cemetery Brokers";
};

const buildBody = (s: Submission, reason: Reason, customBody: string, alternative: string) => {
  const name = s.name || "there";
  const meta = REASON_META[reason];

  if (reason === "custom") {
    return customBody.trim() || `Dear ${name},\n\n[Write your message here]\n\nSincerely,\nThe Team at Texas Cemetery Brokers\n${PHONE}\n${WEBSITE}`;
  }

  const altLine = alternative.trim()
    ? `\n${alternative.trim()}\n`
    : reason === "no_inventory"
    ? `\nIf you'd like, we can keep an eye out and reach out the moment a comparable property becomes available — just reply with a yes and we'll add you to our watchlist.\n`
    : reason === "outside_area"
    ? `\nIf you have any cemetery property within Texas you'd like us to look at, we'd be happy to help with that.\n`
    : "";

  return `Dear ${name},

Thank you so much for reaching out to Texas Cemetery Brokers — we genuinely appreciate you considering us.

${meta.tone}
${altLine}
Please don't hesitate to get back in touch if anything changes, or if there's anything else we can point you toward. We wish you all the best.

Warm regards,
The Team at Texas Cemetery Brokers
${PHONE}
${WEBSITE}`;
};

// ---------- Component ----------
const SendDeclineDialog = ({ submission, open, onClose }: Props) => {
  const { countFor } = useActiveListings();
  const hasInventory = countFor(submission.cemetery) > 0;

  const autoFlag = useMemo(
    () => detectFlag(submission, hasInventory),
    [submission, hasInventory],
  );

  const [reason, setReason] = useState<Reason>("outside_area");
  const [alternative, setAlternative] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (open) {
      setReason(autoFlag?.reason || "outside_area");
      setAlternative("");
      setCustomBody("");
      setShowPreview(false);
    }
  }, [open, autoFlag]);

  const subject = buildSubject(submission);
  const body = buildBody(submission, reason, customBody, alternative);

  const handleSendMailto = () => {
    if (!submission.email) return;
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
            className="bg-card rounded-2xl shadow-hover border border-border/50 w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-border/40">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold mb-1">
                  Polite Decline
                </p>
                <h3 className="font-display text-xl text-foreground truncate">
                  {submission.name || "Anonymous"}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {submission.email || "No email on file"}
                </p>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Auto-flag */}
            {autoFlag && (
              <div className="mx-6 mt-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                    Auto-flagged: {REASON_META[autoFlag.reason].label}
                  </p>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-200/70 mt-0.5">
                    {autoFlag.evidence}
                  </p>
                </div>
              </div>
            )}

            {/* Their message */}
            {(submission.message || submission.details) && (
              <div className="mx-6 mt-3 bg-muted/40 border border-border/40 rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">What they said</p>
                <p className="text-xs text-foreground italic line-clamp-4">
                  "{submission.message || submission.details}"
                </p>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {!showPreview ? (
                <>
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-2 block">
                      Reason
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(Object.keys(REASON_META) as Reason[]).map((r) => (
                        <button
                          key={r}
                          onClick={() => setReason(r)}
                          className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                            reason === r
                              ? "border-primary bg-primary/5 text-foreground"
                              : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <p className="font-medium flex items-center gap-1.5">
                            {r === "custom" && <FileText className="w-3 h-3" />}
                            {REASON_META[r].label}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                            {REASON_META[r].flag}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {reason === "custom" ? (
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-2 block">
                        Full email body
                      </label>
                      <textarea
                        value={customBody}
                        onChange={(e) => setCustomBody(e.target.value)}
                        rows={10}
                        placeholder={`Dear ${submission.name || "there"},\n\n…\n\nSincerely,\nThe Team at Texas Cemetery Brokers`}
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border/60 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none font-mono"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-2 block">
                        Alternative offer <span className="normal-case tracking-normal text-muted-foreground/60">— optional, replaces the default suggestion</span>
                      </label>
                      <textarea
                        value={alternative}
                        onChange={(e) => setAlternative(e.target.value)}
                        rows={3}
                        placeholder="e.g. We do have something similar at a nearby cemetery — would you like us to send those over?"
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border/60 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-muted/30 rounded-lg p-5 border border-border/40 font-mono text-[12px] leading-relaxed text-foreground whitespace-pre-wrap">
                  <p className="font-semibold text-foreground/70 mb-2">Subject: {subject}</p>
                  <div className="border-t border-border/40 pt-3">{body}</div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border/40 p-4 flex items-center justify-between gap-3">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <Eye className="w-3.5 h-3.5" />
                {showPreview ? "Edit" : "Preview email"}
              </button>
              <button
                onClick={handleSendMailto}
                disabled={!submission.email}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
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

export default SendDeclineDialog;
