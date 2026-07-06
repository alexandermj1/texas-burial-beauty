// Bayer Cemetery Brokers — one-off Guaranteed Sale Offer email.
// Multi-tier: multiple offer options with different timeframes (e.g. immediate
// direct purchase, 12-month guarantee, 24-month guarantee).
// Each tier renders as a clickable card that opens a mailto: acceptance.
// A contract link + attachment is generated from the same input fields.

import { BRANDS } from "./brands.ts";

export interface OfferTier {
  id: string;              // "immediate" | "guarantee-12" | "guarantee-24" | ...
  name: string;            // "Immediate Cash Purchase"
  timeframe: string;       // "Paid within 45 days of transfer"
  amount: string;          // "$14,500.00" (per plot net to seller)
  description: string;     // Short blurb
  badge?: string;          // Optional pill: "Fastest" / "Best value"
  highlight?: boolean;     // If true rendered in Bayer primary color
}

export interface GuaranteeOfferInput {
  recipientName: string;
  cemeteryName: string;
  cemeteryLocation: string;
  propertyDescription: string;
  numberOfPlots: string;
  transferFeeCoverage: string;
  paymentTimeline: string;
  typicalResaleWindow: string;
  acceptDeadline: string;
  option1Fee: string;
  option2CancelFee: string;
  option2MinTerm: string;
  officePhone: string;
  agentName: string;
  agentTitle: string;
  agentEmail: string;
  companyAddress: string;
  tiers: OfferTier[];
  subject?: string;
  preheader?: string;
  // Injected by the edge function so the URL contains the encoded offer
  contractUrl?: string;
}

export interface RenderedOffer {
  subject: string;
  html: string;
  text: string;
}

const esc = (s: string) => {
  const base = (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  // Preserve author-entered whitespace: newlines become <br>, and runs of
  // spaces keep their width by converting extras to &nbsp;.
  return base
    .replace(/\r\n?/g, "\n")
    .replace(/\n/g, "<br>")
    .replace(/ {2,}/g, (m) => " " + "&nbsp;".repeat(m.length - 1));
};

const enc = (s: string) => encodeURIComponent(s || "");

function buildAcceptMailto(i: GuaranteeOfferInput, tier: OfferTier): string {
  const subject = `Bayer Cemetery Brokers — I select "${tier.name}" for ${i.cemeteryName}`;
  const body =
    `Hi ${i.agentName.split(" ")[0]},\n\n` +
    `I've reviewed the Guaranteed Sale Offer for the property below and I'd like to proceed with the option indicated.\n\n` +
    `Property: ${i.cemeteryName}, ${i.cemeteryLocation}\n` +
    `${i.propertyDescription}\n` +
    `Plots: ${i.numberOfPlots}\n\n` +
    `Selected option: ${tier.name}\n` +
    `Timeframe: ${tier.timeframe}\n` +
    `Guaranteed net payment: ${tier.amount}\n\n` +
    `Please send the agreement across for signature and let me know the next steps.\n\n` +
    `Thanks,\n${i.recipientName}`;
  return `mailto:${i.agentEmail}?subject=${enc(subject)}&body=${enc(body)}`;
}

export function renderBayerGuaranteeOffer(i: GuaranteeOfferInput): RenderedOffer {
  const b = BRANDS.bayer;
  const sans = "'Helvetica Neue', Helvetica, Arial, sans-serif";
  const primaryTier = i.tiers.find((t) => t.highlight) || i.tiers[0];
  const subject = i.subject || `Guaranteed Sale Offer — ${i.cemeteryName}`;
  const preheader = i.preheader ||
    `Multiple guaranteed options for your property at ${i.cemeteryName} — including a fully-backed ${primaryTier?.amount || ""} written guarantee.`;
  const logoUrl = "https://www.texascemeterybrokers.com/__l5e/assets-v1/5fec1b45-9ea7-4701-8042-2118c14883e8/bayer-logo-navy.png";

  const tierCards = i.tiers.map((t) => {
    const mailto = buildAcceptMailto(i, t);
    const border = t.highlight ? `2px solid ${b.primary}` : `1px solid #e2e8f0`;
    const amountColor = t.highlight ? b.primary : "#0f172a";
    const badge = t.badge
      ? `<span style="display:inline-block;font-family:${sans};font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:${b.primary};background:${b.bgAccent};padding:4px 10px;border-radius:999px;font-weight:800;margin-left:8px;vertical-align:middle;">${esc(t.badge)}</span>`
      : "";
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;">
        <tr><td>
          <a href="${esc(mailto)}" style="display:block;text-decoration:none;color:inherit;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:${border};border-radius:10px;background:#ffffff;">
              <tr><td style="padding:20px 22px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                  <td valign="top" style="padding-right:16px;">
                    <p style="font-family:${sans};font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:${b.primary};margin:0 0 6px;font-weight:800;">Option${badge}</p>
                    <p style="font-family:${sans};font-size:18px;line-height:1.25;color:#0f172a;margin:0 0 4px;font-weight:800;letter-spacing:-0.01em;">${esc(t.name)}</p>
                    <p style="font-family:${sans};font-size:13px;line-height:1.55;color:#64748b;margin:0 0 10px;font-weight:600;">${esc(t.timeframe)}</p>
                    <p style="font-family:${sans};font-size:14px;line-height:1.6;color:#334155;margin:0;">${esc(t.description)}</p>
                  </td>
                  <td valign="top" align="right" width="200" style="min-width:180px;">
                    <p style="font-family:${sans};font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:${b.primary};margin:0 0 4px;font-weight:700;">Net to you</p>
                    <p style="font-family:${sans};font-size:26px;color:${amountColor};margin:0 0 12px;font-weight:800;letter-spacing:-0.02em;line-height:1;">${esc(t.amount)}</p>
                    <span style="display:inline-block;font-family:${sans};font-size:12px;font-weight:700;color:#ffffff;background:${b.primary};padding:8px 14px;border-radius:6px;text-transform:uppercase;letter-spacing:.08em;">Select this option →</span>
                  </td>
                </tr></table>
              </td></tr>
            </table>
          </a>
        </td></tr>
      </table>`;
  }).join("");

  const contractHref = i.contractUrl || "#";

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#dbe4f2;font-family:${sans};color:#0f172a;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#dbe4f2;padding:48px 20px;">
    <tr><td align="center">
      <table role="presentation" width="820" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:820px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 12px 40px rgba(30,58,138,0.14);">

        <!-- HEADER -->
        <tr><td align="center" style="background:#ffffff;padding:26px 40px 18px;border-bottom:1px solid #e2e8f0;">
          <img src="${logoUrl}" alt="Bayer Cemetery Brokers" width="92" style="display:block;width:92px;height:auto;object-fit:contain;margin:0 auto 10px;">
          <p style="font-family:${sans};font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:${b.primary};font-weight:700;margin:0;">Guaranteed Sale Offer</p>
        </td></tr>

        <!-- BODY -->
        <tr><td style="padding:36px 44px 8px;">
          <p style="font-family:${sans};font-size:15px;line-height:1.6;color:#0f172a;margin:0 0 18px;">Dear ${esc(i.recipientName)},</p>
          <p style="font-family:${sans};font-size:15px;line-height:1.7;color:#334155;margin:0 0 18px;">Thank you for the opportunity to review your property. Private plot resales can take <strong>${esc(i.typicalResaleWindow)}</strong>, so I&rsquo;ve outlined several written-guarantee options below — from an immediate direct purchase to longer horizons with higher net payments. Every option is backed by our firm commitment to buy the property ourselves at the stated amount if it hasn&rsquo;t sold within the window.</p>

          <!-- PROPERTY -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${b.bgAccent};border-radius:8px;margin:0 0 22px;">
            <tr><td style="padding:16px 20px;">
              <p style="font-family:${sans};font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:${b.primary};margin:0 0 6px;font-weight:700;">Property</p>
              <p style="font-family:${sans};font-size:15px;line-height:1.55;color:#0f172a;margin:0;font-weight:700;">${esc(i.cemeteryName)}, ${esc(i.cemeteryLocation)}</p>
              <p style="font-family:${sans};font-size:14px;line-height:1.55;color:#334155;margin:4px 0 0;">${esc(i.propertyDescription)}</p>
              <p style="font-family:${sans};font-size:13px;line-height:1.55;color:#64748b;margin:4px 0 0;">Number of plots: <strong style="color:#0f172a;">${esc(i.numberOfPlots)}</strong></p>
            </td></tr>
          </table>

          <p style="font-family:${sans};font-size:16px;color:#0f172a;margin:8px 0 12px;font-weight:800;letter-spacing:-0.01em;">Choose the option that fits you best</p>
          <p style="font-family:${sans};font-size:13px;line-height:1.6;color:#64748b;margin:0 0 18px;">Click any option below to reply with your selection. Nothing is finalised until you sign the agreement — this just tells us which route you&rsquo;d like to explore.</p>

          ${tierCards}

          <!-- COVERAGE + TIMELINE -->
          ${bullet("Cemetery fees covered", `We cover the ${esc(i.cemeteryName)} transfer and mandatory third-party cemetery-imposed costs up to <strong>${esc(i.transferFeeCoverage)}</strong>, so those fees do not reduce your net.`)}
          ${bullet("Payment timeline", `Net proceeds are remitted to you within <strong>${esc(i.paymentTimeline)}</strong> once title transfers.`)}
          ${bullet("Broker absorbs the risk", `The Guaranteed Net Payment is what you receive on the option you select. Bayer absorbs any market-price shortfall.`)}

          <!-- CONTRACT -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:10px;margin:22px 0 22px;background:#f8fafc;">
            <tr><td style="padding:22px 24px;">
              <p style="font-family:${sans};font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:${b.primary};margin:0 0 6px;font-weight:800;">Agreement</p>
              <p style="font-family:${sans};font-size:16px;line-height:1.35;color:#0f172a;margin:0 0 10px;font-weight:800;">Exclusive Right-to-Sell Agreement</p>
              <p style="font-family:${sans};font-size:14px;line-height:1.65;color:#334155;margin:0 0 14px;">A copy of the full agreement is attached to this email as a PDF (<em>Bayer-Guarantee-Agreement.pdf</em>) and can also be viewed online. All figures above are already pre-filled based on your property details. When you select an option we&rsquo;ll circulate the final agreement for e-signature.</p>
              <p style="font-family:${sans};font-size:14px;line-height:1.7;color:#334155;margin:0 0 10px;">Agreement commitment options:</p>
              <p style="font-family:${sans};font-size:13.5px;line-height:1.7;color:#334155;margin:0 0 4px;"><strong style="color:#0f172a;">Option A — Standard:</strong> ${esc(i.option1Fee)} one-time, non-refundable fee. Cancel any time with 10 days written notice.</p>
              <p style="font-family:${sans};font-size:13.5px;line-height:1.7;color:#334155;margin:0 0 16px;"><strong style="color:#0f172a;">Option B — Zero upfront:</strong> No upfront fee. ${esc(i.option2CancelFee)} early cancellation fee only if cancelled before ${esc(i.option2MinTerm)}. Same written guarantee.</p>
              <a href="${esc(contractHref)}" style="display:inline-block;font-family:${sans};font-size:13px;font-weight:800;color:#ffffff;background:${b.primary};padding:12px 20px;border-radius:8px;text-decoration:none;letter-spacing:.04em;">View agreement online →</a>
              <span style="display:inline-block;font-family:${sans};font-size:12px;color:#64748b;margin-left:12px;">PDF attached to this email</span>
            </td></tr>
          </table>

          <!-- DEADLINE -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${b.bgAccent};border-left:4px solid ${b.primary};border-radius:6px;margin:0 0 14px;">
            <tr><td style="padding:16px 20px;">
              <p style="font-family:${sans};font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:${b.primary};margin:0 0 6px;font-weight:800;">To Accept</p>
              <p style="font-family:${sans};font-size:14px;line-height:1.6;color:#0f172a;margin:0;">This offer is valid for acceptance until <strong>${esc(i.acceptDeadline)}</strong>. Click any option above, reply to this email, or call our office.</p>
            </td></tr>
          </table>

          <p style="font-family:${sans};font-size:14px;line-height:1.7;color:#334155;margin:0 0 22px;">If you have any questions, please call our office at <a href="tel:${esc(i.officePhone.replace(/[^0-9+]/g, ""))}" style="color:${b.primary};font-weight:700;text-decoration:none;">${esc(i.officePhone)}</a> or reply directly to this email.</p>

          <p style="font-family:${sans};font-size:14px;line-height:1.7;color:#0f172a;margin:0 0 8px;">Warm Regards,</p>
          <p style="font-family:${sans};font-size:14px;line-height:1.7;color:#0f172a;margin:0 0 24px;">${esc(i.agentName.split(" ")[0])}</p>
        </td></tr>

        <!-- SIGNATURE -->
        <tr><td style="padding:0 44px 36px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e2e8f0;">
            <tr><td style="padding:22px 0 0;">
              <p style="font-family:${sans};font-size:16px;line-height:1.3;color:#0f172a;margin:0;font-weight:800;letter-spacing:-0.01em;">${esc(i.agentName)}</p>
              <p style="font-family:${sans};font-size:12px;line-height:1.5;color:#64748b;margin:2px 0 10px;font-style:italic;">${esc(i.agentTitle)}</p>
              <p style="font-family:${sans};font-size:13px;line-height:1.5;color:#0f172a;margin:0;font-weight:700;">Bayer Cemetery Brokers</p>
              <p style="font-family:${sans};font-size:12px;line-height:1.6;color:#475569;margin:2px 0 8px;">${esc(i.companyAddress)}</p>
              <p style="font-family:${sans};font-size:12px;line-height:1.6;color:#334155;margin:0;">
                Telephone: <a href="tel:${esc(i.officePhone.replace(/[^0-9+]/g, ""))}" style="color:${b.primary};text-decoration:none;font-weight:600;">${esc(i.officePhone)}</a><br>
                <a href="mailto:${esc(i.agentEmail)}" style="color:${b.primary};text-decoration:none;font-weight:600;">${esc(i.agentEmail)}</a><br>
                <a href="https://bayercemeterybrokers.com/" style="color:${b.primary};text-decoration:none;font-weight:600;">bayercemeterybrokers.com</a>
              </p>
            </td></tr>
          </table>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="padding:20px 40px 26px;border-top:1px solid #e2e8f0;text-align:center;background:#f8fafc;">
          <p style="font-family:${sans};font-size:11px;color:#64748b;margin:0;">This message is intended solely for ${esc(i.recipientName)} regarding the specific property referenced above. If you received it in error, please reply to let us know.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;

  const tierText = i.tiers.map((t, idx) =>
    `${idx + 1}. ${t.name} — ${t.amount}\n   ${t.timeframe}\n   ${t.description}\n   Reply / mailto: ${buildAcceptMailto(i, t)}`
  ).join("\n\n");

  const text = `Dear ${i.recipientName},

Thank you for the opportunity to review your property. Private plot resales can take ${i.typicalResaleWindow}, so I've outlined several written-guarantee options below.

PROPERTY
${i.cemeteryName}, ${i.cemeteryLocation}
${i.propertyDescription}
Number of plots: ${i.numberOfPlots}

OFFER OPTIONS
${tierText}

TERMS
- Cemetery fees covered up to ${i.transferFeeCoverage}.
- Net proceeds remitted within ${i.paymentTimeline} of transfer.
- Bayer absorbs any market shortfall for the option you select.

AGREEMENT
The Exclusive Right-to-Sell Agreement is attached as a PDF. View online: ${contractHref}
- Option A — Standard: ${i.option1Fee} one-time, non-refundable. Cancel any time with 10 days notice.
- Option B — Zero upfront: No upfront fee. ${i.option2CancelFee} early cancel fee if cancelled before ${i.option2MinTerm}.

TO ACCEPT
This offer is valid until ${i.acceptDeadline}. Reply to this email or call ${i.officePhone}.

Warm Regards,
${i.agentName.split(" ")[0]}

${i.agentName}
${i.agentTitle}
Bayer Cemetery Brokers
${i.companyAddress}
Telephone: ${i.officePhone}
${i.agentEmail}
https://bayercemeterybrokers.com/`;

  return { subject, html, text };
}

function bullet(label: string, body: string): string {
  const sans = "'Helvetica Neue', Helvetica, Arial, sans-serif";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px;">
    <tr>
      <td valign="top" width="10" style="padding:8px 10px 0 0;"><div style="width:6px;height:6px;background:#1e3a8a;border-radius:999px;"></div></td>
      <td valign="top" style="font-family:${sans};font-size:14px;line-height:1.65;color:#334155;"><strong style="color:#0f172a;">${label}:</strong> ${body}</td>
    </tr>
  </table>`;
}

export const DEFAULT_TIERS: OfferTier[] = [
  {
    id: "immediate",
    name: "Immediate Direct Purchase",
    timeframe: "Bayer buys directly — paid within 45 days of transfer",
    amount: "$14,500.00",
    description: "Fastest possible exit. Bayer purchases the property directly for cash; you don't wait for a private buyer.",
    badge: "Fastest",
  },
  {
    id: "guarantee-12",
    name: "12-Month Guaranteed Sale",
    timeframe: "Guaranteed sold within 12 months — or Bayer buys it",
    amount: "$16,500.00",
    description: "Balanced option. We actively market for 12 months; if no private buyer is found, Bayer purchases at the guaranteed amount.",
    badge: "Balanced",
  },
  {
    id: "guarantee-24",
    name: "24-Month Guaranteed Sale",
    timeframe: "Guaranteed sold within 24 months — or Bayer buys it",
    amount: "$18,875.00",
    description: "Highest net payment. Longer marketing window (24 months) with the same written buy-back guarantee at the end.",
    badge: "Highest net",
    highlight: true,
  },
];

export const GUARANTEE_OFFER_DEFAULTS: GuaranteeOfferInput = {
  recipientName: "Ana Del Rio",
  cemeteryName: "Pacific View M.P.",
  cemeteryLocation: "Corona Del Mar, CA",
  propertyDescription: "Double Grave A, Lot 805, Bayview Terrace",
  numberOfPlots: "One (1)",
  transferFeeCoverage: "$700.00",
  paymentTimeline: "45 calendar days of transfer of title",
  typicalResaleWindow: "up to 10 years",
  acceptDeadline: "5:00 PM on Friday, July 17, 2026",
  option1Fee: "$99",
  option2CancelFee: "$299",
  option2MinTerm: "36 months",
  officePhone: "760-247-8518",
  agentName: "Emma MacLaren",
  agentTitle: "Portfolio Manager; Licensed Cemetery Salesperson",
  agentEmail: "emma@bayerbrokers.com",
  companyAddress: "12277 Apple Valley Rd, Ste 449, Apple Valley, CA 92308-1701, USA",
  tiers: DEFAULT_TIERS,
};
