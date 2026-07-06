// Bayer Cemetery Brokers — one-off Direct Purchase Offer email.
// Fully data-driven so the admin can edit every field before sending.

import { BRANDS } from "./brands.ts";

export interface PurchaseOfferInput {
  recipientName: string;
  cemeteryName: string;
  cemeteryLocation: string;   // e.g. "Covina Hills, CA"
  propertyDescription: string; // e.g. "Garden of Family Love, Lot 1371, Single Lawn Crypt Space 3"
  acquisitionMonth: string;    // e.g. "May 2026"
  directOffer: string;         // e.g. "$4,215.00"
  transferFeeCovered: string;  // e.g. "$400.00"
  brokerageTarget: string;     // e.g. "$6,150.00"
  resaleWindow: string;        // e.g. "21-30 days"
  documentReturnWindow: string; // e.g. "7 business days"
  acceptDeadline: string;      // e.g. "5:00 PM on Friday, May 22, 2026"
  signatureWindow: string;     // e.g. "48-hour"
  officePhone: string;         // e.g. "760-247-8518"
  agentName: string;           // e.g. "Emma MacLaren"
  agentTitle: string;          // e.g. "Portfolio Manager; Licensed Cemetery Salesperson"
  agentEmail: string;          // e.g. "emma@bayerbrokers.com"
  companyAddress: string;      // e.g. "12277 Apple Valley Rd, Ste 449, Apple Valley, CA 92308-1701, USA"
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

export function renderBayerPurchaseOffer(i: PurchaseOfferInput): RenderedOffer {
  const b = BRANDS.bayer;
  const sans = "'Helvetica Neue', Helvetica, Arial, sans-serif";
  const subject = i.subject || `Direct Purchase Offer — ${i.cemeteryName}`;
  const preheader = i.preheader ||
    `Direct cash offer of ${i.directOffer} for your property at ${i.cemeteryName}. Valid until ${i.acceptDeadline}.`;
  const logoUrl = "https://www.texascemeterybrokers.com/__l5e/assets-v1/5fec1b45-9ea7-4701-8042-2118c14883e8/bayer-logo-navy.png";

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#dbe4f2;font-family:${sans};color:#0f172a;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#dbe4f2;padding:36px 14px;">
    <tr><td align="center">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 8px 28px rgba(30,58,138,0.12);">

        <!-- HEADER -->
        <tr><td align="center" style="background:#ffffff;padding:26px 40px 18px;border-bottom:1px solid #e2e8f0;">
          <img src="${logoUrl}" alt="Bayer Cemetery Brokers" width="92" style="display:block;width:92px;height:auto;object-fit:contain;margin:0 auto 10px;">
          <p style="font-family:${sans};font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:${b.primary};font-weight:700;margin:0;">Direct Purchase Offer</p>
        </td></tr>

        <!-- BODY -->
        <tr><td style="padding:36px 44px 8px;">
          <p style="font-family:${sans};font-size:15px;line-height:1.6;color:#0f172a;margin:0 0 18px;">Dear ${esc(i.recipientName)},</p>
          <p style="font-family:${sans};font-size:15px;line-height:1.7;color:#334155;margin:0 0 18px;">Thank you for providing a copy of the deed and prepaid endowment care documentation. Based on those specific property details, I am able to provide a direct purchase option for your property:</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${b.bgAccent};border-radius:8px;margin:0 0 22px;">
            <tr><td style="padding:16px 20px;">
              <p style="font-family:${sans};font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:${b.primary};margin:0 0 6px;font-weight:700;">Property</p>
              <p style="font-family:${sans};font-size:15px;line-height:1.55;color:#0f172a;margin:0;font-weight:700;">${esc(i.cemeteryName)}, ${esc(i.cemeteryLocation)}</p>
              <p style="font-family:${sans};font-size:14px;line-height:1.55;color:#334155;margin:4px 0 0;">${esc(i.propertyDescription)}</p>
            </td></tr>
          </table>
          <p style="font-family:${sans};font-size:15px;line-height:1.7;color:#334155;margin:0 0 18px;">Your property is currently being considered for one of our available acquisition slots for <strong>${esc(i.acquisitionMonth)}</strong>. Please note that we only purchase a limited number of properties each month.</p>
          <p style="font-family:${sans};font-size:15px;line-height:1.7;color:#334155;margin:0 0 24px;">Based on the current resale market for this specific section, I have outlined our direct purchase offer below, along with the full-service brokerage option previously provided by our office:</p>

          <!-- OPTION 1 -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid ${b.primary};border-radius:10px;margin:0 0 20px;">
            <tr><td style="padding:22px 24px;">
              <p style="font-family:${sans};font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:${b.primary};margin:0 0 6px;font-weight:800;">Option 1 · New Request</p>
              <p style="font-family:${sans};font-size:20px;line-height:1.25;color:#0f172a;margin:0 0 4px;font-weight:800;letter-spacing:-0.01em;">Direct Cash Purchase</p>
              <p style="font-family:${sans};font-size:13px;color:#64748b;margin:0 0 18px;font-weight:600;letter-spacing:.02em;text-transform:uppercase;">Liquidity Option</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${b.bgAccent};border-radius:6px;margin:0 0 16px;">
                <tr><td style="padding:16px 18px;">
                  <p style="font-family:${sans};font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:${b.primary};margin:0 0 6px;font-weight:700;">Guaranteed Net Payment to You</p>
                  <p style="font-family:${sans};font-size:30px;color:${b.primary};margin:0;font-weight:800;letter-spacing:-0.02em;line-height:1;">${esc(i.directOffer)}</p>
                </td></tr>
              </table>
              ${bullet("Speed", `This is the fastest method to receive payment and allows for an expedited cash release for the property.`)}
              ${bullet("Fee Coverage Included", `We will pay ${esc(i.cemeteryName)}'s cemetery transfer fee (up to ${esc(i.transferFeeCovered)}) on your behalf. This is included in our offer, so your final net check remains <strong>${esc(i.directOffer)}</strong>.`)}
              ${bullet("Terms of Offer", `This valuation is based on our specific inventory needs and ${esc(i.acquisitionMonth.split(" ")[0])} capital allocation. This offer is contingent upon the return of all completed and notarized documents within <strong>${esc(i.documentReturnWindow)}</strong> of receipt. If documents are not returned promptly, the reserved capital allocation may be released to another property and this offer will expire.`)}
              ${bullet("Timing", `This option allows for the most streamlined exit. Bayer issues your check payment immediately when ${esc(i.cemeteryName)} confirms the property transfer is complete.`)}
            </td></tr>
          </table>

          <!-- OPTION 2 -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:10px;margin:0 0 24px;">
            <tr><td style="padding:22px 24px;">
              <p style="font-family:${sans};font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#64748b;margin:0 0 6px;font-weight:800;">Option 2 · Previously Provided</p>
              <p style="font-family:${sans};font-size:20px;line-height:1.25;color:#0f172a;margin:0 0 18px;font-weight:800;letter-spacing:-0.01em;">Full-Service Brokerage Listing</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-radius:6px;margin:0 0 16px;">
                <tr><td style="padding:16px 18px;">
                  <p style="font-family:${sans};font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#64748b;margin:0 0 6px;font-weight:700;">Target Net Payment to You</p>
                  <p style="font-family:${sans};font-size:26px;color:#0f172a;margin:0;font-weight:800;letter-spacing:-0.02em;line-height:1;">${esc(i.brokerageTarget)}</p>
                </td></tr>
              </table>
              ${bullet("Value", `Our team manages the entire resale process, including professional advertising and in-person showings by our staff of over 40 licensed salespeople, to secure a private buyer.`)}
              ${bullet("Logistics", `We handle marketing and coordinate with the cemetery to manage the transfer process on the open market.`)}
              ${bullet("Timeline", `This option maximizes your gross list price but is subject to the timing of the resale market, and the timeline to close is not guaranteed.`)}
            </td></tr>
          </table>

          <!-- NEXT STEPS -->
          <p style="font-family:${sans};font-size:16px;color:#0f172a;margin:8px 0 12px;font-weight:800;letter-spacing:-0.01em;">Next Steps &amp; Deadlines</p>
          <p style="font-family:${sans};font-size:14px;line-height:1.7;color:#334155;margin:0 0 14px;">Both these valuations are time-specific, based on the property being available for us to sell on the resale market within the next <strong>${esc(i.resaleWindow)}</strong>. The direct purchase offer assumes the property is held in your sole name with a standard <strong>${esc(i.transferFeeCovered)}</strong> transfer fee. Offers are contingent upon the Purchase or Listing Agreement and all supporting documentation/notarization required for the transfer being fully executed in a timely manner.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${b.bgAccent};border-left:4px solid ${b.primary};border-radius:6px;margin:0 0 14px;">
            <tr><td style="padding:16px 20px;">
              <p style="font-family:${sans};font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:${b.primary};margin:0 0 6px;font-weight:800;">To Accept</p>
              <p style="font-family:${sans};font-size:14px;line-height:1.6;color:#0f172a;margin:0;">This offer is valid for acceptance until <strong>${esc(i.acceptDeadline)}</strong>. Please reply to this email or call our office with your decision.</p>
            </td></tr>
          </table>
          <p style="font-family:${sans};font-size:14px;line-height:1.7;color:#334155;margin:0 0 22px;"><strong style="color:#0f172a;">Purchase Agreement:</strong> If you choose to proceed with a direct cash buyout, we will issue a formal Purchase Agreement with a ${esc(i.signatureWindow)} window for signature to ensure we can properly allocate the funds to this transaction.</p>
          <p style="font-family:${sans};font-size:14px;line-height:1.7;color:#334155;margin:0 0 22px;">Please let us know which path aligns best with your goals and we will provide the appropriate documents and instructions regarding next steps. If you have any questions, feel free to call our office at <a href="tel:${esc(i.officePhone.replace(/[^0-9+]/g, ""))}" style="color:${b.primary};font-weight:700;text-decoration:none;">${esc(i.officePhone)}</a> or reply to this email.</p>

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

Thank you for providing a copy of the deed and prepaid endowment care documentation. Based on those specific property details, I am able to provide a direct purchase option for your property: ${i.cemeteryName}, ${i.cemeteryLocation}; ${i.propertyDescription}.

Your property is currently being considered for one of our available acquisition slots for ${i.acquisitionMonth}. We only purchase a limited number of properties each month.

OPTION 1: DIRECT CASH PURCHASE (Liquidity Option / New Request)
Guaranteed Net Payment to You: ${i.directOffer}
- Speed: Fastest method to receive payment.
- Fee Coverage Included: We pay ${i.cemeteryName}'s transfer fee (up to ${i.transferFeeCovered}). Your final net check remains ${i.directOffer}.
- Terms: Offer contingent upon return of completed and notarized documents within ${i.documentReturnWindow} of receipt.
- Timing: Check issued immediately when ${i.cemeteryName} confirms the transfer.

OPTION 2: FULL-SERVICE BROKERAGE LISTING (Previously Provided)
Target Net Payment to You: ${i.brokerageTarget}
- Our team manages the entire resale process with 40+ licensed salespeople.
- We handle marketing and coordinate with the cemetery.
- Timeline subject to the resale market and not guaranteed.

NEXT STEPS & DEADLINES
Both valuations are time-specific, based on the property being available on the resale market within the next ${i.resaleWindow}. Direct purchase offer assumes sole ownership with a standard ${i.transferFeeCovered} transfer fee.

To Accept: This offer is valid until ${i.acceptDeadline}. Reply to this email or call ${i.officePhone}.
Purchase Agreement: If accepted, we will issue a formal Purchase Agreement with a ${i.signatureWindow} signature window.

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

export const PURCHASE_OFFER_DEFAULTS: PurchaseOfferInput = {
  recipientName: "Christophe Chang",
  cemeteryName: "Forest Lawn M.P.",
  cemeteryLocation: "Covina Hills, CA",
  propertyDescription: "Garden of Family Love, Lot 1371, Single Lawn Crypt Space 3",
  acquisitionMonth: "May 2026",
  directOffer: "$4,215.00",
  transferFeeCovered: "$400.00",
  brokerageTarget: "$6,150.00",
  resaleWindow: "21-30 days",
  documentReturnWindow: "7 business days",
  acceptDeadline: "5:00 PM on Friday, May 22, 2026",
  signatureWindow: "48-hour",
  officePhone: "760-247-8518",
  agentName: "Emma MacLaren",
  agentTitle: "Portfolio Manager; Licensed Cemetery Salesperson",
  agentEmail: "emma@bayerbrokers.com",
  companyAddress: "12277 Apple Valley Rd, Ste 449, Apple Valley, CA 92308-1701, USA",
};
