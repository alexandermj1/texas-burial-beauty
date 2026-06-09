import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Eye, Plus, Trash2, Copy, Check, Pencil } from "lucide-react";
import type { Submission } from "./SubmissionsPanel";
import { toast } from "@/hooks/use-toast";

interface Props {
  submission: Submission;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, patch: Partial<Submission>) => Promise<void>;
}

const PHONE = "(310) 804-9586";
const WEBSITE = "TexasCemeteryBrokers.com";

interface Plot {
  id: string;
  description: string;
  amount: string;
}

const formatMoney = (v: string | number | null | undefined) => {
  if (v === null || v === undefined || v === "") return "";
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.]/g, ""));
  if (!isFinite(n)) return "";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2, minimumFractionDigits: 2 });
};

const buildLocation = (s: Submission) => {
  const city = (s as any).city as string | null | undefined;
  const state = (s as any).state as string | null | undefined;
  const tail = [city, state || "TX"].filter(Boolean).join(", ");
  return s.cemetery ? (tail ? `${s.cemetery}, ${tail}` : s.cemetery) : "your cemetery";
};

const buildPropertyDescriptor = (s: Submission) => {
  const parts: string[] = [];
  if (s.section) parts.push(`Section ${s.section}`);
  if (s.property_type) parts.push(s.property_type);
  if (s.spaces) parts.push(`${s.spaces} space${Number(s.spaces) > 1 ? "s" : ""}`);
  return parts.join(", ");
};

const buildInitialPlotDescription = (s: Submission) => {
  const loc = buildLocation(s);
  const desc = buildPropertyDescriptor(s);
  return desc ? `${loc}; ${desc}` : loc;
};

const buildSubject = (s: Submission) =>
  `Your Net Payment Offer from Texas Cemetery Brokers${s.cemetery ? ` – ${s.cemetery}` : ""}`;

const buildBody = (s: Submission, plots: Plot[], totalOverride: string, feeCap: string, customMessage: string) => {
  const sellerName = s.name || "there";
  const cemeteryName = s.cemetery || "your cemetery";
  const feeCapAmount = formatMoney(feeCap) || "[Transfer Fee Cap]";

  const validPlots = plots.filter((p) => p.description.trim() || p.amount);
  const sumPlots = plots.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const totalNum = totalOverride ? Number(totalOverride) : sumPlots;
  const totalFmt = formatMoney(totalNum) || "[Net Payment Amount]";

  let propertyIntro: string;
  let breakdownBlock = "";
  if (validPlots.length <= 1) {
    const single = validPlots[0]?.description.trim() || buildInitialPlotDescription(s);
    propertyIntro = `your interment property at ${single}`;
  } else {
    propertyIntro = `your interment properties at ${cemeteryName}, listed below`;
    breakdownBlock =
      "\nProperty Breakdown:\n" +
      validPlots
        .map((p, i) => {
          const line = p.description.trim() || `Plot ${i + 1}`;
          const amt = p.amount ? formatMoney(p.amount) : "[Amount]";
          return `${i + 1}. ${line} — ${amt}`;
        })
        .join("\n") +
      "\n";
  }

  const customBlock = customMessage.trim() ? `\n${customMessage.trim()}\n` : "";

  return `Dear ${sellerName},

Thank you for considering Texas Cemetery Brokers for the sale of ${propertyIntro}.

We understand that selling cemetery property is a unique and specialized process and navigating the market can be complex. After a thorough evaluation of your specific propert${validPlots.length > 1 ? "ies" : "y"}, considering ${validPlots.length > 1 ? "their" : "its"} features, current resale market conditions, and recent comparable sales at ${cemeteryName}, we are pleased to present you with a transparent offer.

This offer is based on our industry-leading commitment to providing you with a predictable return and complete peace of mind. Our goal is to provide a realistic quote that actually gets your property sold.
${customBlock}
Your Final Net Payment Offer Explained:

When your property sells through us, we cover all selling expenses, including the significant cemetery-imposed costs at ${cemeteryName} (e.g., the transfer fee and mandatory endowment care upgrades) up to ${feeCapAmount} per plot.

These fees are a necessary and considerable part of every cemetery property sale at ${cemeteryName}, that must be factored into any accurate quote.

After we find a buyer${validPlots.length > 1 ? "(s)" : ""}, we cover all of these costs, and you will receive:
${breakdownBlock}
Total Final Net Payment: ${totalFmt}

While it's natural to compare our valuations to retail list prices or asking amounts from private sellers, our quote reflects the realistic, current market value of your property based on deep industry knowledge. We understand the influence of factors like significant cemetery-imposed costs, the large inventory available in the resale market, and the highly exacting, price-sensitive nature of buyers. The resale market is highly competitive, and finding a buyer is extremely unlikely unless plots are priced correctly. Our goal is to provide a realistic valuation and achieve a successful sale on your behalf.

To begin the process, we offer flexible listing options designed to suit your preferences:

• Starter — $0 Upfront. Pay only if your plot sells, with a broker service fee due at close. An early cancellation fee applies if withdrawn within 36 months.
• Pro — $299 One-Time Upfront Fee (Most Popular). Prepaid listing fee with no additional fees when your plot sells. Cancel anytime at no charge.
• Custom Plus — $999 One-Time Upfront Fee. Maximum visibility with no additional fees due when your plot sells.

Unlike classified listing sites and other brokers who charge upfront fees regardless of a sale, we offer a zero-cost listing option, requiring no monetary outlay by you and providing true financial flexibility.

Choosing Texas Cemetery Brokers means choosing a partner committed to your success. We operate in partnership with Bayer Cemetery Brokers — a licensed California brokerage (CEB 1512) — ensuring your transaction is secure and compliant.

This offer is valid for 3 days and contingent on verification. We reserve the right to revalue if ownership or property details differ from those provided.

Next Steps:

1. Review Our Offer: Take some time to consider the net payment amount and our unique value proposition.
2. Pick Your Listing Option: Review the Starter, Pro, and Custom Plus options and decide which best suits your needs.
3. Discuss Any Questions: We are here to answer any questions you may have about this offer, the market, or our process. Please reply to this email or call us directly at ${PHONE} to discuss.
4. Confirm Your Acceptance: To accept this offer please reply to this email or telephone our office. We will promptly send you an Exclusive Sales Agreement for your signature and guide you through the next steps to list your plot.

We look forward to helping you sell your property efficiently and with ease.

Sincerely,
The Team at Texas Cemetery Brokers
${PHONE}
${WEBSITE}`;
};

const newPlot = (description = "", amount = ""): Plot => ({
  id: Math.random().toString(36).slice(2),
  description,
  amount,
});

const TexasQuoteDialog = ({ submission, open, onClose, onSave }: Props) => {
  const [plots, setPlots] = useState<Plot[]>([newPlot()]);
  const [totalOverride, setTotalOverride] = useState("");
  const [feeCap, setFeeCap] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [editingBody, setEditingBody] = useState(false);
  const [editedBody, setEditedBody] = useState("");
  const [editedSubject, setEditedSubject] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<"none" | "body" | "subject">("none");

  useEffect(() => {
    if (open) {
      setPlots([newPlot(buildInitialPlotDescription(submission), submission.quote_amount ? String(submission.quote_amount) : "")]);
      setTotalOverride("");
      setFeeCap(submission.transfer_fee_amount != null ? String(submission.transfer_fee_amount) : "350");
      setCustomMessage(submission.quote_message || "");
      setShowPreview(false);
      setEditingBody(false);
      setEditedBody("");
      setEditedSubject("");
      setCopied("none");
    }
  }, [open, submission]);

  const subject = useMemo(() => buildSubject(submission), [submission]);
  const generatedBody = useMemo(
    () => buildBody(submission, plots, totalOverride, feeCap, customMessage),
    [submission, plots, totalOverride, feeCap, customMessage]
  );

  const currentBody = editingBody ? editedBody : generatedBody;
  const currentSubject = editingBody && editedSubject ? editedSubject : subject;

  const sumPlots = plots.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const totalForSave = totalOverride ? Number(totalOverride) : sumPlots;

  const startEditing = () => {
    setEditedBody(generatedBody);
    setEditedSubject(subject);
    setEditingBody(true);
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    await onSave(submission.id, {
      quote_amount: totalForSave > 0 ? totalForSave : null,
      transfer_fee_amount: feeCap ? Number(feeCap) : null,
      quote_message: customMessage || null,
    } as any);
    setSaving(false);
    toast({ title: "Draft saved" });
  };

  const handleMarkSent = async () => {
    setSaving(true);
    await onSave(submission.id, {
      quote_amount: totalForSave > 0 ? totalForSave : null,
      transfer_fee_amount: feeCap ? Number(feeCap) : null,
      quote_message: customMessage || null,
      quote_sent_at: new Date().toISOString(),
    } as any);
    setSaving(false);
    onClose();
  };

  const copy = async (kind: "body" | "subject") => {
    try {
      await navigator.clipboard.writeText(kind === "body" ? currentBody : currentSubject);
      setCopied(kind);
      setTimeout(() => setCopied("none"), 1500);
    } catch {
      toast({ title: "Copy failed", description: "Select the text and copy manually." });
    }
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
            className="bg-card rounded-2xl shadow-hover border border-border/50 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-start justify-between p-6 border-b border-border/40">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold mb-1">
                  Texas Net Payment Offer
                </p>
                <h3 className="font-display text-xl text-foreground">
                  {submission.name || "Anonymous"}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {submission.email || "No email on file"} · {submission.cemetery || "—"}
                </p>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {!showPreview ? (
                <>
                  {/* Plots */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
                        Plot{plots.length > 1 ? "s" : ""} & per-plot net payment
                      </label>
                      <button
                        onClick={() => setPlots((ps) => [...ps, newPlot()])}
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:opacity-80"
                      >
                        <Plus className="w-3 h-3" /> Add plot
                      </button>
                    </div>
                    <div className="space-y-2">
                      {plots.map((p, i) => (
                        <div key={p.id} className="flex items-start gap-2">
                          <div className="flex-1 grid grid-cols-[1fr_140px] gap-2">
                            <input
                              type="text"
                              value={p.description}
                              onChange={(e) => setPlots((ps) => ps.map((x) => x.id === p.id ? { ...x, description: e.target.value } : x))}
                              placeholder={`Plot ${i + 1} description (cemetery, section, type, space #)`}
                              className="h-10 px-3 rounded-lg bg-background border border-border/60 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
                            />
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                              <input
                                type="number"
                                value={p.amount}
                                onChange={(e) => setPlots((ps) => ps.map((x) => x.id === p.id ? { ...x, amount: e.target.value } : x))}
                                placeholder="0"
                                className="w-full h-10 pl-7 pr-3 rounded-lg bg-background border border-border/60 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
                              />
                            </div>
                          </div>
                          {plots.length > 1 && (
                            <button
                              onClick={() => setPlots((ps) => ps.filter((x) => x.id !== p.id))}
                              className="h-10 w-10 inline-flex items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-destructive hover:border-destructive/40"
                              title="Remove plot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Sum of plots: <span className="text-foreground font-medium">{formatMoney(sumPlots) || "$0.00"}</span>
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-2 block">
                        Total override (optional)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <input
                          type="number"
                          value={totalOverride}
                          onChange={(e) => setTotalOverride(e.target.value)}
                          placeholder="Defaults to sum above"
                          className="w-full h-11 pl-7 pr-3 rounded-lg bg-background border border-border/60 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-2 block">
                        Transfer fee cap per plot (USD)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <input
                          type="number"
                          value={feeCap}
                          onChange={(e) => setFeeCap(e.target.value)}
                          placeholder="e.g. 350"
                          className="w-full h-11 pl-7 pr-3 rounded-lg bg-background border border-border/60 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-2 block">
                      Custom note <span className="normal-case tracking-normal text-muted-foreground/60">— inserted under the offer intro</span>
                    </label>
                    <textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Optional. Anything you want to add for this seller specifically."
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border/60 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 resize-none"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">Subject</span>
                      {editingBody ? (
                        <input
                          value={editedSubject}
                          onChange={(e) => setEditedSubject(e.target.value)}
                          className="flex-1 h-8 px-2 rounded bg-background border border-border/60 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      ) : (
                        <span className="text-xs text-foreground truncate">{currentSubject}</span>
                      )}
                    </div>
                    <button
                      onClick={() => copy("subject")}
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground shrink-0"
                    >
                      {copied === "subject" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Subject
                    </button>
                  </div>

                  {editingBody ? (
                    <textarea
                      value={editedBody}
                      onChange={(e) => setEditedBody(e.target.value)}
                      rows={22}
                      className="w-full font-mono text-[12px] leading-relaxed p-4 rounded-lg bg-background border border-border/60 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 resize-y"
                    />
                  ) : (
                    <div className="bg-muted/30 rounded-lg p-5 border border-border/40 font-mono text-[12px] leading-relaxed text-foreground whitespace-pre-wrap">
                      {currentBody}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => editingBody ? setEditingBody(false) : startEditing()}
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      {editingBody ? "Done editing" : "Edit email"}
                    </button>
                    <button
                      onClick={() => copy("body")}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border text-foreground hover:bg-muted/50"
                    >
                      {copied === "body" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied === "body" ? "Copied" : "Copy email body"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border/40 p-4 flex items-center justify-between gap-3">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                {showPreview ? "Edit quote details" : "Preview email"}
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium border border-border text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" /> Save draft
                </button>
                <button
                  onClick={handleMarkSent}
                  disabled={saving || totalForSave <= 0}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                  title={totalForSave <= 0 ? "Enter at least one plot amount" : "Mark this quote as sent and advance pipeline"}
                >
                  <Check className="w-3.5 h-3.5" /> Mark quote sent
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TexasQuoteDialog;
