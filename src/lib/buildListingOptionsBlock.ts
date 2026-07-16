// Shared builder for the "Quote (with pay buttons)" block. Injected into
// the email body between the greeting and the signature. Styled as a
// self-contained, marketing-quality branded card (Texas Cemetery Brokers)
// modelled on the Bayer Purchase Offer email: logo header, property
// callout, prominent price callout, section cards, tier cards, and a
// muted footnote — all inline styles so Gmail/Outlook/Apple Mail render
// it consistently.

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
  transfer_fee_amount?: number | string | null;
}

// ── Texas brand tokens ──────────────────────────────────────────────
const BRAND_PRIMARY = "#7c3a2e";     // burgundy
const BRAND_PRIMARY_FG = "#ffffff";
const BRAND_BG_ACCENT = "#f7f1e8";   // warm sand
const BRAND_CARD_BG = "#ffffff";
const BRAND_PAGE_BG = "#f1ece2";     // outer page tan
const BRAND_BORDER = "#e7e2d8";
const BRAND_INK = "#1f2937";
const BRAND_INK_MUTED = "#4b4537";
const BRAND_INK_FAINT = "#9a8f7a";
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const LOGO_URL =
  "https://www.texascemeterybrokers.com/__l5e/assets-v1/ba491ce8-b20f-42a1-a37e-059bb277ea85/hibiscus-coral.png";

export async function buildListingOptionsBlock(opts: {
  seller: SellerForBlock;
  /** Authorized minimum sale price per space (gross, before 15% commission). */
  netPerPlot: number;
  plotCount: number;
  transferFee: number;
  /** Stripe environment — defaults to sandbox if omitted. */
  environment?: "sandbox" | "live";
}): Promise<string> {
  const { seller, netPerPlot, plotCount, transferFee, environment = "sandbox" } = opts;
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
            environment,
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
    ? ` <span style="color:${BRAND_INK_MUTED};font-weight:500;">(${fmtUsd(totalSale)} across all ${plotCount} spaces)</span>`
    : "";
  const proceedsTotalLine = plotCount > 1
    ? ` <span style="color:${BRAND_INK_MUTED};">(${fmtUsd(totalProceeds)} total)</span>`
    : "";
  const deadline = escapeHtml(nextOfferDeadline());

  const tierCards = links.map(({ tier, url, free }) => buildListingCard(tier, url, free, cemLabel)).join("\n");

  const eyebrow = (label: string) =>
    `<p style="font-family:${SERIF};font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:${BRAND_PRIMARY};margin:0 0 8px;font-weight:700;">${label}</p>`;

  const h2 = (label: string) =>
    `<h2 style="font-family:${SERIF};font-size:20px;font-weight:600;color:${BRAND_INK};margin:0 0 12px;line-height:1.25;letter-spacing:-0.005em;">${label}</h2>`;

  const p = (body: string, muted = false) =>
    `<p style="font-family:${SANS};font-size:14.5px;line-height:1.7;color:${muted ? BRAND_INK_MUTED : BRAND_INK};margin:0 0 14px;">${body}</p>`;

  const section = (title: string, inner: string) => `
        <tr><td style="padding:26px 40px 4px;">
          ${eyebrow("Section")}
          ${h2(title)}
          ${inner}
        </td></tr>`;

  // ── PROPERTY CALLOUT ──────────────────────────────────────────────
  const propertyCallout = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND_BG_ACCENT};border-radius:10px;margin:0 0 20px;">
  <tr><td style="padding:18px 22px;">
    <p style="font-family:${SERIF};font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:${BRAND_PRIMARY};margin:0 0 6px;font-weight:700;">Your Property</p>
    <p style="font-family:${SERIF};font-size:17px;line-height:1.45;color:${BRAND_INK};margin:0;font-weight:600;">${propertyLine}</p>
    <p style="font-family:${SANS};font-size:13px;line-height:1.55;color:${BRAND_INK_MUTED};margin:6px 0 0;">${plotCount} ${spaceWord}</p>
  </td></tr>
</table>`.trim();

  // ── AUTHORIZED PRICE CALLOUT (primary) ────────────────────────────
  const priceCallout = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid ${BRAND_PRIMARY};border-radius:12px;margin:0 0 22px;background:${BRAND_CARD_BG};">
  <tr><td style="padding:24px 26px;">
    <p style="font-family:${SERIF};font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:${BRAND_PRIMARY};margin:0 0 6px;font-weight:800;">Your Authorized Sale Quote</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND_BG_ACCENT};border-radius:8px;margin:14px 0 16px;">
      <tr><td style="padding:18px 20px;">
        <p style="font-family:${SERIF};font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:${BRAND_PRIMARY};margin:0 0 6px;font-weight:700;">Authorized Minimum Sale Price</p>
        <p style="font-family:${SERIF};font-size:32px;color:${BRAND_PRIMARY};margin:0;font-weight:700;letter-spacing:-0.02em;line-height:1;">${fmtUsd(salePerSpace)} <span style="font-size:15px;font-weight:500;color:${BRAND_INK_MUTED};letter-spacing:0;">per space</span></p>
        ${plotCount > 1 ? `<p style="font-family:${SANS};font-size:13px;color:${BRAND_INK_MUTED};margin:8px 0 0;">${fmtUsd(totalSale)} across all ${plotCount} spaces</p>` : ""}
      </td></tr>
    </table>
    <p style="font-family:${SANS};font-size:13.5px;line-height:1.7;color:${BRAND_INK_MUTED};margin:0;">This is the minimum figure at which you authorize us to complete a sale on your behalf. In practice we always pursue the highest achievable price — the final sale may close at this figure or above it, and any amount above the authorized minimum flows through to your proceeds on the same terms.</p>
  </td></tr>
</table>`.trim();

  // ── PROCEEDS BREAKDOWN ROW ────────────────────────────────────────
  const proceedsRow = (label: string, value: string, emphasized = false) => `
<tr>
  <td style="padding:10px 0;border-bottom:1px solid ${BRAND_BORDER};font-family:${SANS};font-size:14px;color:${BRAND_INK_MUTED};">${label}</td>
  <td style="padding:10px 0;border-bottom:1px solid ${BRAND_BORDER};font-family:${SERIF};font-size:${emphasized ? "17px" : "15px"};color:${emphasized ? BRAND_PRIMARY : BRAND_INK};font-weight:${emphasized ? 700 : 600};text-align:right;">${value}</td>
</tr>`;

  const proceedsCard = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${BRAND_BORDER};border-radius:10px;margin:0 0 22px;background:${BRAND_CARD_BG};">
  <tr><td style="padding:22px 24px;">
    <p style="font-family:${SERIF};font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:${BRAND_PRIMARY};margin:0 0 12px;font-weight:800;">Your Proceeds Per Space</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${proceedsRow("Sale price", fmtUsd(salePerSpace))}
      ${proceedsRow("Commission (15%)", `–${fmtUsd(commissionPerSpace)}`)}
      <tr>
        <td style="padding:14px 0 0;font-family:${SANS};font-size:14px;color:${BRAND_INK};font-weight:600;">Your proceeds</td>
        <td style="padding:14px 0 0;font-family:${SERIF};font-size:19px;color:${BRAND_PRIMARY};font-weight:700;text-align:right;">${fmtUsd(proceedsPerSpace)}${proceedsTotalLine}</td>
      </tr>
    </table>
    <p style="font-family:${SANS};font-size:12.5px;line-height:1.65;color:${BRAND_INK_FAINT};margin:14px 0 0;font-style:italic;">Or more if the property sells above the authorized minimum.</p>
  </td></tr>
</table>`.trim();

  // ── TIER SECTION ──────────────────────────────────────────────────
  const tierSection = `
<p style="font-family:${SANS};font-size:14px;line-height:1.7;color:${BRAND_INK_MUTED};margin:0 0 16px;">To move forward, choose one of three tailored listing options. There are no additional broker fees beyond the 15% commission in any of these options:</p>
${tierCards}
<p style="font-family:${SANS};font-size:12.5px;color:${BRAND_INK_FAINT};margin:6px 0 4px;font-style:italic;">This quote is valid until ${deadline}.</p>`.trim();

  // ── ASSEMBLE ──────────────────────────────────────────────────────
  const cardHtml = `
<div data-listing-options="1" style="margin:18px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND_PAGE_BG};border-radius:14px;">
  <tr><td align="center" style="padding:28px 16px;">
    <table role="presentation" width="720" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:720px;background:${BRAND_CARD_BG};border-radius:12px;overflow:hidden;box-shadow:0 10px 32px rgba(124,58,46,0.10);">

      <!-- HEADER -->
      <tr><td align="center" style="background:${BRAND_CARD_BG};padding:28px 40px 18px;border-bottom:1px solid ${BRAND_BORDER};">
        <img src="${LOGO_URL}" alt="Texas Cemetery Brokers" width="56" style="display:block;width:56px;height:auto;margin:0 auto 12px;">
        <p style="font-family:${SERIF};font-size:18px;color:${BRAND_INK};margin:0 0 4px;font-weight:600;letter-spacing:.01em;">Texas Cemetery Brokers</p>
        <p style="font-family:${SERIF};font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:${BRAND_PRIMARY};font-weight:700;margin:0;">Sale Authorization Quote</p>
      </td></tr>

      <!-- INTRO -->
      <tr><td style="padding:30px 40px 4px;">
        ${p(`Thank you for considering Texas Cemetery Brokers for the sale of your interment property. After conducting a thorough evaluation of your specific property, current resale market conditions, and recent comparable sales at ${escapeHtml(cemLabel)}, we are pleased to present your authorized sale quote.`)}
        ${propertyCallout}
      </td></tr>

      <!-- PRICE -->
      <tr><td style="padding:6px 40px 4px;">
        ${priceCallout}
        ${p(`We have positioned this figure to offer the highest realistic value release compared to current active listings and recently-closed comparable plot sales. The cemetery resale market is highly sensitive to pricing: plots priced near cemetery retail typically sit unsold, because resale buyers are specifically seeking meaningful savings versus buying direct from the cemetery. This valuation positions your property to actually sell.`, true)}
      </td></tr>

      <!-- HOW IT WORKS -->
      ${section("How this works", `
        ${p(`Our process is simple: you authorize us to sell your property at (or above) an agreed minimum price, and we handle everything from there — marketing, buyer negotiations, cemetery paperwork, and the closing itself. Because we can complete a sale the moment a qualified buyer commits, without coming back to you for approval on each offer, your property stays competitive with buyers who need to move quickly.`, true)}
        ${p(`When the sale closes, our 15% commission is deducted from the final sale price and the remainder is paid directly to you. All cemetery transfer fees and any optional buyer services are paid by the buyer, so they never touch your proceeds.`, true)}
      `)}

      <!-- WHY PRE-AUTH -->
      ${section("Why pre-authorization matters", `
        ${p(`A significant share of cemetery resales are at-need transfers — families who have just experienced a loss and need to complete a purchase within days, sometimes hours. These buyers cannot wait on a back-and-forth approval process, and properties that require one are routinely passed over for ones that can close immediately. Your authorization allows us to act the moment a qualified buyer commits, at your authorized price or better, without risking the sale on delays.`, true)}
      `)}

      <!-- PROCEEDS -->
      <tr><td style="padding:26px 40px 4px;">
        ${eyebrow("Section")}
        ${h2("Your proceeds")}
        ${p(`Upon sale, our brokerage commission of 15% of the final sale price is deducted, and the balance is remitted to you. At the authorized minimum, that means:`, true)}
        ${proceedsCard}
      </td></tr>

      <!-- BUYER PAID -->
      ${section("Buyer-paid costs", `
        ${p(`For clarity on the closing statement you'll eventually see: the mandatory cemetery transfer fee at ${escapeHtml(cemLabel)}${transferFee > 0 ? ` (${fmtUsd(transferFee)})` : ""} is paid by the buyer, not you. The buyer is responsible for all cemetery fees—such as transfer, quitclaim, and additional endowment care—as well as broker fees, including marketing, referral, and processing expenses. Buyers may also elect additional services through our company — financing, mortuary referral coordination, in-person showings, and similar — which are likewise billed to the buyer and itemized separately. As a result, the buyer's total at closing will read higher than the sale price your proceeds are calculated from. This is standard, and none of it reduces your proceeds.`, true)}
      `)}

      <!-- LISTING OPTIONS -->
      <tr><td style="padding:26px 40px 4px;">
        ${eyebrow("Choose your plan")}
        ${h2("Listing options")}
        ${tierSection}
      </td></tr>

      <!-- NEXT STEPS -->
      <tr><td style="padding:26px 40px 32px;">
        ${eyebrow("Next steps")}
        ${h2("How to move forward")}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">
          ${nextStep(1, "Review the quote", "Consider the authorized sale price and the market strategy outlined above.")}
          ${nextStep(2, "Select your listing option", "Choose Starter, Pro, or Featured — simply click the button on the option you want.")}
          ${nextStep(3, "Authorize the sale", "Reply to this email to confirm your authorization for us to sell at the quoted price or higher. We will promptly send your Exclusive Sales Agreement, which formalizes the authorization and commission terms, and guide you through listing.")}
        </table>
        <p style="font-family:${SANS};font-size:14px;line-height:1.7;color:${BRAND_INK};margin:16px 0 0;">We look forward to achieving a successful sale on your behalf.</p>
      </td></tr>

      <!-- FOOTNOTE -->
      <tr><td style="padding:16px 40px 22px;border-top:1px solid ${BRAND_BORDER};background:${BRAND_BG_ACCENT};text-align:center;">
        <p style="font-family:${SANS};font-size:11px;color:${BRAND_INK_FAINT};margin:0;">Texas Cemetery Brokers · <a href="https://www.texascemeterybrokers.com" style="color:${BRAND_PRIMARY};text-decoration:none;">texascemeterybrokers.com</a></p>
      </td></tr>

    </table>
  </td></tr>
</table>
</div>
<p><br></p>`;

  return cardHtml.trim();
}

function nextStep(n: number, title: string, body: string) {
  return `
<tr>
  <td valign="top" width="34" style="padding:6px 12px 6px 0;">
    <div style="width:28px;height:28px;border-radius:999px;background:${BRAND_PRIMARY};color:${BRAND_PRIMARY_FG};font-family:${SERIF};font-size:14px;font-weight:700;text-align:center;line-height:28px;">${n}</div>
  </td>
  <td valign="top" style="padding:6px 0 12px;font-family:${SANS};font-size:14px;line-height:1.65;color:${BRAND_INK_MUTED};">
    <strong style="color:${BRAND_INK};font-weight:700;">${title}.</strong> ${body}
  </td>
</tr>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// Next Friday 5pm if today is Sat/Sun/Mon/Tue; next Tuesday 5pm if Wed/Thu/Fri.
function nextOfferDeadline(now: Date = new Date()): string {
  const day = now.getDay();
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
  }
  return bits.join(" · ");
}

function buildListingCard(
  tier: { id: string; label: string; price: number; priceLabel: string; blurb?: string; blurbTemplate?: (c: string) => string },
  url: string | null,
  free: boolean,
  cemLabel: string,
) {
  const buttonLabel = tier.price === 0 ? "Select Starter" : `Pay & select ${tier.label}`;
  const button = url
    ? `<a href="${url}" style="display:inline-block;background:${BRAND_PRIMARY};color:${BRAND_PRIMARY_FG};padding:14px 28px;border-radius:999px;text-decoration:none;font-family:${SANS};font-size:14.5px;font-weight:700;letter-spacing:.02em;">${buttonLabel}</a>`
    : free
      ? `<span style="display:inline-block;background:${BRAND_BG_ACCENT};color:${BRAND_INK_MUTED};padding:14px 28px;border-radius:999px;font-family:${SANS};font-size:14.5px;font-weight:600;border:1px solid ${BRAND_BORDER};">Reply to select</span>`
      : `<span style="display:inline-block;background:${BRAND_BG_ACCENT};color:${BRAND_INK_FAINT};padding:14px 28px;border-radius:999px;font-family:${SANS};font-size:14.5px;font-weight:500;border:1px solid ${BRAND_BORDER};">Payment link unavailable — reply to select</span>`;

  const blurb = tier.blurb ?? (tier.blurbTemplate ? tier.blurbTemplate(cemLabel) : "");
  const isFeatured = tier.id === "custom_plus";
  const cardBorder = isFeatured ? `2px solid ${BRAND_PRIMARY}` : `1px solid ${BRAND_BORDER}`;
  const cardBg = isFeatured ? BRAND_BG_ACCENT : BRAND_CARD_BG;

  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 14px;border-collapse:separate;border:${cardBorder};border-radius:12px;background:${cardBg};overflow:hidden;">
  <tr>
    <td style="padding:20px 22px;">
      <p style="font-family:${SERIF};font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:${BRAND_PRIMARY};margin:0 0 6px;font-weight:700;">${isFeatured ? "Recommended" : "Listing Option"}</p>
      <h2 style="font-family:${SERIF};font-size:20px;font-weight:600;color:${BRAND_INK};margin:0 0 2px;line-height:1.25;">${escapeHtml(tier.label)}</h2>
      <p style="font-family:${SANS};font-size:13px;color:${BRAND_PRIMARY};margin:0 0 12px;font-weight:700;letter-spacing:.02em;">${escapeHtml(tier.priceLabel)}</p>
      <p style="font-family:${SANS};font-size:13.5px;color:${BRAND_INK_MUTED};margin:0 0 16px;line-height:1.65;">${escapeHtml(blurb)}</p>
      <div style="margin-top:4px;">${button}</div>
      <p style="font-family:${SANS};font-size:11px;color:${BRAND_INK_FAINT};margin:10px 0 0;">Secure checkout via Stripe</p>
    </td>
  </tr>
</table>`.trim();
}
