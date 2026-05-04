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

const PHONE = "(424) 234-1678";
const WEBSITE = "TexasCemeteryBrokers.com";

const formatMoney = (v: string | number | null | undefined) => {
  if (v === null || v === undefined || v === "") return "";
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.]/g, ""));
  if (!isFinite(n)) return "";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
};

const buildPropertyDescriptor = (s: Submission) => {
  const parts: string[] = [];
  if (s.cemetery) parts.push(s.cemetery);
  if (s.section) parts.push(`Section ${s.section}`);
  if (s.property_type) parts.push(s.property_type);
  if (s.spaces) parts.push(`${s.spaces} space${Number(s.spaces) > 1 ? "s" : ""}`);
  return parts.join(", ") || "your property";
};

const buildSubject = (s: Submission) => {
  const bits: string[] = [];
  if (s.cemetery) bits.push(s.cemetery);
  if (s.section) bits.push(`Section ${s.section}`);
  if (s.property_type) bits.push(s.property_type);
  const tail = bits.length ? ` – ${bits.join(", ")}` : "";
  return `Offer to List Your Cemetery Property with Texas Cemetery Brokers${tail}`;
};

const buildBody = (s: Submission, quote: string, transferFee: string, customMessage: string) => {
  const sellerName = s.name || "there";
  const propertyDesc = buildPropertyDescriptor(s);
  const quoteAmount = formatMoney(quote) || "[Quote Amount]";
  const transferFeeAmount = formatMoney(transferFee) || "[Transfer Fee Amount]";

  const customBlock = customMessage.trim()
    ? `\n${customMessage.trim()}\n`
    : "";

  return `Dear ${sellerName},

Thank you for considering Texas Cemetery Brokers for the sale of your interment property at ${propertyDesc}. We understand that selling cemetery property is a unique and often specialized process, and navigating the market for cemetery plots can be complex.

After a thorough evaluation of your specific property, considering its features, current market conditions, and recent comparable sales, we are pleased to offer you a guaranteed net proceeds amount of ${quoteAmount}.
${customBlock}
We offer the following DOUBLE GUARANTEE, designed to provide you with certainty and peace of mind:

1) Your Net Proceeds Guarantee: When your property sells through us, you are guaranteed to receive this exact ${quoteAmount}. This is the precise amount you will walk away with, free and clear, after all selling expenses — including our commission and the cemetery's transfer fee — have been accounted for.

2) Transfer Fee Coverage Guarantee: We also guarantee to cover the cemetery's transfer fee up to the current prevailing rate of ${transferFeeAmount}. The ${quoteAmount} guaranteed net proceeds amount above is already net of this transfer fee.

To begin the process, we offer flexible listing options designed to suit your preferences:

• Starter — $0 Upfront. Pay only if your plot sells, with a broker service fee due at close. An early cancellation fee applies if withdrawn within 36 months.
• Pro — $299 One-Time Upfront Fee (Most Popular). Prepaid listing fee with no additional fees when your plot sells. Cancel anytime at no charge.
• Custom Plus — $999 One-Time Upfront Fee. Maximum visibility with no additional fees due when your plot sells.

Our offer is rooted in 27 years of unparalleled expertise in the cemetery property resale market. Unlike general listing sites that may charge upfront fees regardless of a sale, we offer a zero-cost upfront listing option, providing true peace of mind. We are licensed and bonded, ensuring your transaction is secure and compliant.

While it's natural to compare to original purchase prices or retail listings from cemeteries, our valuations reflect the realistic, current market value based on deep industry knowledge. We understand the influence of factors like significant cemetery transfer fees, the large inventory available in the resale market, and the highly exacting and price-sensitive nature of buyers.

Choosing Texas Cemetery Brokers means choosing a partner committed to your success and security. We are the only broker that provides in-person showings of plots, with over 40 licensed cemetery salespeople actively showing properties — a crucial advantage in connecting with buyers. We manage the entire sales process from start to finish, eliminating complexities and hassles for you.

Our commitment to client satisfaction is reflected in our 4.8-star Google rating and thousands of testimonials from satisfied clients.

This offer for your property is valid for 14 days from the date of this email.

Next Steps:
1. Review our offer and the guaranteed net proceeds amount.
2. Pick your listing option (Starter, Pro, or Custom Plus).
3. Reply to this email or call us at ${PHONE} with any questions.
4. Confirm your acceptance and we'll send the complete Listing Agreement.

We look forward to helping you sell your property efficiently and with complete transparency.

Sincerely,
The Team at Texas Cemetery Brokers
${PHONE}
${WEBSITE}`;
};

const SendQuoteDialog = ({ submission, open, onClose, onSave }: Props) => {
  const [quote, setQuote] = useState("");
  const [transferFee, setTransferFee] = useState("");
  const [retail, setRetail] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      // Auto-populate from the Stage 1 intake fields (cemetery_retail /
      // transfer_fee_amount) so the admin doesn't have to retype them.
      const intakeRetail = (submission as any).cemetery_retail;
      setQuote(submission.quote_amount ? String(submission.quote_amount) : "");
      setTransferFee(submission.transfer_fee_amount != null ? String(submission.transfer_fee_amount) : "");
      setRetail(intakeRetail != null ? String(intakeRetail) : "");
      setCustomMessage(submission.quote_message || "");
      setShowPreview(false);
    }
  }, [open, submission]);

  const subject = buildSubject(submission);
  const body = buildBody(submission, quote, transferFee, customMessage);

  const handleSaveAndOpenEmail = async () => {
    setSaving(true);
    await onSave(submission.id, {
      quote_amount: quote ? Number(quote) : null,
      transfer_fee_amount: transferFee ? Number(transferFee) : null,
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
      transfer_fee_amount: transferFee ? Number(transferFee) : null,
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
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-border/40">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold mb-1">
                  Send Guaranteed Quote
                </p>
                <h3 className="font-display text-xl text-foreground">
                  {submission.name || "Anonymous"}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {submission.email || "No email on file"} · {buildPropertyDescriptor(submission)}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {!showPreview ? (
                <>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-2 block">
                        Guaranteed net proceeds (USD)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <input
                          type="number"
                          value={quote}
                          onChange={(e) => setQuote(e.target.value)}
                          placeholder="e.g. 4500"
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
                        Transfer fee covered (USD)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <input
                          type="number"
                          value={transferFee}
                          onChange={(e) => setTransferFee(e.target.value)}
                          placeholder="e.g. 350"
                          className="w-full h-11 pl-7 pr-3 rounded-lg bg-background border border-border/60 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-2 block">
                      Custom note <span className="normal-case tracking-normal text-muted-foreground/60">— inserted under the offer line</span>
                    </label>
                    <textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Optional. Anything you want to add for this seller specifically."
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border/60 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 resize-none"
                    />
                  </div>

                  {/* Property summary */}
                  <div className="bg-muted/40 rounded-lg p-4 border border-border/40">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Property the seller submitted</p>
                    <p className="text-sm text-foreground">{buildPropertyDescriptor(submission)}</p>
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

            {/* Footer */}
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
                  title={!submission.email ? "No email on file" : !quote ? "Enter quote amount first" : ""}
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

export default SendQuoteDialog;
