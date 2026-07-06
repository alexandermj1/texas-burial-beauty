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

  const cdnHost = "https://www.texascemeterybrokers.com";
  const plots = [
    {
      img: `${cdnHost}/__l5e/assets-v1/a3786c0d-cac1-4894-b960-70529b46b2ac/bayer-plot-1.jpg`,
      cemetery: "Rose Hills",
      garden: "Garden of Affection · Lot 2",
      price: "$9,900",
      retail: "$12,900",
    },
    {
      img: `${cdnHost}/__l5e/assets-v1/8e516e3d-13a9-44c5-8b2a-48b3adc51de6/bayer-plot-2.jpg`,
      cemetery: "Forest Lawn Glendale",
      garden: "Garden of Memories",
      price: "$14,000",
      retail: "$22,900",
    },
    {
      img: `${cdnHost}/__l5e/assets-v1/1670150c-85de-4562-8c1c-f7e6133ab4f6/bayer-plot-3.jpg`,
      cemetery: "Hollywood Forever",
      garden: "Garden of Affection · Lot 2",
      price: "$9,900",
      retail: "$12,900",
    },
    {
      img: `${cdnHost}/__l5e/assets-v1/f87ebe3a-6738-4082-81aa-6f129c0c82ef/bayer-plot-4.jpg`,
      cemetery: "Forest Lawn Covina",
      garden: "Garden of Memories",
      price: "$14,000",
      retail: "$22,900",
    },
  ];

  const pctOff = (price: string, retail: string) => {
    const p = parseFloat(price.replace(/[^0-9.]/g, ""));
    const r = parseFloat(retail.replace(/[^0-9.]/g, ""));
    if (!p || !r || r <= p) return "";
    return `${Math.round((1 - p / r) * 100)}% OFF`;
  };

  const plotCard = (p: typeof plots[number]) => `
    <td width="50%" valign="top" style="padding:10px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;box-shadow:0 2px 6px rgba(15,23,42,0.04);">
        <tr><td style="padding:0;line-height:0;position:relative;">
          <img src="${p.img}" alt="${esc(p.cemetery)}" width="270" style="display:block;width:100%;height:170px;object-fit:cover;">
          <div style="position:absolute;top:14px;left:14px;background:${b.primary};color:#ffffff;font-family:${sans};font-size:10px;font-weight:800;letter-spacing:.12em;padding:7px 12px;border-radius:4px;box-shadow:0 2px 6px rgba(15,23,42,0.18);">${pctOff(p.price, p.retail)}</div>
        </td></tr>
        <tr><td style="padding:18px 20px 20px;">
          <p style="font-family:${sans};font-size:15px;color:#0f172a;margin:0 0 3px;font-weight:700;letter-spacing:-0.01em;line-height:1.3;">${esc(p.cemetery)}</p>
          <p style="font-family:${sans};font-size:12px;color:#64748b;margin:0 0 16px;line-height:1.4;">${esc(p.garden)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="baseline" style="font-family:${sans};">
              <span style="font-size:13px;color:#94a3b8;text-decoration:line-through;">${esc(p.retail)}</span>
              &nbsp;<span style="font-size:22px;color:${b.primary};font-weight:800;letter-spacing:-0.02em;">${esc(p.price)}</span>
            </td>
            <td align="right" valign="baseline" style="font-family:${sans};font-size:10px;color:#16a34a;font-weight:700;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;">● Available</td>
          </tr></table>
        </td></tr>
      </table>
    </td>`;



  const regions = ["Los Angeles", "San Bernardino", "Orange County", "San Diego"];
  const regionPills = regions.map((r) =>
    `<span style="display:inline-block;background:${b.bgAccent};color:${b.primary};font-family:${sans};font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:6px 12px;border-radius:999px;margin:4px 4px 0 0;">${esc(r)}</span>`
  ).join("");

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:${sans};color:#0f172a;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f6fb;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 6px 24px rgba(30,58,138,0.08);">

        <!-- HEADER -->
        <tr><td style="background:#ffffff;padding:28px 40px 20px;border-bottom:1px solid #e2e8f0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td valign="middle" align="left" style="line-height:0;">
                <img src="https://mceguxfdoikjthsrbmzx.supabase.co/storage/v1/object/public/listing-photos/marketing/bayer-logo-navy.png" alt="${esc(b.name)}" width="120" style="display:inline-block;width:120px;height:auto;object-fit:contain;">
              </td>
              <td valign="middle" align="right" style="font-family:${sans};font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:${b.primary};font-weight:700;">
                Save families 15% – 50%
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- INTRO -->
        <tr><td style="padding:40px 40px 8px;">
          <p style="font-family:${sans};font-size:15px;line-height:1.6;color:#0f172a;margin:0 0 20px;">${salutation(ctx.firstName)}</p>
          <h1 style="font-family:${sans};font-size:28px;line-height:1.2;color:#0f172a;margin:0 0 20px;font-weight:700;letter-spacing:-0.02em;">A partnership that pays ${companyName}${cityLine}.</h1>
          <p style="font-family:${sans};font-size:15px;line-height:1.7;color:#334155;margin:0 0 18px;">Families you serve often own cemetery property they no longer need — inherited plots, duplicate spaces, or a burial arrangement that no longer fits. Cemeteries won't buy it back, and families come to you looking for options.</p>
          <p style="font-family:${sans};font-size:15px;line-height:1.7;color:#334155;margin:0 0 8px;"><strong style="color:#0f172a;">Bayer Cemetery Brokers</strong> lists those plots at <strong>15%–50% below retail</strong> — pricing your families can actually afford — and pays your funeral home a referral commission on every closed sale. Zero paperwork. Zero risk. Zero listing fees to you.</p>
        </td></tr>

        <!-- STAT STRIP -->
        <tr><td style="padding:20px 40px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:8px 0;">
            <tr>
              <td width="33%" valign="top" style="background:${b.bgAccent};padding:22px 18px;border-radius:8px;">
                <p style="font-family:${sans};font-size:26px;color:${b.primary};margin:0 0 6px;font-weight:800;line-height:1;">1,100+</p>
                <p style="font-family:${sans};font-size:11px;line-height:1.5;color:#0f172a;margin:0;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Plots in inventory</p>
                <p style="font-family:${sans};font-size:12px;line-height:1.5;color:#475569;margin:6px 0 0;">Across LA, OC, IE &amp; San Diego.</p>
              </td>
              <td width="33%" valign="top" style="background:${b.bgAccent};padding:22px 18px;border-radius:8px;">
                <p style="font-family:${sans};font-size:26px;color:${b.primary};margin:0 0 6px;font-weight:800;line-height:1;">15–50%</p>
                <p style="font-family:${sans};font-size:11px;line-height:1.5;color:#0f172a;margin:0;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Below retail</p>
                <p style="font-family:${sans};font-size:12px;line-height:1.5;color:#475569;margin:6px 0 0;">Instant savings for grieving families.</p>
              </td>
              <td width="34%" valign="top" style="background:${b.bgAccent};padding:22px 18px;border-radius:8px;">
                <p style="font-family:${sans};font-size:26px;color:${b.primary};margin:0 0 6px;font-weight:800;line-height:1;">0h</p>
                <p style="font-family:${sans};font-size:11px;line-height:1.5;color:#0f172a;margin:0;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Staff time</p>
                <p style="font-family:${sans};font-size:12px;line-height:1.5;color:#475569;margin:6px 0 0;">We handle everything end-to-end.</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- FEATURED PLOTS -->
        <tr><td style="padding:32px 32px 8px;">
          <p style="font-family:${sans};font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:${b.primary};margin:0 0 6px;font-weight:700;text-align:center;">This month's featured inventory</p>
          <h2 style="font-family:${sans};font-size:22px;color:#0f172a;margin:0 0 20px;font-weight:700;letter-spacing:-0.01em;text-align:center;">Real plots. Real savings.</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>${plotCard(plots[0])}${plotCard(plots[1])}</tr>
            <tr>${plotCard(plots[2])}${plotCard(plots[3])}</tr>
          </table>
          <p style="font-family:${sans};font-size:12px;color:#64748b;margin:16px 0 0;text-align:center;">Plus 1,100+ additional plots across Southern California. <a href="${esc(ctx.siteUrl || b.siteUrl)}/listings" style="color:${b.primary};font-weight:700;text-decoration:none;">Browse full inventory →</a></p>
        </td></tr>

        <!-- HOW IT WORKS -->
        <tr><td style="padding:36px 40px 8px;">
          <p style="font-family:${sans};font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:${b.primary};margin:0 0 6px;font-weight:700;">How the partnership works</p>
          <h2 style="font-family:${sans};font-size:22px;color:#0f172a;margin:0 0 22px;font-weight:700;letter-spacing:-0.01em;">Three steps. Zero lift on your team.</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td valign="top" width="44" style="padding:0 14px 20px 0;">
                <div style="width:36px;height:36px;background:${b.primary};color:#ffffff;border-radius:999px;font-family:${sans};font-size:15px;font-weight:800;text-align:center;line-height:36px;">1</div>
              </td>
              <td valign="top" style="padding:0 0 20px 0;">
                <p style="font-family:${sans};font-size:15px;color:#0f172a;margin:0 0 4px;font-weight:700;">Hand us the family — we take it from there.</p>
                <p style="font-family:${sans};font-size:14px;color:#475569;margin:0;line-height:1.6;">A quick warm intro is all we need. We consult, price, and photograph the property.</p>
              </td>
            </tr>
            <tr>
              <td valign="top" width="44" style="padding:0 14px 20px 0;">
                <div style="width:36px;height:36px;background:${b.primary};color:#ffffff;border-radius:999px;font-family:${sans};font-size:15px;font-weight:800;text-align:center;line-height:36px;">2</div>
              </td>
              <td valign="top" style="padding:0 0 20px 0;">
                <p style="font-family:${sans};font-size:15px;color:#0f172a;margin:0 0 4px;font-weight:700;">We list, market, and sell.</p>
                <p style="font-family:${sans};font-size:14px;color:#475569;margin:0;line-height:1.6;">Full listing on our marketplace, targeted marketing, showings, contracts, and cemetery transfer paperwork — all handled by our licensed team.</p>
              </td>
            </tr>
            <tr>
              <td valign="top" width="44" style="padding:0 14px 20px 0;">
                <div style="width:36px;height:36px;background:${b.primary};color:#ffffff;border-radius:999px;font-family:${sans};font-size:15px;font-weight:800;text-align:center;line-height:36px;">3</div>
              </td>
              <td valign="top" style="padding:0 0 20px 0;">
                <p style="font-family:${sans};font-size:15px;color:#0f172a;margin:0 0 4px;font-weight:700;">You get a check at closing.</p>
                <p style="font-family:${sans};font-size:14px;color:#475569;margin:0;line-height:1.6;">Every closed sale = a referral commission mailed directly to your funeral home. No invoicing, no chase.</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- WHAT WE HANDLE CHECKLIST -->
        <tr><td style="padding:24px 40px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${b.bgAccent};border-radius:8px;">
            <tr><td style="padding:22px 24px;">
              <p style="font-family:${sans};font-size:13px;color:${b.primary};margin:0 0 12px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;">What we handle for you</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="50%" valign="top" style="font-family:${sans};font-size:14px;color:#0f172a;padding:4px 8px 4px 0;line-height:1.6;">✓ Valuation &amp; competitive pricing</td>
                  <td width="50%" valign="top" style="font-family:${sans};font-size:14px;color:#0f172a;padding:4px 0 4px 8px;line-height:1.6;">✓ Professional photography</td>
                </tr>
                <tr>
                  <td width="50%" valign="top" style="font-family:${sans};font-size:14px;color:#0f172a;padding:4px 8px 4px 0;line-height:1.6;">✓ Marketplace listing &amp; marketing</td>
                  <td width="50%" valign="top" style="font-family:${sans};font-size:14px;color:#0f172a;padding:4px 0 4px 8px;line-height:1.6;">✓ Qualified buyer showings</td>
                </tr>
                <tr>
                  <td width="50%" valign="top" style="font-family:${sans};font-size:14px;color:#0f172a;padding:4px 8px 4px 0;line-height:1.6;">✓ Contracts &amp; escrow</td>
                  <td width="50%" valign="top" style="font-family:${sans};font-size:14px;color:#0f172a;padding:4px 0 4px 8px;line-height:1.6;">✓ Cemetery transfer paperwork</td>
                </tr>
                <tr>
                  <td width="50%" valign="top" style="font-family:${sans};font-size:14px;color:#0f172a;padding:4px 8px 4px 0;line-height:1.6;">✓ Family communication</td>
                  <td width="50%" valign="top" style="font-family:${sans};font-size:14px;color:#0f172a;padding:4px 0 4px 8px;line-height:1.6;">✓ Referral commission to you</td>
                </tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- COVERAGE -->
        <tr><td style="padding:28px 40px 8px;text-align:center;">
          <p style="font-family:${sans};font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:#64748b;margin:0 0 10px;font-weight:700;">Serving mortuaries across</p>
          <div>${regionPills}</div>
        </td></tr>

        <!-- TESTIMONIAL -->
        <tr><td style="padding:32px 40px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="border-left:3px solid ${b.primary};padding:2px 0 2px 16px;">
              <p style="font-family:${sans};font-size:15px;line-height:1.6;color:#0f172a;margin:0 0 8px;font-style:italic;">"They took the entire process off our plate and sent us a check. Our families got affordable options we couldn't offer ourselves."</p>
              <p style="font-family:${sans};font-size:12px;color:#64748b;margin:0;font-weight:600;letter-spacing:.03em;">— Partner funeral home, Los Angeles County</p>
            </td></tr>
          </table>
        </td></tr>

        <!-- CTA -->
        <tr><td align="center" style="padding:32px 40px 8px;">
          <a href="${esc(ctx.siteUrl || b.siteUrl)}/partners" style="display:inline-block;background:${b.primary};color:${b.primaryFg};font-family:${sans};font-size:14px;letter-spacing:.05em;padding:16px 40px;text-decoration:none;font-weight:700;border-radius:6px;">Become a Referral Partner</a>
          <p style="font-family:${sans};font-size:12px;color:#64748b;margin:14px 0 0;">Or just reply to this email — a 10-minute call is enough to see if we're a fit.</p>
        </td></tr>

        <!-- SIGNATURE -->
        <tr><td style="padding:32px 40px 40px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td valign="top" width="88" style="padding-right:18px;">
                <img src="${cdnHost}/__l5e/assets-v1/7653b838-cbae-4f70-838d-71062f1654e2/simon-ceo.jpg" alt="Simon, CEO" width="72" height="72" style="display:block;width:72px;height:72px;border-radius:999px;object-fit:cover;border:2px solid ${b.bgAccent};">
              </td>
              <td valign="middle">
                <p style="font-family:${sans};font-size:13px;line-height:1.5;color:#64748b;margin:0 0 2px;">Best regards,</p>
                <p style="font-family:${sans};font-size:16px;line-height:1.3;color:#0f172a;margin:0;font-weight:700;letter-spacing:-0.01em;">Simon</p>
                <p style="font-family:${sans};font-size:12px;line-height:1.4;color:#64748b;margin:2px 0 6px;">CEO · Bayer Cemetery Brokers</p>
                <p style="font-family:${sans};font-size:12px;line-height:1.5;color:#334155;margin:0;">
                  <a href="mailto:Simon@BayerBrokers.com" style="color:${b.primary};text-decoration:none;font-weight:600;">Simon@BayerBrokers.com</a>
                  &nbsp;·&nbsp; <a href="tel:+12139520731" style="color:${b.primary};text-decoration:none;font-weight:600;">(213) 952-0731</a>
                </p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="padding:24px 40px 28px;border-top:1px solid #e2e8f0;text-align:center;background:#f8fafc;">
          <p style="font-family:${sans};font-size:11px;color:#64748b;margin:0 0 6px;">${esc(b.footerAddress)}</p>
          <p style="font-family:${sans};font-size:11px;color:#64748b;margin:0;">You're receiving this because we partner with funeral homes nationwide. <a href="${esc(ctx.unsubscribeUrl)}" style="color:${b.primary};text-decoration:underline;">Unsubscribe</a>.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = `${salutation(ctx.firstName).replace(/&amp;/g, "&")}

Bayer Cemetery Brokers lists unused cemetery plots at 15%-50% below retail and pays your funeral home a referral commission on every closed sale.

Featured inventory:
- Rose Hills, Garden of Affection — $9,900 (retail $12,900)
- Forest Lawn Glendale, Garden of Memories — $14,000 (retail $22,900)
- Hollywood Forever, Garden of Affection — $9,900 (retail $12,900)
- Forest Lawn Covina, Garden of Memories — $14,000 (retail $22,900)
Plus 1,100+ more across LA, San Bernardino, Orange County, San Diego.

How it works:
1. Hand us the family — we take it from there.
2. We list, market, sell, and handle every cemetery transfer.
3. You get a referral check at closing.

Become a partner: ${ctx.siteUrl || b.siteUrl}/partners

Best regards,
Simon — CEO, Bayer Cemetery Brokers
Simon@BayerBrokers.com · (213) 952-0731

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
