// Shared builder for the "Quote (with pay buttons)" block. Injected into
// the email body by the inline panel inside the composer. All content is
// styled inline (Georgia + brand palette) so it renders consistently in
// Gmail, Outlook, and Apple Mail.

import { supabase } from "@/integrations/supabase/client";
import { properCase } from "@/lib/properCase";

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
  /** Authorized minimum sale price per space (gross, before 15% commission). */
  netPerPlot: number;
  plotCount: number;
  transferFee: number;
}): Promise<string> {
  const { seller, netPerPlot, plotCount, transferFee } = opts;
  const salePerSpace = netPerPlot;
  const commissionPerSpace = Math.round(salePerSpace * 0.15);
  const proceedsPerSpace = salePerSpace - commissionPerSpace;
  const totalSale = salePerSpace * plotCount;
  const totalProceeds = proceedsPerSpace * plotCount;
  const cemLabel = properCase(seller.cemetery || "your cemetery");

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

  const spaceWord = plotCount === 1 ? "space" : "spaces";
  const acrossLine = plotCount > 1
    ? ` (${fmtUsd(totalSale)} across all ${plotCount} spaces)`
    : "";
  const proceedsTotalLine = plotCount > 1
    ? ` (${fmtUsd(totalProceeds)} total)`
    : "";

  const deadline = escapeHtml(nextOfferDeadline());

  const introHtml = `
<p ${P}>Thank you for considering Texas Cemetery Brokers for the sale of your interment property at ${propertyLine} (${plotCount} ${spaceWord}).</p>
<p ${P}>After conducting a thorough evaluation of your specific property, current resale market conditions, and recent comparable sales at ${escapeHtml(cemLabel)}, we are pleased to present your authorized sale quote.</p>

<h3 ${H3}>How This Works</h3>
<p ${P_MUTED}>Our process is simple: you authorize us to sell your property at (or above) an agreed minimum price, and we handle everything from there — marketing, buyer negotiations, cemetery paperwork, and the closing itself. Because we can complete a sale the moment a qualified buyer commits, without coming back to you for approval on each offer, your property stays competitive with buyers who need to move quickly. When the sale closes, our 15% commission is deducted from the final sale price and the remainder is paid directly to you. All cemetery transfer fees and any optional buyer services are paid by the buyer, so they never touch your proceeds.</p>

<h3 ${H3}>Your Authorized Sale Price</h3>
<p ${P}><strong>Authorized Minimum Sale Price: ${fmtUsd(salePerSpace)} per space${acrossLine}</strong></p>
<p ${P_MUTED}>This is the minimum figure at which you authorize us to complete a sale on your behalf. In practice, we always pursue the highest achievable price — the final sale may close at this figure or above it, depending on buyer demand at the time. Any amount achieved above the authorized minimum flows through to your proceeds on the same terms.</p>
<p ${P_MUTED}>We have positioned this figure to offer the highest realistic value release compared to current active listings and recently-closed comparable plot sales. The cemetery resale market is highly sensitive to pricing: plots priced near cemetery retail typically sit unsold, because resale buyers are specifically seeking meaningful savings versus buying direct from the cemetery. This valuation positions your property to actually sell.</p>

<h3 ${H3}>Why Pre-Authorization Matters</h3>
<p ${P_MUTED}>A significant share of cemetery resales are at-need transfers — families who have just experienced a loss and need to complete a purchase within days, sometimes hours. These buyers cannot wait on a back-and-forth approval process, and properties that require one are routinely passed over for ones that can close immediately. Your authorization allows us to act the moment a qualified buyer commits, at your authorized price or better, without risking the sale on delays.</p>

<h3 ${H3}>Your Proceeds</h3>
<p ${P_MUTED}>Upon sale, our brokerage commission of 15% of the final sale price is deducted, and the balance is remitted to you. At the authorized minimum, that means:</p>
<ul ${OL}>
  <li ${LI}>Sale price: <strong>${fmtUsd(salePerSpace)}</strong> per space</li>
  <li ${LI}>Commission (15%): <strong>–${fmtUsd(commissionPerSpace)}</strong> per space</li>
  <li ${LI}>Your proceeds: <strong>${fmtUsd(proceedsPerSpace)}</strong> per space${proceedsTotalLine} — or more if the property sells above the minimum</li>
</ul>

<h3 ${H3}>Buyer-Paid Costs</h3>
<p ${P_MUTED}>For clarity on the closing statement you'll eventually see: the mandatory cemetery transfer fee at ${escapeHtml(cemLabel)}${transferFee > 0 ? ` (${fmtUsd(transferFee)})` : ""} is paid by the buyer, not you. Buyers may also elect additional services through our company — financing, mortuary referral coordination, in-person showings, and similar — which are likewise billed to the buyer and itemized separately. As a result, the buyer's total at closing will read higher than the sale price your proceeds are calculated from. This is standard, and none of it reduces your proceeds.</p>
`.trim();

  const nextStepsHtml = `<h3 ${H3}>Next Steps</h3><ol ${OL}><li ${LI}><strong>Review the Quote:</strong> Consider the authorized sale price and the market strategy outlined above.</li><li ${LI}><strong>Select Your Listing Option:</strong> Choose Starter, Pro, or Featured — simply click the button on the option you want.</li><li ${LI}><strong>Authorize the Sale:</strong> Reply to this email to confirm your authorization for us to sell at the quoted price or higher. We will promptly send your Exclusive Sales Agreement, which formalizes the authorization and commission terms, and guide you through listing.</li></ol><p ${P}>We look forward to achieving a successful sale on your behalf.</p>`;

  return `<div data-listing-options="1" style="margin:14px 0;">${introHtml}<h3 ${H3}>Listing Options</h3><p ${P_MUTED}>To move forward, we offer three tailored listing options. There are no additional broker fees beyond the 15% commission in any of these options:</p>${cards}<p ${P_ITALIC_MUTED}>This quote is valid until ${deadline}.</p>${nextStepsHtml}</div><p><br></p>`;
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
