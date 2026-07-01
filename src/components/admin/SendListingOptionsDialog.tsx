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
  { id: "pro", label: "Pro", price: 99, priceLabel: "$99 One-Time Upfront Fee", blurb: "Your property is actively marketed and sent directly to local mortuaries and family counselors to help find a buyer. Cancel anytime at no charge." },
  { id: "custom_plus", label: "Featured", price: 299, priceLabel: "$299 One-Time Upfront Fee", blurb: "Our most aggressive marketing package. This tier includes active digital advertising (Google Ads and Meta Ads) specifically targeted for your plots to prompt a faster sale. Additionally, your property will be featured at the very top of the priority list we send to local mortuaries and counselors, ensuring it is seen before any other available properties at your cemetery. Cancel anytime at no charge." },
] as const;

export default function SendListingOptionsDialog({ open, onClose, seller, onAttach }: Props) {
  const defaultSpaces = parseSpaces(seller.spaces);
  const [netPerPlot, setNetPerPlot] = useState<string>("");
  const [plotCount, setPlotCount] = useState<string>(String(defaultSpaces));
  const [transferFee, setTransferFee] = useState<string>("395");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setNetPerPlot("");
      setPlotCount(String(parseSpaces(seller.spaces)));
      setTransferFee("395");
    }
  }, [open, seller.id, seller.spaces]);

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

      const block = `<div data-listing-options="1" style="margin:14px 0;">${introHtml}<h3 style="font-family:Georgia,serif;font-size:16px;letter-spacing:.14em;text-transform:uppercase;color:#7c3a2e;margin:24px 0 12px;font-weight:600;">Listing Options</h3><p style="font-family:Georgia,serif;font-size:14px;line-height:1.55;margin:0 0 14px;color:#4b4537;">Choose the plan that best fits your goals. There are no additional broker fees due upon sale in any option.</p>${cards}<p style="font-family:Georgia,serif;font-size:13px;color:#9a8f7a;margin:14px 0 0;font-style:italic;">This offer is valid for 3 days.</p></div><p><br></p>`;

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
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">Cemetery transfer fee we cover (USD)</label>
                <input type="number" min="0" step="5" value={transferFee} onChange={(e) => setTransferFee(e.target.value)}
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
  const secLabel = opts.section ? ` (Section ${escapeHtml(properCase(opts.section))}${opts.plotCount ? `, ${opts.plotCount} ${opts.plotCount === 1 ? "plot" : "plots"}` : ""})` : opts.plotCount ? ` (${opts.plotCount} ${opts.plotCount === 1 ? "plot" : "plots"})` : "";
  return `
<p style="font-family:Georgia,serif;font-size:15px;line-height:1.6;margin:0 0 14px;">Thank you for considering Texas Cemetery Brokers for the sale of your interment property at ${cemLabel}${secLabel}.</p>
<p style="font-family:Georgia,serif;font-size:15px;line-height:1.6;margin:0 0 14px;">After a thorough evaluation of your specific property, current resale market conditions, and recent comparable sales at ${cemLabel}, we are pleased to present a direct, transparent offer.</p>
<h3 style="font-family:Georgia,serif;font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:#7c3a2e;margin:20px 0 10px;font-weight:600;">Your Final Net Payment Offer</h3>
<p style="font-family:Georgia,serif;font-size:15px;line-height:1.6;margin:0 0 12px;"><strong>${fmtUsd(opts.netPerPlot)} per plot</strong>${opts.plotCount > 1 ? ` — totaling <strong>${fmtUsd(opts.total)}</strong> when all ${opts.plotCount} spaces sell.` : "."}</p>
<p style="font-family:Georgia,serif;font-size:14px;line-height:1.6;margin:0 0 12px;color:#4b4537;">We've positioned this quote to offer the highest competitive value for a property at ${cemLabel} against current active listings. The resale market is highly sensitive to pricing — overpriced properties simply sit unsold as newer, lower-priced inventory arrives. Our goal is a strong, accurate valuation that stands out to buyers so your property actually sells.</p>
${opts.transferFee > 0 ? `<p style="font-family:Georgia,serif;font-size:14px;line-height:1.6;margin:0 0 12px;color:#4b4537;">As part of this offer, we cover the <strong>${fmtUsd(opts.transferFee)} cemetery transfer fee</strong> directly — it does not come out of your proceeds. You receive exactly the net payment quoted above.</p>` : ""}
`.trim();
}

function buildListingCard(
  tier: { id: string; label: string; price: number; blurb: string },
  url: string | null,
  free: boolean,
) {
  const priceLabel = tier.price === 0 ? "$0 upfront" : `${fmtUsd(tier.price)} one-time`;
  const buttonLabel = tier.price === 0 ? "Select Starter" : `Pay & select ${tier.label}`;
  const button = url
    ? `<a href="${url}" style="display:inline-block;background:#7c3a2e;color:#ffffff;padding:14px 28px;border-radius:999px;text-decoration:none;font-family:Georgia,serif;font-size:15px;font-weight:600;letter-spacing:.02em;">${buttonLabel}</a>`
    : free
      ? `<span style="display:inline-block;background:#f1ece2;color:#4b4537;padding:14px 28px;border-radius:999px;font-family:Georgia,serif;font-size:15px;font-weight:600;border:1px solid #e7e2d8;">Reply to select</span>`
      : `<span style="display:inline-block;background:#f1ece2;color:#9a8f7a;padding:14px 28px;border-radius:999px;font-family:Georgia,serif;font-size:15px;font-weight:500;border:1px solid #e7e2d8;">Payment link unavailable — reply to select</span>`;

  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 14px;border-collapse:separate;border:1px solid #e7e2d8;border-radius:14px;background:#fbf8f3;overflow:hidden;">
  <tr>
    <td style="padding:18px 20px;">
      <p style="font-family:Georgia,serif;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#7c3a2e;margin:0 0 6px;">Listing Option</p>
      <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:500;color:#1f2937;margin:0 0 4px;line-height:1.25;">${escapeHtml(tier.label)}</h2>
      <p style="font-family:Georgia,serif;font-size:15px;font-weight:600;color:#1f2937;margin:0 0 8px;">${escapeHtml(priceLabel)}</p>
      <p style="font-family:Georgia,serif;font-size:13px;color:#4b4537;margin:0 0 14px;line-height:1.55;">${escapeHtml(tier.blurb)}</p>
      <div style="margin-top:6px;">${button}</div>
      <p style="font-family:Georgia,serif;font-size:11px;color:#9ca3af;margin:10px 0 0;">Secure checkout via Stripe</p>
    </td>
  </tr>
</table>`.trim();
}
