import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, DollarSign, Link2, Mail, Loader2, Check, Copy, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { properCaseName } from "@/lib/properCase";

interface Props {
  open: boolean;
  onClose: () => void;
  submission: {
    id: string;
    name: string | null;
    email: string | null;
    cemetery: string | null;
    section: string | null;
    property_type: string | null;
    spaces: string | null;
    accepted_quote_amount?: number | null;
    list_price?: number | null;
  };
  adminName?: string;
}

type Kind = "plot_sale" | "listing_fee" | "custom";

const LISTING_FEES = [
  { id: "starter", label: "Starter", amount: 0, desc: "$0 — pay only if it sells" },
  { id: "pro", label: "Pro", amount: 99, desc: "$99 one-time" },
  { id: "custom_plus", label: "Custom Plus", amount: 299, desc: "$299 one-time" },
];

const fmt = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function PaymentLinkDialog({ open, onClose, submission, adminName }: Props) {
  const [kind, setKind] = useState<Kind>("plot_sale");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [recipient, setRecipient] = useState<string>("");
  const [recipientName, setRecipientName] = useState<string>("");
  const [listingFee, setListingFee] = useState<string>("pro");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<{ url: string; id: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind("plot_sale");
    setGenerated(null);
    setCopied(false);
    setRecipient("");
    setRecipientName("");
    setAmount(submission.list_price ? String(submission.list_price) : "");
    setDescription(
      submission.cemetery
        ? `Cemetery plot — ${submission.cemetery}${submission.section ? `, Section ${submission.section}` : ""}`
        : "",
    );
    setListingFee("pro");
  }, [open, submission.id, submission.list_price, submission.cemetery, submission.section]);

  // Listing fee uses the SELLER's contact info
  useEffect(() => {
    if (kind === "listing_fee") {
      setRecipient(submission.email || "");
      setRecipientName(properCaseName(submission.name || ""));
      const fee = LISTING_FEES.find(f => f.id === listingFee)!;
      setAmount(String(fee.amount));
      setDescription(`${fee.label} listing — ${submission.cemetery || "your plot"}`);
    }
    if (kind === "plot_sale") {
      setRecipient("");
      setRecipientName("");
      setAmount(submission.list_price ? String(submission.list_price) : "");
      setDescription(
        submission.cemetery
          ? `Cemetery plot — ${submission.cemetery}${submission.section ? `, Section ${submission.section}` : ""}`
          : "",
      );
    }
    if (kind === "custom") {
      setRecipient("");
      setRecipientName("");
      setAmount("");
      setDescription("");
    }
  }, [kind, listingFee, submission.email, submission.name, submission.cemetery, submission.section, submission.list_price]);

  const amountCents = Math.round((Number(amount) || 0) * 100);
  const canGenerate = amountCents > 0 && /\S+@\S+\.\S+/.test(recipient) && description.trim().length >= 2;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment-link", {
        body: {
          submissionId: submission.id,
          kind,
          amountCents,
          description: description.trim(),
          recipientEmail: recipient.trim(),
          recipientName: recipientName.trim(),
        },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL returned");
      setGenerated({ url: data.url, id: data.transactionId || data.sessionId });
    } catch (e: any) {
      toast({ title: "Couldn't create link", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async () => {
    if (!generated) return;
    setSending(true);
    try {
      const greeting = recipientName ? `Dear ${recipientName.split(" ")[0]},` : "Hello,";
      const subjectMap: Record<Kind, string> = {
        plot_sale: `Secure payment link — ${submission.cemetery || "your purchase"}`,
        listing_fee: `Your listing fee — Texas Cemetery Brokers`,
        custom: `Payment link from Texas Cemetery Brokers`,
      };
      const subject = subjectMap[kind];
      const html = `
<div style="font-family: Georgia, serif; max-width: 560px; color:#1f2937;">
  <p>${greeting}</p>
  <p>Please find your secure payment link below for <strong>${escapeHtml(description)}</strong> in the amount of <strong>${fmt(amountCents)}</strong>.</p>
  <p style="margin: 24px 0;">
    <a href="${generated.url}" style="display:inline-block;background:#7c3a2e;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;letter-spacing:.02em;">Complete Secure Payment</a>
  </p>
  <p style="font-size:13px;color:#6b7280;">Or copy this link into your browser:<br><span style="word-break:break-all;">${generated.url}</span></p>
  <p>Payments are processed securely by Stripe. Once complete you will receive an emailed receipt.</p>
  <p>If you have any questions please reply to this email.</p>
  <br>
  <p>Warm regards,<br><strong>${adminName || "Alexander James"}</strong><br>Cemetery Salesperson<br>Texas Cemetery Brokers<br><a href="https://www.texascemeterybrokers.com" style="color:#7c3a2e;">www.texascemeterybrokers.com</a></p>
</div>`.trim();

      const { error } = await supabase.functions.invoke("gmail-action", {
        body: { action: "send", to: recipient, subject, htmlBody: html, body: stripHtml(html) },
      });
      if (error) throw error;
      toast({ title: "Email sent", description: `Payment link sent to ${recipient}` });
      onClose();
    } catch (e: any) {
      toast({ title: "Send failed", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const copyLink = async () => {
    if (!generated) return;
    await navigator.clipboard.writeText(generated.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-2xl shadow-hover border border-border/50 w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-start justify-between p-5 border-b border-border/40">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold mb-1">Send Payment Link</p>
                <h3 className="font-display text-lg text-foreground">{submission.name || "Submission"}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Branded Stripe Checkout</p>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {!generated ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { k: "plot_sale" as const, label: "Plot sale", help: "To a buyer" },
                      { k: "listing_fee" as const, label: "Listing fee", help: "To seller" },
                      { k: "custom" as const, label: "Custom", help: "Any amount" },
                    ]).map(opt => (
                      <button key={opt.k} onClick={() => setKind(opt.k)}
                        className={`p-3 rounded-xl border text-left transition-all ${kind === opt.k ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border/60 hover:border-border"}`}>
                        <div className="text-sm font-medium text-foreground">{opt.label}</div>
                        <div className="text-[11px] text-muted-foreground">{opt.help}</div>
                      </button>
                    ))}
                  </div>

                  {kind === "listing_fee" && (
                    <div className="grid grid-cols-3 gap-2">
                      {LISTING_FEES.map(f => (
                        <button key={f.id} onClick={() => setListingFee(f.id)}
                          className={`p-2.5 rounded-lg border text-center transition ${listingFee === f.id ? "border-primary bg-primary/5" : "border-border/60"}`}>
                          <div className="text-xs font-medium">{f.label}</div>
                          <div className="text-[10px] text-muted-foreground">{f.desc}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">Description (shows on checkout)</label>
                    <input value={description} onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Cemetery plot — Restland, Section 12"
                      className="w-full h-10 px-3 rounded-lg bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">Amount (USD)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-11 pl-7 pr-3 rounded-lg bg-background border border-border/60 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">Recipient name</label>
                      <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">Recipient email</label>
                      <input type="email" value={recipient} onChange={(e) => setRecipient(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-emerald-700 mb-2">
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-medium">Payment link created</span>
                    </div>
                    <p className="text-xs text-emerald-700/80">{description} — {fmt(amountCents)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input readOnly value={generated.url}
                      className="flex-1 h-10 px-3 rounded-lg bg-muted/40 border border-border/60 text-xs text-foreground" />
                    <button onClick={copyLink} className="inline-flex items-center gap-1 px-3 h-10 rounded-lg border border-border/60 hover:bg-muted/50 text-xs">
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                    <a href={generated.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 h-10 rounded-lg border border-border/60 hover:bg-muted/50 text-xs">
                      <ExternalLink className="w-3.5 h-3.5" /> Preview
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border/40 p-4 flex items-center justify-end gap-2">
              {!generated ? (
                <button onClick={handleGenerate} disabled={!canGenerate || loading}
                  className="inline-flex items-center gap-2 px-5 h-10 rounded-full text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  Generate payment link
                </button>
              ) : (
                <button onClick={handleEmail} disabled={sending}
                  className="inline-flex items-center gap-2 px-5 h-10 rounded-full text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Email link to {recipient || "recipient"}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}
