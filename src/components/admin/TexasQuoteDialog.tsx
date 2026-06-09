import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Save, Eye } from "lucide-react";
import type { Submission } from "./SubmissionsPanel";

interface Props {
  submission: Submission;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, patch: Partial<Submission>) => Promise<void>;
}

const PHONE = "(310) 804-9586";
const WEBSITE = "TexasCemeteryBrokers.com";

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

const buildFullProperty = (s: Submission) => {
  const loc = buildLocation(s);
  const desc = buildPropertyDescriptor(s);
  return desc ? `${loc}; ${desc}` : loc;
};

const buildSubject = (s: Submission) => {
  const bits: string[] = [];
  if (s.cemetery) bits.push(s.cemetery);
  if (s.section) bits.push(`Section ${s.section}`);
  if (s.property_type) bits.push(s.property_type);
  const tail = bits.length ? ` – ${bits.join(", ")}` : "";
  return `Your Net Payment Offer from Texas Cemetery Brokers${tail}`;
};

const buildBody = (s: Submission, quote: string, feeCap: string, customMessage: string) => {
  const sellerName = s.name || "there";
  const fullProperty = buildFullProperty(s);
  const cemeteryName = s.cemetery || "your cemetery";
  const quoteAmount = formatMoney(quote) || "[Net Payment Amount]";
  const feeCapAmount = formatMoney(feeCap) || "[Transfer Fee Cap]";

  const customBlock = customMessage.trim() ? `\n${customMessage.trim()}\n` : "";

  return `Dear ${sellerName},

Thank you for considering Texas Cemetery Brokers for the sale of your interment property at ${fullProperty}.

We understand that selling cemetery property is a unique and specialized process and navigating the market can be complex. After a thorough evaluation of your specific property, considering its features, current resale market conditions, and recent comparable sales at ${cemeteryName}, we are pleased to present you with a transparent offer.

This offer is based on our industry-leading commitment to providing you with a predictable return and complete peace of mind. Our goal is to provide a realistic quote that actually gets your property sold.
${customBlock}
Your Final Net Payment Offer Explained:

When your property sells through us, we cover all selling expenses, including the significant cemetery-imposed costs at ${cemeteryName} (e.g., the transfer fee and mandatory endowment care upgrades) up to ${feeCapAmount}.

These fees are a necessary and considerable part of every cemetery property sale at ${cemeteryName}, that must be factored into any accurate quote.

After we find a buyer, we cover all of these costs, and you will receive:

Total Final Net Payment: ${quoteAmount}

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

const TexasQuoteDialog = ({ submission, open, onClose, onSave }: Props) => {
  const [quote, setQuote] = useState("");
  const [feeCap, setFeeCap] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setQuote(submission.quote_amount ? String(submission.quote_amount) : "");
      setFeeCap(submission.transfer_fee_amount != null ? String(submission.transfer_fee_amount) : "350");
      setCustomMessage(submission.quote_message || "");
      setShowPreview(false);
    }
  }, [open, submission]);

  const subject = buildSubject(submission);
  const body = buildBody(submission, quote, feeCap, customMessage);

  const handleSaveAndOpenEmail = async () => {
    setSaving(true);
    await onSave(submission.id, {
      quote_amount: quote ? Number(quote) : null,
      transfer_fee_amount: feeCap ? Number(feeCap) : null,
      quote_message: customMessage || null,
      quote_sent_at: new Date().toISOString(),
    } as any);
    setSaving(false);
    if (submission.email) {
      const mailto = `mailto:${submission.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;
    }
    onClose();
  };

  const handleSaveOnly = async () => {
    setSaving(true);
    await onSave(submission.id, {
      quote_amount: quote ? Number(quote) : null,
      transfer_fee_amount: feeCap ? Number(feeCap) : null,
      quote_message: customMessage || null,
    } as any);
    setSaving(false);
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
                  {submission.email || "No email on file"} · {buildFullProperty(submission)}
                </p>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {!showPreview ? (
                <>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-2 block">
                        Total Final Net Payment (USD)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <input
                          type="number"
                          value={quote}
                          onChange={(e) => setQuote(e.target.value)}
                          placeholder="e.g. 6525"
                          className="w-full h-11 pl-7 pr-3 rounded-lg bg-background border border-border/60 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
                        />
                      </div>
                      {quote && (
                        <p className="text-[11px] text-muted-foreground mt-1.5">
                          Will appear as <span className="text-foreground font-medium">{formatMoney(quote)}</span>
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-2 block">
                        Transfer fee cap covered (USD)
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

                  <div className="bg-muted/40 rounded-lg p-4 border border-border/40">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Property the seller submitted</p>
                    <p className="text-sm text-foreground">{buildFullProperty(submission)}</p>
                    {submission.details && (
                      <p className="text-xs text-muted-foreground mt-2 italic line-clamp-3">"{submission.details}"</p>
                    )}
                  </div>

                  {submission.quote_sent_at && (
                    <div className="text-[11px] text-muted-foreground bg-primary/5 border border-primary/10 rounded-lg p-3">
                      A quote was previously sent on{" "}
                      <span className="text-foreground font-medium">
                        {new Date(submission.quote_sent_at).toLocaleString("en-US", {
                          month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
                        })}
                      </span>
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

            <div className="border-t border-border/40 p-4 flex items-center justify-between gap-3">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                {showPreview ? "Edit quote" : "Preview email"}
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveOnly}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium border border-border text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" /> Save draft
                </button>
                <button
                  onClick={handleSaveAndOpenEmail}
                  disabled={saving || !quote || !submission.email}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                  title={!submission.email ? "No email on file" : !quote ? "Enter net payment amount first" : ""}
                >
                  <Mail className="w-3.5 h-3.5" /> Save & open in email
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
