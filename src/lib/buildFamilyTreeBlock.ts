// Branded "confirm your details" (family tree) block for the inline email
// composer. Mirrors the HTML the `ownership-questions` edge function sends, so
// the seller sees exactly the same page and the message is tagged as a
// family-tree email in the thread (data-family-tree="1").

export interface FamilyTreeBlockInput {
  submissionId: string;
  /** Optional greeting inside the card (the composer already writes one). */
  firstName?: string;
  cemetery?: string | null;
  /** Editable body copy — one paragraph per entry. */
  paragraphs: string[];
  /** Text on the branded button. */
  ctaLabel?: string;
  /** Optional closing note shown in the tinted "not sure?" card. */
  helpNote?: string;
}

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const PUBLIC_SITE_URL = "https://www.texascemeterybrokers.com";

export const familyTreeLink = (submissionId: string) =>
  `${PUBLIC_SITE_URL}/confirm?s=${submissionId}`;

export const defaultFamilyTreeParagraphs = (
  firstName: string,
  cemetery?: string | null,
): string[] => [
  `Thank you for trusting us with your property${cemetery ? ` at ${cemetery}` : ""}. Before we begin marketing it, the cemetery simply asks us to confirm who holds the right to sell — a short step that keeps everything moving smoothly later on.`,
  `Many of our buyers come to us while a funeral is already being arranged. When the ownership details are confirmed in advance, the transfer goes through without delay and the family is looked after straight away.`,
  `Everything is on one secure page — it takes about three minutes, with nothing to print and nothing to post.`,
];

export const defaultFamilyTreeHelpNote =
  "Leave anything you're unsure about blank and tell us on the last page, or call (214) 230-4740 — a broker will go through it with you. There is never a charge for asking.";

export const familyTreeSubject = (cemetery?: string | null) =>
  `A few quick questions about your plot${cemetery ? ` at ${cemetery}` : ""}`;

/**
 * Builds the full branded block (header, copy, CTA, help card, footer).
 * It carries its own branding, so the composer skips the outer shell for it.
 */
export const buildFamilyTreeBlock = (i: FamilyTreeBlockInput): string => {
  const link = familyTreeLink(i.submissionId);
  const body = i.paragraphs
    .filter((p) => p && p.trim())
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.7;color:#1f2a37;">${esc(
          p.trim(),
        )}</p>`,
    )
    .join("");

  return `
<div data-family-tree="1" data-tcb-email="family_tree" style="font-family:Georgia,'Times New Roman',serif;color:#1f2a37;background:#f5f1ea;padding:24px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;">
        <tr><td style="background:#1f2a37;color:#ffffff;padding:30px 40px;text-align:center;">
          <div style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#d9c7a3;">Texas Cemetery Brokers</div>
          <div style="font-size:22px;margin-top:10px;">A few quick questions</div>
        </td></tr>
        <tr><td style="padding:30px 40px;">
          ${
            i.firstName
              ? `<p style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.7;color:#1f2a37;">Dear ${esc(
                  i.firstName,
                )},</p>`
              : ""
          }
          ${body}
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px auto 8px;">
            <tr><td align="center" style="background:#1f2a37;border-radius:8px;">
              <a href="${esc(link)}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:16px;">
                ${esc(i.ctaLabel || "Confirm your details →")}
              </a>
            </td></tr>
          </table>
          <p style="margin:22px 0 0;font-size:13px;color:#4a5568;font-family:Georgia,'Times New Roman',serif;">
            Or copy this link into your browser:<br/>
            <span style="color:#1f2a37;word-break:break-all;">${esc(link)}</span>
          </p>
          ${
            i.helpNote && i.helpNote.trim()
              ? `<div style="margin:24px 0 0;padding:18px 20px;background:#f7f3ec;border-radius:10px;">
            <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#8a6d3b;">Not sure about an answer?</div>
            <p style="margin:8px 0 0;font-size:13px;color:#4a5568;line-height:1.7;font-family:Georgia,'Times New Roman',serif;">${esc(
              i.helpNote.trim(),
            )}</p>
          </div>`
              : ""
          }
        </td></tr>
        <tr><td style="background:#1f2a37;padding:20px 40px;text-align:center;">
          <div style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#d9c7a3;">Texas Cemetery Brokers</div>
          <div style="font-size:12px;color:#a9b4c2;margin-top:8px;">(214) 230-4740 · info@texascemeterybrokers.com · texascemeterybrokers.com</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>`.trim();
};
