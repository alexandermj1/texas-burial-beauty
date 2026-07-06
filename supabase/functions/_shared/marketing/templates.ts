// Marketing email templates rendered as string HTML for maximum
// email-client compatibility (Outlook / Gmail / Apple Mail).
// Merge fields: {{firstName}}, {{company}}, {{city}}. All optional.

import { BRANDS, type MarketingBrand } from "./brands.ts";

export interface RenderContext {
  brand: MarketingBrand;
  firstName?: string | null;
  company?: string | null;
  city?: string | null;
  unsubscribeUrl: string;
  webviewUrl?: string;
  siteUrl?: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface TemplateDef {
  key: string;
  label: string;
  brand: MarketingBrand;
  defaultSubject: string;
  defaultPreheader: string;
  render: (ctx: RenderContext, overrides: { subject?: string; preheader?: string }) => RenderedEmail;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const salutation = (firstName?: string | null) => {
  const n = (firstName || "").trim().split(/\s+/)[0] || "";
  return n ? `Dear ${esc(n)},` : "Hello,";
};

// -------------------- Texas Cemetery Brokers --------------------

function renderTexasIntro(ctx: RenderContext, overrides: { subject?: string; preheader?: string }): RenderedEmail {
  const b = BRANDS.texas;
  const subject = overrides.subject || TEXAS_INTRO.defaultSubject;
  const preheader = overrides.preheader || TEXAS_INTRO.defaultPreheader;
  const cityLine = ctx.city ? ` around ${esc(ctx.city)}` : "";
  const companyLine = ctx.company ? ` at ${esc(ctx.company)}` : "";

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f5efe6;font-family:Georgia,serif;color:#1f2937;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5efe6;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;">
        <tr><td style="padding:40px 48px 24px;text-align:center;border-bottom:1px solid #e7e2d8;">
          <img src="${b.logoUrl}" alt="${esc(b.name)}" width="56" height="56" style="display:inline-block;width:56px;height:56px;object-fit:contain;">
          <p style="font-family:Georgia,serif;font-size:11px;letter-spacing:.36em;text-transform:uppercase;color:${b.primary};margin:12px 0 0;font-weight:700;">${esc(b.name)}</p>
          <p style="font-family:Georgia,serif;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#9a8f7a;margin:6px 0 0;font-style:italic;">${esc(b.tagline)}</p>
        </td></tr>
        <tr><td style="padding:36px 48px 8px;">
          <p style="font-family:Georgia,serif;font-size:15px;line-height:1.6;color:#1f2937;margin:0 0 20px;">${salutation(ctx.firstName)}</p>
          <h1 style="font-family:Georgia,serif;font-size:26px;line-height:1.25;color:#1f2937;margin:0 0 20px;font-weight:400;letter-spacing:-0.01em;">A quieter revenue stream${companyLine}${cityLine ? "," : "."}${cityLine ? esc(cityLine) + "." : ""}</h1>
          <p style="font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#1f2937;margin:0 0 18px;">Every week, families you serve realize they own cemetery property they no longer need — an inherited plot, a duplicate space, a move out of state. Most don't know what to do with it, and cemeteries won't buy it back.</p>
          <p style="font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#1f2937;margin:0 0 24px;">We handle the entire resale — listing, marketing, showings, contracts, and cemetery transfer paperwork — and pay your funeral home a referral commission on every closed sale. No inventory. No liability. No effort from your team.</p>
        </td></tr>
        <tr><td style="padding:0 48px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
            <tr>
              <td width="33%" valign="top" style="padding:20px 12px 20px 0;border-top:1px solid #e7e2d8;">
                <p style="font-family:Georgia,serif;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:${b.primary};margin:0 0 8px;font-weight:700;">01</p>
                <p style="font-family:Georgia,serif;font-size:14px;line-height:1.5;color:#1f2937;margin:0;">Below-retail pricing that families can actually afford.</p>
              </td>
              <td width="33%" valign="top" style="padding:20px 12px;border-top:1px solid #e7e2d8;">
                <p style="font-family:Georgia,serif;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:${b.primary};margin:0 0 8px;font-weight:700;">02</p>
                <p style="font-family:Georgia,serif;font-size:14px;line-height:1.5;color:#1f2937;margin:0;">A referral check to your mortuary at closing.</p>
              </td>
              <td width="34%" valign="top" style="padding:20px 0 20px 12px;border-top:1px solid #e7e2d8;">
                <p style="font-family:Georgia,serif;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:${b.primary};margin:0 0 8px;font-weight:700;">03</p>
                <p style="font-family:Georgia,serif;font-size:14px;line-height:1.5;color:#1f2937;margin:0;">Zero paperwork for your staff — we handle every step.</p>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:28px 48px 8px;">
          <a href="${esc(ctx.siteUrl || b.siteUrl)}/partners" style="display:inline-block;background:${b.primary};color:${b.primaryFg};font-family:Georgia,serif;font-size:14px;letter-spacing:.06em;text-transform:uppercase;padding:14px 32px;text-decoration:none;font-weight:600;">Become a Referral Partner</a>
        </td></tr>
        <tr><td style="padding:24px 48px 40px;">
          <p style="font-family:Georgia,serif;font-size:14px;line-height:1.7;color:#1f2937;margin:0 0 8px;">Happy to jump on a 10-minute call whenever it's convenient. Just reply to this email.</p>
          <p style="font-family:Georgia,serif;font-size:14px;line-height:1.7;color:#1f2937;margin:24px 0 0;">Warmly,<br><em>The team at Texas Cemetery Brokers</em></p>
        </td></tr>
        <tr><td style="padding:20px 48px 32px;border-top:1px solid #e7e2d8;text-align:center;background:${b.bgAccent};">
          <p style="font-family:Georgia,serif;font-size:11px;color:#9a8f7a;margin:0 0 6px;font-style:italic;">${esc(b.footerAddress)}</p>
          <p style="font-family:Georgia,serif;font-size:11px;color:#9a8f7a;margin:0;">You're receiving this because we work with funeral homes across Texas. <a href="${esc(ctx.unsubscribeUrl)}" style="color:${b.primary};text-decoration:underline;">Unsubscribe</a>.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = `${salutation(ctx.firstName).replace(/&amp;/g, "&")}

Every week families you serve realize they own cemetery property they no longer need. We handle the entire resale and pay your funeral home a referral commission on every closed sale.

- Below-retail pricing families can afford
- A referral check to your mortuary at closing
- Zero paperwork for your staff

Become a referral partner: ${ctx.siteUrl || b.siteUrl}/partners

Warmly,
The team at Texas Cemetery Brokers

Unsubscribe: ${ctx.unsubscribeUrl}`;

  return { subject, html, text };
}

// -------------------- Bayer Cemetery Brokers --------------------

function renderBayerIntro(ctx: RenderContext, overrides: { subject?: string; preheader?: string }): RenderedEmail {
  const b = BRANDS.bayer;
  const subject = overrides.subject || BAYER_INTRO.defaultSubject;
  const preheader = overrides.preheader || BAYER_INTRO.defaultPreheader;
  const cityLine = ctx.city ? ` in ${esc(ctx.city)}` : "";
  const companyName = ctx.company ? esc(ctx.company) : "your funeral home";
  const sans = "'Helvetica Neue', Helvetica, Arial, sans-serif";

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:${sans};color:#0f172a;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f6fb;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background:#ffffff;border-radius:6px;overflow:hidden;box-shadow:0 6px 24px rgba(30,58,138,0.08);">
        <tr><td style="background:${b.primary};padding:44px 40px 40px;text-align:center;">
          <img src="${b.logoUrl}" alt="${esc(b.name)}" width="180" style="display:inline-block;width:180px;height:auto;max-width:60%;object-fit:contain;">
          <p style="font-family:${sans};font-size:10px;letter-spacing:.38em;text-transform:uppercase;color:#c7d2fe;margin:18px 0 0;font-weight:600;">Nationwide cemetery resale</p>
        </td></tr>
        <tr><td style="padding:40px 40px 8px;">
          <p style="font-family:${sans};font-size:15px;line-height:1.6;color:#0f172a;margin:0 0 20px;">${salutation(ctx.firstName)}</p>
          <h1 style="font-family:${sans};font-size:28px;line-height:1.2;color:#0f172a;margin:0 0 20px;font-weight:700;letter-spacing:-0.02em;">A partnership that pays ${companyName}${cityLine}.</h1>
          <p style="font-family:${sans};font-size:15px;line-height:1.7;color:#334155;margin:0 0 18px;">Families you serve often own cemetery property they no longer need — inherited plots, duplicate spaces, or a burial arrangement that no longer fits. Cemeteries won't buy it back. Families don't know where to turn.</p>
          <p style="font-family:${sans};font-size:15px;line-height:1.7;color:#334155;margin:0 0 28px;"><strong style="color:#0f172a;">Bayer Cemetery Brokers</strong> handles the entire resale — listing, marketing, showings, contracts, and cemetery transfers — at prices well below retail. Your funeral home receives a referral commission on every closed sale.</p>
        </td></tr>
        <tr><td style="padding:0 40px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:8px 0;">
            <tr>
              <td width="33%" valign="top" style="background:${b.bgAccent};padding:22px 18px;border-radius:6px;">
                <p style="font-family:${sans};font-size:26px;color:${b.primary};margin:0 0 6px;font-weight:800;line-height:1;">$0</p>
                <p style="font-family:${sans};font-size:12px;line-height:1.5;color:#0f172a;margin:0;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Cost to families</p>
                <p style="font-family:${sans};font-size:12px;line-height:1.5;color:#475569;margin:6px 0 0;">Below-retail pricing they can actually afford.</p>
              </td>
              <td width="33%" valign="top" style="background:${b.bgAccent};padding:22px 18px;border-radius:6px;">
                <p style="font-family:${sans};font-size:26px;color:${b.primary};margin:0 0 6px;font-weight:800;line-height:1;">%</p>
                <p style="font-family:${sans};font-size:12px;line-height:1.5;color:#0f172a;margin:0;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Referral commission</p>
                <p style="font-family:${sans};font-size:12px;line-height:1.5;color:#475569;margin:6px 0 0;">A check to your funeral home at every closing.</p>
              </td>
              <td width="34%" valign="top" style="background:${b.bgAccent};padding:22px 18px;border-radius:6px;">
                <p style="font-family:${sans};font-size:26px;color:${b.primary};margin:0 0 6px;font-weight:800;line-height:1;">0h</p>
                <p style="font-family:${sans};font-size:12px;line-height:1.5;color:#0f172a;margin:0;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Staff time</p>
                <p style="font-family:${sans};font-size:12px;line-height:1.5;color:#475569;margin:6px 0 0;">We handle every showing, contract, and transfer.</p>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px 40px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="border-left:3px solid ${b.primary};padding:2px 0 2px 16px;">
              <p style="font-family:${sans};font-size:15px;line-height:1.6;color:#0f172a;margin:0;font-style:italic;">"They took the entire process off our plate and sent us a check. Our families got affordable options we couldn't offer ourselves."</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:32px 40px 8px;">
          <a href="${esc(ctx.siteUrl || b.siteUrl)}/partners" style="display:inline-block;background:${b.primary};color:${b.primaryFg};font-family:${sans};font-size:14px;letter-spacing:.05em;padding:16px 36px;text-decoration:none;font-weight:700;border-radius:4px;">Become a Referral Partner</a>
          <p style="font-family:${sans};font-size:12px;color:#64748b;margin:12px 0 0;">Or just reply — a 10-minute call is enough to see if we're a fit.</p>
        </td></tr>
        <tr><td style="padding:28px 40px 40px;">
          <p style="font-family:${sans};font-size:14px;line-height:1.6;color:#334155;margin:0;">Best,<br><strong style="color:#0f172a;">The Bayer Cemetery Brokers team</strong></p>
        </td></tr>
        <tr><td style="padding:24px 40px 28px;border-top:1px solid #e2e8f0;text-align:center;background:#f8fafc;">
          <p style="font-family:${sans};font-size:11px;color:#64748b;margin:0 0 6px;">${esc(b.footerAddress)}</p>
          <p style="font-family:${sans};font-size:11px;color:#64748b;margin:0;">You're receiving this because we partner with funeral homes nationwide. <a href="${esc(ctx.unsubscribeUrl)}" style="color:${b.primary};text-decoration:underline;">Unsubscribe</a>.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = `${salutation(ctx.firstName).replace(/&amp;/g, "&")}

Families you serve often own cemetery property they no longer need. Bayer Cemetery Brokers handles the entire resale at below-retail prices and pays your funeral home a referral commission on every closed sale.

- $0 cost to families
- Referral commission to your funeral home
- Zero staff time — we handle everything

Become a partner: ${ctx.siteUrl || b.siteUrl}/partners

Best,
The Bayer Cemetery Brokers team

Unsubscribe: ${ctx.unsubscribeUrl}`;

  return { subject, html, text };
}

export const TEXAS_INTRO: TemplateDef = {
  key: "texas-intro-mortuaries",
  label: "Intro to mortuaries",
  brand: "texas",
  defaultSubject: "A quieter revenue stream for your funeral home",
  defaultPreheader: "We list unused cemetery plots for families you serve — and pay you a referral commission on every sale.",
  render: renderTexasIntro,
};

export const BAYER_INTRO: TemplateDef = {
  key: "bayer-intro-mortuaries",
  label: "Intro to mortuaries",
  brand: "bayer",
  defaultSubject: "Partnering with your funeral home on unused cemetery plots",
  defaultPreheader: "We resell unused cemetery property for families you serve — and pay a referral commission on every closed sale.",
  render: renderBayerIntro,
};

export const TEMPLATES: Record<string, TemplateDef> = {
  [TEXAS_INTRO.key]: TEXAS_INTRO,
  [BAYER_INTRO.key]: BAYER_INTRO,
};

export function getTemplate(key: string): TemplateDef | null {
  return TEMPLATES[key] || null;
}

export function listTemplates(brand?: MarketingBrand): TemplateDef[] {
  return Object.values(TEMPLATES).filter((t) => !brand || t.brand === brand);
}
