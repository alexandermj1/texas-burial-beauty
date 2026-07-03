// Shared builder for the "Quote (with pay buttons)" block. Injected into
// the email body by the inline panel inside the composer. All content is
// styled inline (Georgia + brand palette) so it renders consistently in
// Gmail, Outlook, and Apple Mail.

import { supabase } from "@/integrations/supabase/client";
import { properCase, properFirstName } from "@/lib/properCase";
import { cleanDisplayName } from "@/lib/displayName";

const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export const TIERS = [
  { id: "starter", label: "Starter", price: 0, priceLabel: "$0 Upfront", blurb: "List your property with zero out-of-pocket costs. (Please note: an early cancellation fee applies if withdrawn within 36 months)." },
  { id: "pro", label: "Pro", price: 99, priceLabel: "$99 One-Time Upfront Fee", blurb: "Your property is actively marketed and sent directly to local mortuaries and family counselors to help find a buyer. Cancel anytime at no charge." },
  { id: "custom_plus", label: "Featured", price: 299, priceLabel: "$299 One-Time Upfront Fee", blurbTemplate: (cem: string) => `Our most aggressive marketing package. This tier includes active digital advertising (Google Ads and Meta Ads) specifically targeted for your plots to prompt a faster sale. Additionally, your property will be featured at the very top of the priority list we send to local mortuaries and counselors, ensuring it is seen before any other available properties at ${cem}. Cancel anytime at no charge.` },
] as const;

export const parseSpaces = (s: string | null | undefined): number => {
  if (!s) return 1;
  const n = parseInt(String(s).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
};

export interface SellerForBlock {
  id: string;
  name: string | null;
  email: string | null;
  cemetery: string | null;
  section: string | null;
  property_type: string | null;
  spaces: string | null;
  space_numbers?: string | null;
  lawn?: string | null;
}

// Brand-aligned inline styles
const H3 = 'style="font-family:Georgia,serif;font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:#7c3a2e;margin:24px 0 10px;font-weight:600;"';
const P = 'style="font-family:Georgia,serif;font-size:15px;line-height:1.6;color:#1f2937;margin:0 0 14px;"';
const P_MUTED = 'style="font-family:Georgia,serif;font-size:14px;line-height:1.6;color:#4b4537;margin:0 0 14px;"';
const P_ITALIC_MUTED = 'style="font-family:Georgia,serif;font-size:13px;color:#9a8f7a;margin:14px 0 18px;font-style:italic;"';
const OL = 'style="font-family:Georgia,serif;font-size:14px;line-height:1.6;color:#1f2937;margin:0 0 14px;padding-left:20px;"';
const LI = 'style="margin:0 0 6px;"';

export async function buildListingOptionsBlock(opts: {
  seller: SellerForBlock;
  netPerPlot: number;
  plotCount: number;
  transferFee: number;
}): Promise<string> {
  const { seller, netPerPlot, plotCount, transferFee } = opts;
  const total = netPerPlot * plotCount;
  const cemLabel = properCase(seller.cemetery || "your cemetery");
  const firstName = properFirstName(cleanDisplayName(seller.name || "")) || "there";

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

  const cards = links.map(({ tier, url, free }) => buildListingCard(tier, url, free, cemLabel)).join("\n");

  const propertyLine = buildPropertyDescription({
    cemetery: cemLabel,
    lawn: seller.lawn,
    section: seller.section,
    propertyType: seller.property_type,
    spaceNumbers: seller.space_numbers,
    plotCount,
  });

  const totalLine = plotCount > 1
    ? ` (Totaling <strong>${fmtUsd(total)}</strong> when all ${plotCount} spaces sell)`
    : "";

  const deadline = escapeHtml(nextOfferDeadline());

  const introHtml = `
<p ${P}>Thank you for considering Texas Cemetery Brokers for the sale of your interment property at ${propertyLine}.</p>
<p ${P}>After conducting a thorough evaluation of your specific property, current resale market conditions, and recent comparable sales at ${escapeHtml(cemLabel)}, we are pleased to present you with a direct, transparent offer.</p>
<h3 ${H3}>Your Final Net Payment Offer</h3>
<p ${P}><strong>Total Final Net Payment: ${fmtUsd(netPerPlot)} per space</strong>${totalLine}</p>
<p ${P_MUTED}>We have positioned this quote to offer the highest value release for the property compared to current active listings and recently-closed comparable plot sales. The cemetery resale market is highly sensitive to pricing. Pricing plots higher typically results in buyers choosing other options or purchasing direct from the cemetery; furthermore, because resale inventory is continuously added to the market, overpriced properties simply sit unsold. Our goal is to provide a realistic, accurate valuation that positions the property competitively for buyers and results in an actual sale.</p>
${transferFee > 0 ? `<p ${P_MUTED}>Additionally, as part of this offer, we handle the significant cemetery-imposed costs, which are a mandatory part of any property transfer at ${escapeHtml(cemLabel)}. We cover these fees up to <strong>${fmtUsd(transferFee)}</strong> so they do not come out of your final net proceeds, ensuring you receive the <strong>${fmtUsd(total)}</strong> quoted above when the property is sold.</p>` : ""}
`.trim();

  const nextStepsHtml = `<h3 ${H3}>Next Steps</h3><ol ${OL}><li ${LI}><strong>Review the Offer:</strong> Take your time to consider the net payment and the competitive market strategy we have outlined.</li><li ${LI}><strong>Select Your Listing Option:</strong> Choose the plan (Starter, Pro, or Featured) that best aligns with your goals — simply click the button on the option you want.</li><li ${LI}><strong>Confirm Your Acceptance or Ask Questions:</strong> To accept this offer, or if you have any questions about the market or our process, please simply reply to this email. We will promptly send over your Exclusive Sales Agreement and guide you through listing your property.</li></ol><p ${P}>We look forward to achieving a successful sale on your behalf.</p>`;

  return `<div data-listing-options="1" style="margin:14px 0;">${introHtml}<h3 ${H3}>Listing Options</h3><p ${P_MUTED}>To move forward, we offer three tailored listing options. There are no additional broker fees or commissions due upon the sale of your plot in any of these options:</p>${cards}<p ${P_ITALIC_MUTED}>This offer is valid until ${deadline}.</p>${nextStepsHtml}</div><p><br></p>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// Next Friday 5pm if today is Sat/Sun/Mon/Tue; next Tuesday 5pm if Wed/Thu/Fri.
function nextOfferDeadline(now: Date = new Date()): string {
  const day = now.getDay(); // 0=Sun ... 6=Sat
  // 0 Sun,1 Mon,2 Tue,6 Sat -> Friday(5). 3 Wed,4 Thu,5 Fri -> Tuesday(2).
  const target = [0, 1, 2, 6].includes(day) ? 5 : 2;
  let diff = target - day;
  if (diff <= 0) diff += 7;
  const d = new Date(now);
  d.setDate(d.getDate() + diff);
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const month = d.toLocaleDateString("en-US", { month: "long" });
  const dayNum = d.getDate();
  const suffix = (n: number) => {
    if (n >= 11 && n <= 13) return "th";
    const r = n % 10;
    return r === 1 ? "st" : r === 2 ? "nd" : r === 3 ? "rd" : "th";
  };
  return `5pm on ${weekday}, ${month} ${dayNum}${suffix(dayNum)}`;
}

function buildPropertyDescription(opts: {
  cemetery: string;
  lawn?: string | null;
  section?: string | null;
  propertyType?: string | null;
  spaceNumbers?: string | null;
  plotCount: number;
}) {
  const bits: string[] = [escapeHtml(opts.cemetery)];
  const lawnOrSection = (opts.lawn && opts.lawn.trim()) || (opts.section && opts.section.trim());
  if (lawnOrSection) bits.push(escapeHtml(properCase(lawnOrSection)));
  if (opts.propertyType && opts.propertyType.trim()) bits.push(escapeHtml(opts.propertyType.trim()));
  if (opts.spaceNumbers && opts.spaceNumbers.trim()) {
    bits.push(escapeHtml(opts.spaceNumbers.trim()));
  } else {
    const w = opts.plotCount === 1 ? "space" : "spaces";
    bits.push(`${opts.plotCount} ${w}`);
  }
  return bits.join(", ");
}

function buildListingCard(
  tier: { id: string; label: string; price: number; priceLabel: string; blurb?: string; blurbTemplate?: (c: string) => string },
  url: string | null,
  free: boolean,
  cemLabel: string,
) {
  const buttonLabel = tier.price === 0 ? "Select Starter" : `Pay & select ${tier.label}`;
  const button = url
    ? `<a href="${url}" style="display:inline-block;background:#7c3a2e;color:#ffffff;padding:14px 28px;border-radius:999px;text-decoration:none;font-family:Georgia,serif;font-size:15px;font-weight:600;letter-spacing:.02em;">${buttonLabel}</a>`
    : free
      ? `<span style="display:inline-block;background:#f1ece2;color:#4b4537;padding:14px 28px;border-radius:999px;font-family:Georgia,serif;font-size:15px;font-weight:600;border:1px solid #e7e2d8;">Reply to select</span>`
      : `<span style="display:inline-block;background:#f1ece2;color:#9a8f7a;padding:14px 28px;border-radius:999px;font-family:Georgia,serif;font-size:15px;font-weight:500;border:1px solid #e7e2d8;">Payment link unavailable — reply to select</span>`;

  const blurb = tier.blurb ?? (tier.blurbTemplate ? tier.blurbTemplate(cemLabel) : "");

  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 14px;border-collapse:separate;border:1px solid #e7e2d8;border-radius:14px;background:#fbf8f3;overflow:hidden;">
  <tr>
    <td style="padding:18px 20px;">
      <p style="font-family:Georgia,serif;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#7c3a2e;margin:0 0 6px;">Listing Option</p>
      <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:500;color:#1f2937;margin:0 0 4px;line-height:1.25;">${escapeHtml(tier.label)} — ${escapeHtml(tier.priceLabel)}</h2>
      <p style="font-family:Georgia,serif;font-size:13px;color:#4b4537;margin:0 0 14px;line-height:1.6;">${escapeHtml(blurb)}</p>
      <div style="margin-top:6px;">${button}</div>
      <p style="font-family:Georgia,serif;font-size:11px;color:#9ca3af;margin:10px 0 0;">Secure checkout via Stripe</p>
    </td>
  </tr>
</table>`.trim();
}
