// Bayer Cemetery Brokers — one-off Guaranteed Sale Offer email.
// Positions the offer as: we guarantee 100% purchase at the set net price
// within a fixed window (default 2 years), even if the plot never sells on
// the open market — some plots take up to a decade.

import { BRANDS } from "./brands.ts";

export interface GuaranteeOfferInput {
  recipientName: string;
  cemeteryName: string;
  cemeteryLocation: string;      // e.g. "Corona Del Mar, CA"
  propertyDescription: string;   // e.g. "Double Grave A, Lot 805, Bayview Terrace"
  numberOfPlots: string;         // e.g. "One (1)"
  guaranteedNetPayment: string;  // per-plot net e.g. "$18,875.00"
  totalGuaranteed: string;       // total across plots e.g. "$18,875.00"
  transferFeeCoverage: string;   // e.g. "$700.00"
  guaranteeWindow: string;       // e.g. "24 months (2 years)"
  paymentTimeline: string;       // e.g. "45 calendar days of transfer of title"
  typicalResaleWindow: string;   // e.g. "up to 10 years"
  acceptDeadline: string;        // e.g. "5:00 PM on Friday, July 18, 2026"
  option1Fee: string;            // e.g. "$99"
  option2CancelFee: string;      // e.g. "$299"
  option2MinTerm: string;        // e.g. "36 months"
  officePhone: string;
  agentName: string;
  agentTitle: string;
  agentEmail: string;
  companyAddress: string;
  subject?: string;
  preheader?: string;
}

export interface RenderedOffer {
  subject: string;
  html: string;
  text: string;
}

const esc = (s: string) =>
  (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderBayerGuaranteeOffer(i: GuaranteeOfferInput): RenderedOffer {
  const b = BRANDS.bayer;
  const sans = "'Helvetica Neue', Helvetica, Arial, sans-serif";
  const subject = i.subject || `Guaranteed Sale Offer — ${i.cemeteryName}`;
  const preheader = i.preheader ||
    `We guarantee ${i.guaranteedNetPayment} net for your property at ${i.cemeteryName} within ${i.guaranteeWindow}, even if it never sells on the open market.`;
  const logoUrl = "https://www.texascemeterybrokers.com/__l5e/assets-v1/5fec1b45-9ea7-4701-8042-2118c14883e8/bayer-logo-navy.png";

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
          <p style="font-family:${sans};font-size:15px;line-height:1.7;color:#334155;margin:0 0 18px;">Thank you for the opportunity to review your property. Because the resale market for individual interment rights can be slow — some plots take <strong>${esc(i.typicalResaleWindow)}</strong> to sell privately — I&rsquo;m writing to extend a firm, written guarantee that removes that uncertainty completely.</p>

          <!-- PROPERTY -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${b.bgAccent};border-radius:8px;margin:0 0 22px;">
            <tr><td style="padding:16px 20px;">
              <p style="font-family:${sans};font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:${b.primary};margin:0 0 6px;font-weight:700;">Property</p>
              <p style="font-family:${sans};font-size:15px;line-height:1.55;color:#0f172a;margin:0;font-weight:700;">${esc(i.cemeteryName)}, ${esc(i.cemeteryLocation)}</p>
              <p style="font-family:${sans};font-size:14px;line-height:1.55;color:#334155;margin:4px 0 0;">${esc(i.propertyDescription)}</p>
              <p style="font-family:${sans};font-size:13px;line-height:1.55;color:#64748b;margin:4px 0 0;">Number of plots: <strong style="color:#0f172a;">${esc(i.numberOfPlots)}</strong></p>
            </td></tr>
          </table>

          <!-- HEADLINE OFFER -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid ${b.primary};border-radius:10px;margin:0 0 22px;">
            <tr><td style="padding:24px 26px;">
              <p style="font-family:${sans};font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:${b.primary};margin:0 0 6px;font-weight:800;">The Guarantee</p>
              <p style="font-family:${sans};font-size:22px;line-height:1.25;color:#0f172a;margin:0 0 14px;font-weight:800;letter-spacing:-0.01em;">100% purchase within ${esc(i.guaranteeWindow)} — guaranteed in writing.</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${b.bgAccent};border-radius:6px;margin:0 0 18px;">
                <tr><td style="padding:16px 18px;">
                  <p style="font-family:${sans};font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:${b.primary};margin:0 0 6px;font-weight:700;">Guaranteed Net Payment (per plot)</p>
                  <p style="font-family:${sans};font-size:32px;color:${b.primary};margin:0 0 10px;font-weight:800;letter-spacing:-0.02em;line-height:1;">${esc(i.guaranteedNetPayment)}</p>
                  <p style="font-family:${sans};font-size:12px;color:#64748b;margin:0;">Total guaranteed across all plots: <strong style="color:#0f172a;">${esc(i.totalGuaranteed)}</strong></p>
                </td></tr>
              </table>

              ${bullet("How the guarantee works", `We list and actively market your property. If a private buyer isn&rsquo;t secured within <strong>${esc(i.guaranteeWindow)}</strong>, <strong>Bayer purchases the property directly</strong> at the full Guaranteed Net Payment above. You are paid either way.`)}
              ${bullet("No open-ended waiting", `The industry average for private plot resales runs anywhere from months to <strong>${esc(i.typicalResaleWindow)}</strong>. Our guarantee caps your exposure at ${esc(i.guaranteeWindow)}.`)}
              ${bullet("Broker absorbs the risk", `The Guaranteed Net Payment is what you receive. Bayer absorbs the market risk for any shortfall between the eventual sale price and the guaranteed amount.`)}
              ${bullet("Cemetery fees covered", `We cover the ${esc(i.cemeteryName)} transfer and mandatory third-party cemetery-imposed costs up to <strong>${esc(i.transferFeeCoverage)}</strong>, so those fees do not reduce your net.`)}
              ${bullet("Fast remittance on sale", `Net proceeds are remitted to you within <strong>${esc(i.paymentTimeline)}</strong>.`)}
            </td></tr>
          </table>

          <!-- AGREEMENT OPTIONS -->
          <p style="font-family:${sans};font-size:16px;color:#0f172a;margin:8px 0 12px;font-weight:800;letter-spacing:-0.01em;">Choose your agreement</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:10px;margin:0 0 14px;">
            <tr><td style="padding:20px 24px;">
              <p style="font-family:${sans};font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:${b.primary};margin:0 0 6px;font-weight:800;">Option 1 · Standard Agreement</p>
              <p style="font-family:${sans};font-size:17px;line-height:1.3;color:#0f172a;margin:0 0 8px;font-weight:800;">${esc(i.option1Fee)} one-time, non-refundable fee</p>
              <p style="font-family:${sans};font-size:14px;line-height:1.65;color:#334155;margin:0;">Full flexibility — you can cancel at any time with ten (10) days written notice, no additional penalty.</p>
            </td></tr>
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:10px;margin:0 0 22px;">
            <tr><td style="padding:20px 24px;">
              <p style="font-family:${sans};font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:${b.primary};margin:0 0 6px;font-weight:800;">Option 2 · Zero Upfront Cost</p>
              <p style="font-family:${sans};font-size:17px;line-height:1.3;color:#0f172a;margin:0 0 8px;font-weight:800;">No upfront fee</p>
              <p style="font-family:${sans};font-size:14px;line-height:1.65;color:#334155;margin:0;">${esc(i.option2CancelFee)} early cancellation fee applies only if the agreement is cancelled by you before ${esc(i.option2MinTerm)}. Otherwise identical terms and the same written guarantee.</p>
            </td></tr>
          </table>

          <!-- NEXT STEPS -->
          <p style="font-family:${sans};font-size:16px;color:#0f172a;margin:8px 0 12px;font-weight:800;letter-spacing:-0.01em;">Next Steps &amp; Deadline</p>
          <p style="font-family:${sans};font-size:14px;line-height:1.7;color:#334155;margin:0 0 14px;">The Guaranteed Net Payment is time-specific and reflects current market conditions and our capital allocation for this section. To lock in the figures above, please confirm your preferred option and return the signed agreement.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${b.bgAccent};border-left:4px solid ${b.primary};border-radius:6px;margin:0 0 14px;">
            <tr><td style="padding:16px 20px;">
              <p style="font-family:${sans};font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:${b.primary};margin:0 0 6px;font-weight:800;">To Accept</p>
              <p style="font-family:${sans};font-size:14px;line-height:1.6;color:#0f172a;margin:0;">This offer is valid for acceptance until <strong>${esc(i.acceptDeadline)}</strong>. Reply to this email or call our office and we will send the Exclusive Right-to-Sell Agreement in your chosen option for e-signature.</p>
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

  const text = `Dear ${i.recipientName},

Thank you for the opportunity to review your property. Because the resale market for individual interment rights can be slow — some plots take ${i.typicalResaleWindow} to sell privately — I'm writing to extend a firm, written guarantee that removes that uncertainty.

PROPERTY
${i.cemeteryName}, ${i.cemeteryLocation}
${i.propertyDescription}
Number of plots: ${i.numberOfPlots}

THE GUARANTEE — 100% purchase within ${i.guaranteeWindow}
Guaranteed Net Payment (per plot): ${i.guaranteedNetPayment}
Total guaranteed across all plots: ${i.totalGuaranteed}

- How it works: We list and actively market your property. If no private buyer is secured within ${i.guaranteeWindow}, Bayer purchases the property directly at the full Guaranteed Net Payment. You are paid either way.
- No open-ended waiting: Private plot resales can take ${i.typicalResaleWindow}. Our guarantee caps your exposure at ${i.guaranteeWindow}.
- Broker absorbs the risk: The Guaranteed Net Payment is what you receive. Bayer absorbs any market-price shortfall.
- Cemetery fees covered up to ${i.transferFeeCoverage}.
- Net proceeds remitted within ${i.paymentTimeline}.

AGREEMENT OPTIONS
Option 1 — Standard Agreement: ${i.option1Fee} one-time, non-refundable fee. Cancel any time with 10 days written notice.
Option 2 — Zero Upfront Cost: No upfront fee. ${i.option2CancelFee} early cancellation fee applies only if cancelled before ${i.option2MinTerm}. Same written guarantee.

TO ACCEPT
This offer is valid until ${i.acceptDeadline}. Reply to this email or call ${i.officePhone} and we will send the Exclusive Right-to-Sell Agreement for e-signature.

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

export const GUARANTEE_OFFER_DEFAULTS: GuaranteeOfferInput = {
  recipientName: "Ana Del Rio",
  cemeteryName: "Pacific View M.P.",
  cemeteryLocation: "Corona Del Mar, CA",
  propertyDescription: "Double Grave A, Lot 805, Bayview Terrace",
  numberOfPlots: "One (1)",
  guaranteedNetPayment: "$18,875.00",
  totalGuaranteed: "$18,875.00",
  transferFeeCoverage: "$700.00",
  guaranteeWindow: "24 months (2 years)",
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
};
