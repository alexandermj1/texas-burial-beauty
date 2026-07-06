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
  const cityLine = ctx.city ? ` in ${esc(ctx.city)}` : "";
  const companyName = ctx.company ? esc(ctx.company) : "your funeral home";
  const serif = "Georgia, 'Times New Roman', serif";

  const regions = ["Dallas–Fort Worth", "Houston", "Austin", "San Antonio", "El Paso"];
  const regionPills = regions.map((r) =>
    `<span style="display:inline-block;background:${b.bgAccent};color:${b.primary};font-family:${serif};font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:6px 12px;border-radius:999px;margin:4px 4px 0 0;">${esc(r)}</span>`
  ).join("");

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f5efe6;font-family:${serif};color:#1f2937;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5efe6;padding:36px 14px;">
    <tr><td align="center">
      <table role="presentation" width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background:#ffffff;border-radius:6px;overflow:hidden;box-shadow:0 8px 28px rgba(124,58,46,0.12);">

        <!-- HEADER -->
        <tr><td align="center" style="background:#ffffff;padding:36px 40px 22px;border-bottom:1px solid #e7e2d8;">
          <img src="${b.logoUrl}" alt="${esc(b.name)}" width="56" height="56" style="display:inline-block;width:56px;height:56px;object-fit:contain;">
          <p style="font-family:${serif};font-size:11px;letter-spacing:.36em;text-transform:uppercase;color:${b.primary};margin:12px 0 0;font-weight:700;">${esc(b.name)}</p>
          <p style="font-family:${serif};font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#9a8f7a;margin:6px 0 0;font-style:italic;">${esc(b.tagline)}</p>
        </td></tr>

        <!-- INTRO -->
        <tr><td style="padding:40px 44px 8px;">
          <p style="font-family:${serif};font-size:15px;line-height:1.6;color:#1f2937;margin:0 0 20px;">${salutation(ctx.firstName)}</p>
          <h1 style="font-family:${serif};font-size:26px;line-height:1.25;color:#1f2937;margin:0 0 20px;font-weight:400;letter-spacing:-0.01em;">The most choice, at the lowest price — with compassionate hands guiding every family from ${companyName}${cityLine}.</h1>
          <p style="font-family:${serif};font-size:15px;line-height:1.75;color:#334155;margin:0 0 16px;"><strong style="color:#1f2937;">Texas Cemetery Brokers</strong> gives your families <strong>real discounts on resale cemetery property</strong> — and, just as importantly, gives them <strong>their time back</strong>. Instead of driving from cemetery to cemetery in the hardest week of their life, our compassionate staff <strong>meets every family in person and walks them through each property</strong> that fits what they're looking for.</p>
          <p style="font-family:${serif};font-size:15px;line-height:1.75;color:#334155;margin:0 0 8px;">The result: more options to choose from, lower prices than buying direct, and a shoulder to lean on through every visit — plus a <strong>referral commission of approximately $1,000</strong> mailed to your funeral home on every closed family.</p>

        </td></tr>

        <!-- SOURCING CALLOUT (the emphasis) -->
        <tr><td style="padding:22px 44px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${b.bgAccent};border-radius:6px;border-left:4px solid ${b.primary};">
            <tr><td style="padding:26px 26px 24px;">
              <p style="font-family:${serif};font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:${b.primary};margin:0 0 10px;font-weight:700;">Inventory built around your funeral home</p>
              <h2 style="font-family:${serif};font-size:20px;line-height:1.3;color:#1f2937;margin:0 0 12px;font-weight:400;">Tell us the cemeteries and areas you serve — we'll keep them stocked.</h2>
              <p style="font-family:${serif};font-size:14px;line-height:1.7;color:#334155;margin:0 0 14px;">Two things from you, once:</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="50%" valign="top" style="padding:6px 10px 6px 0;">
                    <p style="font-family:${serif};font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:${b.primary};margin:0 0 4px;font-weight:700;">Cemeteries &amp; areas</p>
                    <p style="font-family:${serif};font-size:14px;line-height:1.55;color:#1f2937;margin:0;">The specific cemeteries and parts of Texas your families ask about most.</p>
                  </td>
                  <td width="50%" valign="top" style="padding:6px 0 6px 10px;">
                    <p style="font-family:${serif};font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:${b.primary};margin:0 0 4px;font-weight:700;">Typical price points</p>
                    <p style="font-family:${serif};font-size:14px;line-height:1.55;color:#1f2937;margin:0;">The budget range families you serve usually work within.</p>
                  </td>
                </tr>
              </table>
              <p style="font-family:${serif};font-size:13px;line-height:1.65;color:#475569;margin:16px 0 0;font-style:italic;">We then hold ongoing inventory in those cemeteries and price bands, so when a family walks in options are already available — not something we scramble to find after the call.</p>
            </td></tr>
          </table>
        </td></tr>

        <!-- STAT STRIP -->
        <tr><td style="padding:22px 44px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:8px 0;">
            <tr>
              <td width="33%" valign="top" style="background:${b.bgAccent};padding:22px 18px;border-radius:6px;">
                <p style="font-family:${serif};font-size:24px;color:${b.primary};margin:0 0 6px;font-weight:700;line-height:1;">~$1,000</p>
                <p style="font-family:${serif};font-size:11px;line-height:1.5;color:#1f2937;margin:0;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Per referral</p>
                <p style="font-family:${serif};font-size:12px;line-height:1.5;color:#475569;margin:6px 0 0;">Paid to your funeral home at closing.</p>
              </td>
              <td width="33%" valign="top" style="background:${b.bgAccent};padding:22px 18px;border-radius:6px;">
                <p style="font-family:${serif};font-size:24px;color:${b.primary};margin:0 0 6px;font-weight:700;line-height:1;">Ready</p>
                <p style="font-family:${serif};font-size:11px;line-height:1.5;color:#1f2937;margin:0;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Standing inventory</p>
                <p style="font-family:${serif};font-size:12px;line-height:1.5;color:#475569;margin:6px 0 0;">In the cemeteries your families ask for.</p>
              </td>
              <td width="34%" valign="top" style="background:${b.bgAccent};padding:22px 18px;border-radius:6px;">
                <p style="font-family:${serif};font-size:24px;color:${b.primary};margin:0 0 6px;font-weight:700;line-height:1;">0h</p>
                <p style="font-family:${serif};font-size:11px;line-height:1.5;color:#1f2937;margin:0;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Staff time</p>
                <p style="font-family:${serif};font-size:12px;line-height:1.5;color:#475569;margin:6px 0 0;">We handle everything end-to-end.</p>
              </td>
            </tr>
          </table>
        </td></tr>


        <!-- HOW IT WORKS -->
        <tr><td style="padding:36px 44px 8px;">
          <p style="font-family:${serif};font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:${b.primary};margin:0 0 6px;font-weight:700;">How the partnership works</p>
          <h2 style="font-family:${serif};font-size:22px;color:#1f2937;margin:0 0 22px;font-weight:400;letter-spacing:-0.01em;">Three steps. Zero lift on your team.</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td valign="top" width="44" style="padding:0 14px 20px 0;">
                <div style="width:36px;height:36px;background:${b.primary};color:#ffffff;border-radius:999px;font-family:${serif};font-size:15px;font-weight:700;text-align:center;line-height:36px;">1</div>
              </td>
              <td valign="top" style="padding:0 0 20px 0;">
                <p style="font-family:${serif};font-size:15px;color:#1f2937;margin:0 0 4px;font-weight:700;">Tell us your cemeteries and price points — once.</p>
                <p style="font-family:${serif};font-size:14px;color:#475569;margin:0;line-height:1.65;">A quick email or 5-minute call. We build a standing inventory around what your families need.</p>
              </td>
            </tr>
            <tr>
              <td valign="top" width="44" style="padding:0 14px 20px 0;">
                <div style="width:36px;height:36px;background:${b.primary};color:#ffffff;border-radius:999px;font-family:${serif};font-size:15px;font-weight:700;text-align:center;line-height:36px;">2</div>
              </td>
              <td valign="top" style="padding:0 0 20px 0;">
                <p style="font-family:${serif};font-size:15px;color:#1f2937;margin:0 0 4px;font-weight:700;">Refer families to us — we handle every step.</p>
                <p style="font-family:${serif};font-size:14px;color:#475569;margin:0;line-height:1.65;">Options are already on the shelf. We handle contracts, cemetery transfer paperwork, and family communication.</p>
              </td>
            </tr>
            <tr>
              <td valign="top" width="44" style="padding:0 14px 20px 0;">
                <div style="width:36px;height:36px;background:${b.primary};color:#ffffff;border-radius:999px;font-family:${serif};font-size:15px;font-weight:700;text-align:center;line-height:36px;">3</div>
              </td>
              <td valign="top" style="padding:0 0 20px 0;">
                <p style="font-family:${serif};font-size:15px;color:#1f2937;margin:0 0 4px;font-weight:700;">You get ~$1,000 per referral at closing.</p>
                <p style="font-family:${serif};font-size:14px;color:#475569;margin:0;line-height:1.65;">A referral commission of approximately $1,000 per closed family, mailed directly to your funeral home.</p>
              </td>
            </tr>

          </table>
        </td></tr>

        <!-- WHAT WE HANDLE CHECKLIST -->
        <tr><td style="padding:24px 44px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${b.bgAccent};border-radius:6px;">
            <tr><td style="padding:22px 24px;">
              <p style="font-family:${serif};font-size:13px;color:${b.primary};margin:0 0 12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;">What we handle for you</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="50%" valign="top" style="font-family:${serif};font-size:14px;color:#1f2937;padding:4px 8px 4px 0;line-height:1.6;">✓ Standing inventory in your cemeteries</td>
                  <td width="50%" valign="top" style="font-family:${serif};font-size:14px;color:#1f2937;padding:4px 0 4px 8px;line-height:1.6;">✓ Pricing within your families' budgets</td>
                </tr>
                <tr>
                  <td width="50%" valign="top" style="font-family:${serif};font-size:14px;color:#1f2937;padding:4px 8px 4px 0;line-height:1.6;">✓ Contracts &amp; escrow</td>
                  <td width="50%" valign="top" style="font-family:${serif};font-size:14px;color:#1f2937;padding:4px 0 4px 8px;line-height:1.6;">✓ Cemetery transfer paperwork</td>
                </tr>
                <tr>
                  <td width="50%" valign="top" style="font-family:${serif};font-size:14px;color:#1f2937;padding:4px 8px 4px 0;line-height:1.6;">✓ Family communication</td>
                  <td width="50%" valign="top" style="font-family:${serif};font-size:14px;color:#1f2937;padding:4px 0 4px 8px;line-height:1.6;">✓ ~$1,000 commission per referral</td>

                </tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- COVERAGE -->
        <tr><td style="padding:28px 44px 8px;text-align:center;">
          <p style="font-family:${serif};font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:#9a8f7a;margin:0 0 10px;font-weight:700;">Inventory statewide across</p>
          <div>${regionPills}</div>
        </td></tr>

        <!-- CTA -->
        <tr><td align="center" style="padding:32px 44px 8px;">
          <a href="${esc(ctx.siteUrl || b.siteUrl)}/partners" style="display:inline-block;background:${b.primary};color:${b.primaryFg};font-family:${serif};font-size:14px;letter-spacing:.06em;text-transform:uppercase;padding:14px 32px;text-decoration:none;font-weight:600;">Become a Referral Partner</a>
          <p style="font-family:${serif};font-size:12px;color:#9a8f7a;margin:14px 0 0;font-style:italic;">Or just reply with the cemeteries and price points your families ask for — we'll build your inventory.</p>
        </td></tr>


        <!-- SIGNATURE -->
        <tr><td style="padding:32px 44px 40px;">
          <p style="font-family:${serif};font-size:14px;line-height:1.7;color:#1f2937;margin:0;">Warmly,<br><em>The team at Texas Cemetery Brokers</em></p>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="padding:20px 44px 32px;border-top:1px solid #e7e2d8;text-align:center;background:${b.bgAccent};">
          <p style="font-family:${serif};font-size:11px;color:#9a8f7a;margin:0 0 6px;font-style:italic;">${esc(b.footerAddress)}</p>
          <p style="font-family:${serif};font-size:11px;color:#9a8f7a;margin:0;">You're receiving this because we work with funeral homes across Texas. <a href="${esc(ctx.unsubscribeUrl)}" style="color:${b.primary};text-decoration:underline;">Unsubscribe</a>.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = `${salutation(ctx.firstName).replace(/&amp;/g, "&")}

Texas Cemetery Brokers partners with funeral homes across Texas. We pay approximately $1,000 per family you refer that closes with us.

The part most partners value most: TELL US THE CEMETERIES AND AREAS YOUR FAMILIES ASK FOR, AND WE MAINTAIN STANDING INVENTORY IN THOSE PLACES.
- Cemeteries & areas your families most often need
- Typical price points they work within
So when a family walks in, options are already on the shelf — not something we scramble to find after the call.

How it works:
1. Tell us your cemeteries and price points, once.
2. Refer families to us — we handle contracts, cemetery transfer, family communication.
3. You get approximately $1,000 per referral at closing.

Become a partner: ${ctx.siteUrl || b.siteUrl}/partners
Or reply with the cemeteries and price points your families ask for.


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
    <td width="50%" valign="top" style="padding:12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 3px 10px rgba(15,23,42,0.05);">
        <tr><td style="padding:0;line-height:0;position:relative;">
          <img src="${p.img}" alt="${esc(p.cemetery)}" width="270" style="display:block;width:100%;height:170px;object-fit:cover;">
          <div style="position:absolute;top:14px;left:14px;background:${b.primary};color:#ffffff;font-family:${sans};font-size:10px;font-weight:800;letter-spacing:.14em;padding:8px 14px;border-radius:4px;box-shadow:0 2px 6px rgba(15,23,42,0.18);">${pctOff(p.price, p.retail)}</div>
        </td></tr>
        <tr><td style="padding:20px 22px 22px;">
          <p style="font-family:${sans};font-size:15px;color:#0f172a;margin:0 0 4px;font-weight:700;letter-spacing:-0.01em;line-height:1.3;">${esc(p.cemetery)}</p>
          <p style="font-family:${sans};font-size:12px;color:#64748b;margin:0 0 18px;line-height:1.4;">${esc(p.garden)}</p>
          <p style="font-family:${sans};font-size:13px;color:#94a3b8;text-decoration:line-through;margin:0 0 4px;">${esc(p.retail)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="baseline" style="font-family:${sans};font-size:22px;color:${b.primary};font-weight:800;letter-spacing:-0.02em;">${esc(p.price)}</td>
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
<body style="margin:0;padding:0;background:#dbe4f2;font-family:${sans};color:#0f172a;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#dbe4f2;padding:36px 14px;">
    <tr><td align="center">
      <table role="presentation" width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 8px 28px rgba(30,58,138,0.12);">

        <!-- HEADER -->
        <tr><td align="center" style="background:#ffffff;padding:26px 40px 18px;border-bottom:1px solid #e2e8f0;">
          <img src="https://www.texascemeterybrokers.com/__l5e/assets-v1/5fec1b45-9ea7-4701-8042-2118c14883e8/bayer-logo-navy.png" alt="${esc(b.name)}" width="92" style="display:block;width:92px;height:auto;object-fit:contain;margin:0 auto 10px;">
          <p style="font-family:${sans};font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:${b.primary};font-weight:700;margin:0;">Save families 15% – 50%</p>
        </td></tr>

        <!-- INTRO -->
        <tr><td style="padding:40px 40px 8px;">
          <p style="font-family:${sans};font-size:15px;line-height:1.6;color:#0f172a;margin:0 0 20px;">${salutation(ctx.firstName)}</p>
          <h1 style="font-family:${sans};font-size:28px;line-height:1.2;color:#0f172a;margin:0 0 20px;font-weight:700;letter-spacing:-0.02em;">A partnership that pays ${companyName}${cityLine}.</h1>
          <p style="font-family:${sans};font-size:15px;line-height:1.7;color:#334155;margin:0 0 18px;">Cemetery plots in Southern California now run <strong>$8,000–$25,000+</strong> at retail — a number most families you serve simply can't absorb on top of funeral costs. When budget becomes the conversation, options are limited and uncomfortable.</p>
          <p style="font-family:${sans};font-size:15px;line-height:1.7;color:#334155;margin:0 0 8px;"><strong style="color:#0f172a;">Bayer Cemetery Brokers</strong> maintains a live inventory of <strong>1,100+ resale plots priced 15%–50% below retail</strong> at the same cemeteries your families are already asking about. Refer a family to us and we help them secure the burial they want at a price they can actually afford — while your funeral home earns a referral commission on every closed sale.</p>
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
        <tr><td style="padding:16px 32px 8px;">
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
  defaultSubject: "We'll source the cemetery plot your family needs",
  defaultPreheader: "Tell us the cemeteries and price points your families ask for — we keep standing inventory ready and pay approximately $1,000 per referral.",
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
