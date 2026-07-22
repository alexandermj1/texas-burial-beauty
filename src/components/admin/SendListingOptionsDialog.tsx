// Compose & attach a "Listing Options" block to a seller email.
// Generates 3 Stripe Checkout links (Starter $0 / Pro $99 / Featured $299)
// via `create-payment-link` and injects branded pay-to-select cards into
// the composer. Also fills in the offer/comparable pricing text so the
// admin doesn't have to retype it.

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { properCase } from "@/lib/properCase";
import { getPaymentsEnvironment } from "@/lib/paymentEnvironment";

interface Props {
  open: boolean;
  onClose: () => void;
  seller: {
    id: string;
    name: string | null;
    email: string | null;
    cemetery: string | null;
    section: string | null;
    property_type: string | null;
    spaces: string | null;
  };
  onAttach: (html: string) => void;
}

const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const parseSpaces = (s: string | null | undefined): number => {
  if (!s) return 1;
  const n = parseInt(String(s).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
};

const TIERS = [
  { id: "starter", label: "Starter", price: 0, priceLabel: "$0 Upfront", blurb: "List your property with zero out-of-pocket costs. (Please note: an early cancellation fee applies if withdrawn within 36 months)." },
  { id: "pro", label: "Pro", price: 99, priceLabel: "$99 One-Time Upfront Fee", blurb: "Your property is actively marketed and sent directly to local mortuaries and family counselors. In 2025, listings at this level sold with an average 22% faster time to sale. Cancel anytime at no charge." },
  { id: "custom_plus", label: "Featured", price: 299, priceLabel: "$299 One-Time Upfront Fee", blurb: "Our most aggressive marketing package. This tier includes active digital advertising (Google Ads and Meta Ads) specifically targeted for your plots. In 2025, listings at this tier sold 61% faster. Additionally, your property will be featured at the very top of the priority list we send to local mortuaries and counselors, ensuring it is seen before any other available properties at your cemetery. Cancel anytime at no charge." },
] as const;

export default function SendListingOptionsDialog({ open, onClose, seller, onAttach }: Props) {
  const defaultSpaces = parseSpaces(seller.spaces);
  const [netPerPlot, setNetPerPlot] = useState<string>("");
  const [plotCount, setPlotCount] = useState<string>(String(defaultSpaces));
  const [transferFee, setTransferFee] = useState<string>("");
  const [feeAutofilled, setFeeAutofilled] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNetPerPlot("");
    setPlotCount(String(parseSpaces(seller.spaces)));
    setTransferFee("");
    setFeeAutofilled(false);

    // Try to autofill the transfer fee from the cemetery record.
    const name = (seller.cemetery || "").trim();
    if (!name) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.rpc("canonical_cemetery" as any, { name });
        const canon = (data as any) || null;
        let row: any = null;
        if (canon) {
          const { data: rows } = await supabase
            .from("texas_cemeteries" as any)
            .select("transfer_fee")
            .eq("canonical_name", canon)
            .not("transfer_fee", "is", null)
            .limit(1);
          row = rows?.[0] ?? null;
        }
        if (!row) {
          const { data: rows } = await supabase
            .from("texas_cemeteries" as any)
            .select("transfer_fee")
            .ilike("name", `%${name}%`)
            .not("transfer_fee", "is", null)
            .limit(1);
          row = rows?.[0] ?? null;
        }
        if (cancelled) return;
        const fee = row?.transfer_fee;
        if (fee != null && fee !== "") {
          setTransferFee(String(fee));
          setFeeAutofilled(true);
        }
      } catch (e) {
        console.warn("transfer fee autofill failed", e);
      }
    })();
    return () => { cancelled = true; };
  }, [open, seller.id, seller.spaces, seller.cemetery]);

  const nppNum = Number(netPerPlot) || 0;
  const countNum = Math.max(1, Number(plotCount) || 1);
  const total = nppNum * countNum;

  const canAttach = nppNum > 0 && countNum > 0;

  const handleAttach = async () => {
    if (!canAttach) return;
    setCreating(true);
    try {
      // Create 3 Stripe links (Starter is $0 — the edge function short-circuits).
      const links = await Promise.all(
        TIERS.map(async (t) => {
          try {
            const { data, error } = await supabase.functions.invoke("create-payment-link", {
              body: {
                submissionId: seller.id,
                kind: "listing_fee",
                amountCents: t.price * 100,
                description: `${t.label} listing — ${seller.cemetery || "your plot"}`,
                recipientEmail: seller.email || "",
                recipientName: properCase(seller.name || ""),
                listingTier: t.id,
                environment: getPaymentsEnvironment(),
              },
            });
            if (error) throw error;
            return { tier: t, url: (data as any)?.url as string | null, free: !!(data as any)?.free };
          } catch (e) {
            console.warn("listing tier link failed", t.id, e);
            return { tier: t, url: null, free: false };
          }
        }),
      );

      const cards = links
        .map(({ tier, url, free }) => buildListingCard(tier, url, free))
        .join("\n");

      const introHtml = buildOfferIntroHtml({
        cemetery: seller.cemetery,
        section: seller.section,
        propertyType: seller.property_type,
        plotCount: countNum,
        netPerPlot: nppNum,
        total,
        transferFee: Number(transferFee) || 0,
      });

      const nextStepsHtml = `<h3 style="font-family:Georgia,serif;font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:#7c3a2e;margin:24px 0 10px;font-weight:600;">Next Steps</h3><ol style="font-family:Georgia,serif;font-size:14px;line-height:1.6;color:#1f2937;margin:0 0 14px;padding-left:20px;"><li style="margin:0 0 6px;"><strong>Review the Offer:</strong> Take your time to consider the net payment and the competitive market strategy outlined above.</li><li style="margin:0 0 6px;"><strong>Select Your Listing Option:</strong> Choose the plan (Starter, Pro, or Featured) that best aligns with your goals — simply click the button on the option you want.</li><li style="margin:0 0 6px;"><strong>Confirm Your Acceptance or Ask Questions:</strong> To accept this offer, or if you have any questions about the market or our process, please simply reply to this email. We will promptly send over your Exclusive Sales Agreement and guide you through listing your property.</li></ol><p style="font-family:Georgia,serif;font-size:15px;line-height:1.6;margin:0 0 14px;">We look forward to achieving a successful sale on your behalf.</p>`;

      const block = `<div data-listing-options="1" style="margin:14px 0;">${introHtml}<h3 style="font-family:Georgia,serif;font-size:16px;letter-spacing:.14em;text-transform:uppercase;color:#7c3a2e;margin:24px 0 12px;font-weight:600;">Listing Options</h3><p style="font-family:Georgia,serif;font-size:14px;line-height:1.6;margin:0 0 14px;color:#4b4537;">To move forward, we offer three tailored listing options. There are no additional broker fees due upon the sale of your plot in any of these options:</p>${cards}<p style="font-family:Georgia,serif;font-size:13px;color:#9a8f7a;margin:14px 0 18px;font-style:italic;">This offer is valid for 3 days.</p>${nextStepsHtml}</div><p><br></p>`;

      onAttach(block);
      toast({ title: "Listing options attached", description: "Three pay-to-select buttons added to the email." });
      onClose();
    } catch (e: any) {
      toast({ title: "Couldn't attach", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-start justify-center p-4 pt-10 overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-2xl shadow-hover border border-border/50 w-full max-w-lg overflow-hidden flex flex-col"
          >
            <div className="flex items-start justify-between p-5 border-b border-border/40">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold mb-1">Attach Listing Options</p>
                <h3 className="font-display text-lg text-foreground">{seller.name || "Seller"}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{properCase(seller.cemetery || "")}{seller.section ? ` · Section ${seller.section}` : ""}</p>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">Net payment per plot (USD)</label>
                  <input type="number" min="0" step="50" value={netPerPlot} onChange={(e) => setNetPerPlot(e.target.value)}
                    placeholder="2000"
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block"># of plots</label>
                  <input type="number" min="1" step="1" value={plotCount} onChange={(e) => setPlotCount(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
                  Cemetery transfer fee we cover (USD)
                  {feeAutofilled && (
                    <span className="ml-2 normal-case tracking-normal text-[10px] text-emerald-700 dark:text-emerald-400 font-normal">
                      · autofilled from cemetery record
                    </span>
                  )}
                </label>
                <input type="number" min="0" step="5" value={transferFee}
                  onChange={(e) => { setTransferFee(e.target.value); setFeeAutofilled(false); }}
                  placeholder="Enter transfer fee (no record on file)"
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>

              {canAttach && (
                <div className="rounded-lg bg-muted/40 border border-border/60 p-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 text-foreground font-medium mb-1"><Sparkles className="w-3 h-3" /> Preview</div>
                  {fmtUsd(nppNum)} per plot × {countNum} plot{countNum === 1 ? "" : "s"} = <strong className="text-foreground">{fmtUsd(total)}</strong> when all sell.
                </div>
              )}
            </div>

            <div className="border-t border-border/40 p-4 flex items-center justify-end gap-2">
              <button onClick={handleAttach} disabled={!canAttach || creating}
                className="inline-flex items-center gap-2 px-5 h-10 rounded-full text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Attach to email
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function buildOfferIntroHtml(opts: {
  cemetery: string | null;
  section: string | null;
  propertyType: string | null;
  plotCount: number;
  netPerPlot: number;
  total: number;
  transferFee: number;
}) {
  const cemLabel = escapeHtml(properCase(opts.cemetery || "your cemetery"));
  const plotWord = opts.plotCount === 1 ? "Burial Plot" : "Burial Plots";
  const descBits: string[] = [];
  if (opts.section) descBits.push(`Section ${escapeHtml(properCase(opts.section))}`);
  descBits.push(`${opts.plotCount} ${plotWord}`);
  const parenthetical = ` (${descBits.join(", ")})`;
  const totalLine = opts.plotCount > 1
    ? ` (Totaling <strong>${fmtUsd(opts.total)}</strong> when all ${opts.plotCount} spaces sell)`
    : "";
  return `
<p style="font-family:Georgia,serif;font-size:15px;line-height:1.6;margin:0 0 14px;">Thank you for considering Texas Cemetery Brokers for the sale of your interment property at ${cemLabel}${parenthetical}.</p>
<p style="font-family:Georgia,serif;font-size:15px;line-height:1.6;margin:0 0 14px;">After conducting a thorough evaluation of your specific property, current resale market conditions, and recent comparable sales at ${cemLabel}, we are pleased to present you with a direct, transparent offer.</p>
<h3 style="font-family:Georgia,serif;font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:#7c3a2e;margin:20px 0 10px;font-weight:600;">Your Final Net Payment Offer</h3>
<p style="font-family:Georgia,serif;font-size:15px;line-height:1.6;margin:0 0 12px;"><strong>Total Final Net Payment: ${fmtUsd(opts.netPerPlot)} per plot</strong>${totalLine}</p>
<p style="font-family:Georgia,serif;font-size:14px;line-height:1.6;margin:0 0 12px;color:#4b4537;">We have positioned this quote to offer the highest competitive value for a property at ${cemLabel} when compared to current active listings. The cemetery resale market is highly sensitive to pricing. Pricing plots higher typically results in buyers moving on to other options; furthermore, as new, lower-priced inventory is continuously added to the market, overpriced properties simply sit unsold. Our goal is to provide a strong, accurate valuation that stands out to buyers and ensures your property actually sells.</p>
${opts.transferFee > 0 ? `<p style="font-family:Georgia,serif;font-size:14px;line-height:1.6;margin:0 0 12px;color:#4b4537;">Additionally, as part of this offer, we handle the significant cemetery-imposed costs. We pay the <strong>${fmtUsd(opts.transferFee)} transfer fee</strong> for the plots directly. This expense is entirely covered by us and does not come out of your proceeds, ensuring you receive exactly the net payment quoted above.</p>` : ""}
`.trim();
}

function buildListingCard(
  tier: { id: string; label: string; price: number; priceLabel: string; blurb: string },
  url: string | null,
  free: boolean,
) {
  const buttonLabel = tier.price === 0 ? "Select Starter" : `Pay & select ${tier.label}`;
  const button = url
    ? `<a href="${url}" style="display:inline-block;background:#7c3a2e;color:#ffffff;padding:14px 28px;border-radius:999px;text-decoration:none;font-family:Georgia,serif;font-size:15px;font-weight:600;letter-spacing:.02em;">${buttonLabel}</a>`
    : `<span style="display:inline-block;background:#f1ece2;color:#9a8f7a;padding:14px 28px;border-radius:999px;font-family:Georgia,serif;font-size:15px;font-weight:500;border:1px solid #e7e2d8;">Link unavailable — reply to select</span>`;


  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 14px;border-collapse:separate;border:1px solid #e7e2d8;border-radius:14px;background:#fbf8f3;overflow:hidden;">
  <tr>
    <td style="padding:18px 20px;">
      <p style="font-family:Georgia,serif;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#7c3a2e;margin:0 0 6px;">Listing Option</p>
      <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:500;color:#1f2937;margin:0 0 4px;line-height:1.25;">${escapeHtml(tier.label)} — ${escapeHtml(tier.priceLabel)}</h2>
      <p style="font-family:Georgia,serif;font-size:13px;color:#4b4537;margin:0 0 14px;line-height:1.6;">${escapeHtml(tier.blurb)}</p>
      <div style="margin-top:6px;">${button}</div>
      <p style="font-family:Georgia,serif;font-size:11px;color:#9ca3af;margin:10px 0 0;">Secure checkout via Stripe</p>
    </td>
  </tr>
</table>`.trim();
}
