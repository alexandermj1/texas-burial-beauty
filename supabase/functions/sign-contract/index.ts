// Public endpoint for the seller signing flow + admin countersign.
// GET   ?token=...                              → contract metadata + signed PDF URL
// POST  { action: "refresh", token, fields }    → merge seller-entered fields into
//                                                  fill_data and regenerate filled PDF
// POST  { token, signature_name, signature_image, initials, consent, ... }
//                                                → seller signs (stamps sig, initials,
//                                                  cert page; emails signed copy)
// POST  { action: "countersign", contract_id,
//         countersigner_name, countersigner_signature }
//                                                → admin (JWT required) stamps broker
//                                                  signature; emails fully-executed copy
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont, PDFImage } from 'npm:pdf-lib@1.17.1';
import { buildFilledPdf, type FillData } from '../_shared/contract-fill.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};


const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const svc = createClient(SUPABASE_URL, SERVICE_KEY);

const INK = rgb(0.08, 0.08, 0.08);
const MUTED = rgb(0.28, 0.28, 0.28);

async function loadContract(token: string) {
  const { data } = await svc.from('contracts').select('*').eq('sign_token', token).maybeSingle();
  return data;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function decodeSignature(pdf: PDFDocument, dataUrl: string): Promise<PDFImage | null> {
  const m = /^data:image\/(png|jpeg);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  return m[1] === 'png' ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
}

function stampText(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size = 11, color = INK) {
  if (!text) return;
  page.drawText(String(text), { x, y, size, font, color });
}

/** Stamp initials on every "Seller's Initials: ____" footer line.
 * Templates are US Letter (612x792). Position is bottom-right within the page,
 * bold so they read like a hand-drawn stamp. */
function stampFooterInitials(pages: PDFPage[], initials: string, font: PDFFont) {
  for (const p of pages) {
    const { width } = p.getSize();
    p.drawText(initials, { x: width - 90, y: 28, size: 11, font, color: INK });
  }
}

/** Inline "SELLER INITIAL HERE" acknowledgement boxes on the Listing Agreement.
 * Each box has a real underline rect in the template at x0=490.5, x1=558.0
 * (width 67.5). y_bot values below are the underline baseline (pdf-lib coords),
 * measured directly from the template rects. We mask the placeholder text and
 * stamp the seller's initials sitting on the underline. */
const LA_INITIAL_UNDERLINE_X = 490.5;
const LA_INITIAL_UNDERLINE_W = 67.5;
const LA_INLINE_INITIALS: Array<{ pageIndex: number; y: number }> = [
  { pageIndex: 1, y: 353.3 }, // p2 — Authorized Minimum Price
  { pageIndex: 1, y: 239.3 }, // p2 — Sales at or above authorized minimum
  { pageIndex: 2, y: 201.0 }, // p3 — Buyer-Paid Broker Charges (Section 2.2)
  { pageIndex: 4, y: 642.8 }, // p5 — Warranty of ownership
  { pageIndex: 4, y: 573.0 }, // p5 — Warranty of plot condition
];
function stampInlineInitials(pages: PDFPage[], initials: string, bold: PDFFont) {
  const WHITE = rgb(1, 1, 1);
  for (const { pageIndex, y } of LA_INLINE_INITIALS) {
    if (pageIndex >= pages.length) continue;
    const page = pages[pageIndex];
    // Mask the "SELLER INITIAL HERE" placeholder text that sits ABOVE the underline
    // (roughly x=395..488, ~15pt tall, baseline about 8pt above the rule).
    page.drawRectangle({ x: 395, y: y + 2, width: 100, height: 14, color: WHITE });
    // Stamp the initials centred over the actual underline rect, resting on the line.
    const size = 12;
    const w = bold.widthOfTextAtSize(initials, size);
    page.drawText(initials, {
      x: LA_INITIAL_UNDERLINE_X + (LA_INITIAL_UNDERLINE_W - w) / 2,
      y: y + 2.2, // baseline sits ~2pt above the rule, like a handwritten mark
      size,
      font: bold,
      color: INK,
    });
  }
}

function todayFormatted(): string {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const url = new URL(req.url);

  try {
    if (req.method === 'GET') {
      const token = url.searchParams.get('token') ?? '';
      const c = await loadContract(token);
      if (!c || c.status === 'void') {
        return new Response(JSON.stringify({ error: 'invalid_or_expired' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (c.sign_token_expires_at && new Date(c.sign_token_expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'expired' }), {
          status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!c.viewed_at) {
        await svc.from('contracts').update({
          viewed_at: new Date().toISOString(),
          status: c.status === 'sent' ? 'viewed' : c.status,
        }).eq('id', c.id);
      }
      const path = c.signed_pdf_path ?? c.filled_pdf_path;
      const { data: signed } = await svc.storage.from('contracts').createSignedUrl(path, 60 * 60);
      return new Response(JSON.stringify({
        kind: c.kind,
        status: c.status,
        fill_data: c.fill_data,
        pdf_url: signed?.signedUrl,
        already_signed: !!c.signed_at,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (req.method !== 'POST') {
      return new Response('method not allowed', { status: 405, headers: corsHeaders });
    }

    const body = await req.json();
    const action = body.action as string | undefined;

    // ================= REFRESH: seller updates missing fields on the sign page =================
    if (action === 'refresh') {
      const { token, fields } = body;
      if (!token || !fields || typeof fields !== 'object') {
        return new Response(JSON.stringify({ error: 'missing_fields' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const c = await loadContract(token);
      if (!c) return new Response(JSON.stringify({ error: 'invalid' }), { status: 404, headers: corsHeaders });
      if (c.signed_at) return new Response(JSON.stringify({ error: 'already_signed' }), { status: 409, headers: corsHeaders });

      const allowed = [
        'seller_name', 'co_owner_name', 'address', 'city_state_zip',
        'phone', 'email', 'plot_description', 'plot_count', 'listing_option',
        'county_state', 'cemetery',
      ] as const;
      const merged: FillData = { ...(c.fill_data ?? {}) } as FillData;
      for (const k of allowed) {
        if (typeof fields[k] === 'string' && fields[k].trim()) (merged as Record<string, unknown>)[k] = fields[k].trim();
        else if (typeof fields[k] === 'number') (merged as Record<string, unknown>)[k] = fields[k];
      }

      const tmplFile = c.kind === 'poa' ? 'poa-template.pdf' : 'listing-agreement-template.pdf';
      const { data: tmpl } = await svc.storage.from('contracts').download(`_templates/${tmplFile}`);
      if (!tmpl) throw new Error('template missing');
      const tmplBytes = new Uint8Array(await tmpl.arrayBuffer());
      const filled = await buildFilledPdf(tmplBytes, c.kind as 'listing_agreement' | 'poa', merged);

      const newPath = `${c.submission_id}/${c.kind}-${Date.now()}.pdf`;
      const { error: upE } = await svc.storage.from('contracts')
        .upload(newPath, filled, { contentType: 'application/pdf', upsert: true });
      if (upE) throw upE;
      await svc.from('contracts').update({ fill_data: merged, filled_pdf_path: newPath }).eq('id', c.id);

      const { data: signedUrl } = await svc.storage.from('contracts').createSignedUrl(newPath, 60 * 60);
      return new Response(JSON.stringify({ ok: true, pdf_url: signedUrl?.signedUrl, fill_data: merged }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ================= POA FINALIZE: seller confirms address, we email notary packet =================
    if (action === 'poa_finalize') {
      const { token, fields } = body;
      if (!token) {
        return new Response(JSON.stringify({ error: 'missing_token' }), { status: 400, headers: corsHeaders });
      }
      const c = await loadContract(token);
      if (!c || c.kind !== 'poa') {
        return new Response(JSON.stringify({ error: 'invalid' }), { status: 404, headers: corsHeaders });
      }

      // Merge any newly supplied address fields into fill_data, then regenerate the PDF.
      const allowed = ['seller_name', 'address', 'city_state_zip', 'phone', 'email'] as const;
      const merged: FillData = { ...(c.fill_data ?? {}) } as FillData;
      if (fields && typeof fields === 'object') {
        for (const k of allowed) {
          if (typeof fields[k] === 'string' && fields[k].trim()) (merged as Record<string, unknown>)[k] = fields[k].trim();
        }
      }
      if (!merged.address || !merged.city_state_zip) {
        return new Response(JSON.stringify({ error: 'address_required' }), { status: 400, headers: corsHeaders });
      }

      const { data: tmpl } = await svc.storage.from('contracts').download('_templates/poa-template.pdf');
      if (!tmpl) throw new Error('template missing');
      const tmplBytes = new Uint8Array(await tmpl.arrayBuffer());
      const filled = await buildFilledPdf(tmplBytes, 'poa', merged);

      const newPath = `${c.submission_id}/poa-${Date.now()}.pdf`;
      const { error: upE } = await svc.storage.from('contracts')
        .upload(newPath, filled, { contentType: 'application/pdf', upsert: true });
      if (upE) throw upE;

      const nowIso = new Date().toISOString();
      await svc.from('contracts').update({
        fill_data: merged,
        filled_pdf_path: newPath,
        status: 'sent_for_notary',
        bluenotary_sent_at: nowIso,
      }).eq('id', c.id);

      // Email the seller with the filled PDF attached + notary options (online + in-person).
      try {
        const { data: sub } = await svc.from('contact_submissions')
          .select('email, name, cemetery').eq('id', c.submission_id).maybeSingle();
        const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        const to = (merged.email as string) || sub?.email;
        if (to && RESEND_KEY && LOVABLE_API_KEY) {
          const CHUNK = 0x8000;
          let bin = '';
          for (let i = 0; i < filled.length; i += CHUNK) bin += String.fromCharCode(...filled.subarray(i, i + CHUNK));
          const b64 = btoa(bin);
          const firstName = (sub?.name ?? merged.seller_name as string ?? '').trim().split(/\s+/)[0] || 'there';
          const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          const cemLine = sub?.cemetery ? ` for ${esc(sub.cemetery)}` : '';
          const filename = `${(sub?.name ?? 'seller').replace(/[^A-Za-z0-9_-]+/g, '_')}-power-of-attorney.pdf`;

          const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f1ea;font-family:Georgia,'Times New Roman',serif;color:#1f2a37;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1ea;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(31,42,55,0.08);">
        <tr><td style="background:#1f2a37;color:#ffffff;padding:34px 40px;text-align:center;">
          <div style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#d9c7a3;">Texas Cemetery Brokers</div>
          <div style="font-size:22px;margin-top:10px;font-family:Georgia,serif;">Your Power of Attorney is ready to notarize</div>
        </td></tr>
        <tr><td style="padding:32px 40px;font-size:15px;line-height:1.65;">
          <p style="margin:0 0 16px;">Dear ${esc(firstName)},</p>
          <p style="margin:0 0 16px;">
            Thank you for signing the <strong>Exclusive Right-to-Sell Listing Agreement</strong> — that's
            the first big step, and we're excited to get to work for you. Attached to this email is your
            fully prepared <strong>Limited Special Power of Attorney</strong>${cemLine}. This second
            document authorises Texas Cemetery Brokers to sign the plot-transfer paperwork on your behalf
            once the sale closes, so you don't need to be present at the cemetery office.
          </p>
          <p style="margin:0 0 20px;">
            Because it authorises us to act on your behalf, Texas law requires the Power of Attorney to be
            <strong>notarized</strong>. You have two easy options — pick whichever is more convenient:
          </p>

          <div style="border:1px solid #e5e0d5;border-radius:12px;padding:20px 22px;margin:0 0 18px;background:#fbf8f2;">
            <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#8a6d3b;margin-bottom:6px;">Option 1 — Fastest</div>
            <div style="font-size:17px;font-family:Georgia,serif;margin-bottom:8px;">Notarize online in ~15 minutes with Proof</div>
            <p style="margin:0 0 14px;font-size:14px;color:#4a5568;">
              Upload the attached PDF directly to Proof, then meet a commissioned notary over live video
              from your phone or laptop and download the notarized copy. You'll need a photo ID
              (driver's licence or passport) and about 15 minutes. Typical cost is $25.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr><td style="background:#1f2a37;border-radius:8px;">
                <a href="https://app.proof.com/signup/upload" style="display:inline-block;padding:11px 22px;color:#ffffff;text-decoration:none;font-family:Georgia,serif;font-size:14px;">
                  Upload your PDF to Proof →
                </a>
              </td></tr>
            </table>
            <p style="margin:10px 0 0;font-size:12px;color:#6b7280;">
              Prefer another service? <a href="https://www.notarize.com/business/documents" style="color:#1f2a37;">Notarize</a> ·
              <a href="https://www.onenotary.us/" style="color:#1f2a37;">OneNotary</a> ·
              <a href="https://www.bluenotary.us/" style="color:#1f2a37;">BlueNotary</a>
            </p>
          </div>

          <div style="border:1px solid #e5e0d5;border-radius:12px;padding:20px 22px;margin:0 0 20px;">
            <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#8a6d3b;margin-bottom:6px;">Option 2 — In person</div>
            <div style="font-size:17px;font-family:Georgia,serif;margin-bottom:8px;">Bring the PDF to any local notary</div>
            <p style="margin:0 0 8px;font-size:14px;color:#4a5568;">
              Print the attached PDF and take it, along with your photo ID, to any commissioned notary.
              Common places that offer notary services:
            </p>
            <ul style="padding-left:20px;margin:0 0 4px;font-size:13px;color:#4a5568;line-height:1.7;">
              <li>Your bank or credit union (often free for members)</li>
              <li>UPS Store, FedEx Office, or AAA branch</li>
              <li>Your local courthouse or county clerk's office</li>
              <li>Public libraries in many Texas cities</li>
            </ul>
          </div>

          <p style="margin:0 0 16px;font-size:14px;color:#4a5568;">
            <strong style="color:#1f2a37;">Once it's notarized</strong>, just email the signed PDF back to
            <a href="mailto:contracts@texascemeterybrokers.com" style="color:#1f2a37;">contracts@texascemeterybrokers.com</a>
            (or reply to this email with a photo/scan) and we'll file it with the cemetery to complete your transfer.
          </p>
          <p style="margin:20px 0 0;font-size:13px;color:#4a5568;">
            Any questions, just reply to this email — we're happy to walk you through it.
          </p>
        </td></tr>
        <tr><td style="background:#f5f1ea;padding:20px 40px;text-align:center;font-size:11px;color:#6b7280;letter-spacing:1px;text-transform:uppercase;">
          Texas Cemetery Brokers · texascemeterybrokers.com
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

          await fetch('https://connector-gateway.lovable.dev/resend/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              'X-Connection-Api-Key': RESEND_KEY,
            },
            body: JSON.stringify({
              from: 'Texas Cemetery Brokers <contracts@texascemeterybrokers.com>',
              to: [to],
              bcc: ['contracts@texascemeterybrokers.com'],
              subject: `Your Power of Attorney${sub?.cemetery ? ` for ${sub.cemetery}` : ''} — notary packet attached`,
              html,
              attachments: [{ filename, content: b64 }],
            }),
          });
        }
      } catch (mailErr) {
        console.error('poa_finalize email failed', mailErr);
      }

      const { data: signedUrl } = await svc.storage.from('contracts').createSignedUrl(newPath, 60 * 60);
      return new Response(JSON.stringify({ ok: true, pdf_url: signedUrl?.signedUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }



    // ================= COUNTERSIGN: admin stamps broker signature =================
    if (action === 'countersign') {
      const { contract_id, countersigner_name, countersigner_signature } = body;
      const authHeader = req.headers.get('Authorization') ?? '';
      const asUser = createClient(SUPABASE_URL, SERVICE_KEY, { global: { headers: { Authorization: authHeader } } });
      const { data: userData } = await asUser.auth.getUser();
      if (!userData?.user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });

      if (!contract_id || !countersigner_name || !countersigner_signature) {
        return new Response(JSON.stringify({ error: 'missing_fields' }), { status: 400, headers: corsHeaders });
      }
      const { data: c } = await svc.from('contracts').select('*').eq('id', contract_id).maybeSingle();
      if (!c) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: corsHeaders });
      if (!c.signed_at) return new Response(JSON.stringify({ error: 'seller_not_signed' }), { status: 409, headers: corsHeaders });

      const { data: file } = await svc.storage.from('contracts').download(c.signed_pdf_path);
      if (!file) throw new Error('signed pdf missing');
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdf = await PDFDocument.load(bytes);
      const font = await pdf.embedFont(StandardFonts.TimesRoman);
      const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
      const pages = pdf.getPages();
      const brokerImg = await decodeSignature(pdf, countersigner_signature);
      const nowIso = new Date().toISOString();
      const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      if (c.kind === 'listing_agreement' && pages.length >= 8) {
        const p8 = pages[7];
        // The template ships with a pre-printed broker signature + typed name in the
        // broker block. Cover those areas with opaque white before stamping our own,
        // so the counter-signature isn't drawn on top of the pre-filled artwork.
        const white = rgb(1, 1, 1);
        // Broker signature line region (above underline y≈96.8, height covers glyph area)
        p8.drawRectangle({ x: 204, y: 94, width: 300, height: 40, color: white });
        // Broker printed-name line region (above underline y≈136.5)
        p8.drawRectangle({ x: 204, y: 134, width: 300, height: 18, color: white });
        // Broker date line region (above underline y≈70.5)
        p8.drawRectangle({ x: 204, y: 68, width: 300, height: 18, color: white });

        // Broker block (measured rects): name 136.5, sig 96.8, date 70.5. x0=204.7.
        stampText(p8, countersigner_name, 210, 139.5, font, 11);
        if (brokerImg) {
          const d = brokerImg.scaleToFit(220, 32);
          p8.drawImage(brokerImg, { x: 210, y: 100, width: d.width, height: d.height });
        }
        stampText(p8, today, 210, 73.5, font, 11);
      }


      // Add a "Fully Executed" stamp on the certification page (last page).
      const cert = pages[pages.length - 1];
      cert.drawText('— FULLY EXECUTED —', { x: 50, y: 20, size: 10, font: bold, color: INK });
      cert.drawText(`Countersigned by ${countersigner_name} on ${nowIso}`, { x: 200, y: 20, size: 9, font, color: MUTED });

      const out = await pdf.save();
      const outHash = await sha256Hex(out);
      const outPath = `${c.submission_id}/${c.kind}-executed-${Date.now()}.pdf`;
      const { error: upE } = await svc.storage.from('contracts')
        .upload(outPath, out, { contentType: 'application/pdf', upsert: true });
      if (upE) throw upE;

      await svc.from('contracts').update({
        status: 'signed',
        countersigned_at: nowIso,
        countersigned_by: userData.user.id,
        countersigner_name,
        countersigner_signature,
        countersigned_pdf_path: outPath,
        signed_hash: outHash,
      }).eq('id', c.id);
      if (c.kind === 'listing_agreement') {
        await svc.from('contact_submissions').update({ la_countersigned_at: nowIso }).eq('id', c.submission_id);
      }

      // Email the fully executed copy to the seller (branded template via connector gateway)
      try {
        const { data: sub } = await svc.from('contact_submissions')
          .select('email, name, cemetery, section, property_type, spaces').eq('id', c.submission_id).maybeSingle();
        const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        if (sub?.email && RESEND_KEY && LOVABLE_API_KEY) {
          const CHUNK = 0x8000;
          let bin = '';
          for (let i = 0; i < out.length; i += CHUNK) bin += String.fromCharCode(...out.subarray(i, i + CHUNK));
          const b64 = btoa(bin);
          const kindLabel = c.kind === 'poa' ? 'Power of Attorney' : 'Listing Agreement';
          const filename = `${(sub.name ?? 'seller').replace(/[^A-Za-z0-9_-]+/g, '_')}-${c.kind}-fully-executed.pdf`;
          const firstName = (sub.name ?? '').trim().split(/\s+/)[0] || 'there';
          const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          const cemLine = sub.cemetery ? ` for ${esc(sub.cemetery)}` : '';
          const execDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

          const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f1ea;font-family:Georgia,'Times New Roman',serif;color:#1f2a37;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1ea;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(31,42,55,0.08);">
        <tr><td style="background:#1f2a37;color:#ffffff;padding:34px 40px;text-align:center;">
          <div style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#d9c7a3;">Texas Cemetery Brokers</div>
          <div style="font-size:22px;margin-top:10px;font-family:Georgia,serif;">Your ${esc(kindLabel)} is fully executed</div>
        </td></tr>
        <tr><td style="padding:32px 40px;font-size:15px;line-height:1.65;">
          <p style="margin:0 0 16px;">Dear ${esc(firstName)},</p>
          <p style="margin:0 0 16px;">
            We're pleased to confirm that your <strong>${esc(kindLabel)}</strong>${cemLine} has been countersigned
            by Texas Cemetery Brokers and is now <strong>fully executed</strong> as of ${esc(execDate)}.
          </p>
          <p style="margin:0 0 20px;">
            A complete PDF copy is attached to this email for your records, including the full audit trail and
            certificate of electronic signature. Please retain it with your important documents.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#f5f1ea;border-radius:10px;">
            <tr><td style="padding:18px 22px;font-size:13px;color:#4a5568;line-height:1.6;">
              <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#7c3a2e;font-weight:600;margin-bottom:8px;">Document Summary</div>
              <div><strong style="color:#1f2a37;">Document:</strong> ${esc(kindLabel)}</div>
              ${sub.cemetery ? `<div><strong style="color:#1f2a37;">Cemetery:</strong> ${esc(sub.cemetery)}</div>` : ''}
              ${sub.section ? `<div><strong style="color:#1f2a37;">Section:</strong> ${esc(sub.section)}</div>` : ''}
              <div><strong style="color:#1f2a37;">Executed on:</strong> ${esc(execDate)}</div>
              <div><strong style="color:#1f2a37;">Countersigned by:</strong> ${esc(countersigner_name)}</div>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;font-size:13px;color:#4a5568;"><strong style="color:#1f2a37;">What happens next:</strong></p>
          <ol style="padding-left:20px;margin:0 0 20px;font-size:13px;color:#4a5568;line-height:1.7;">
            <li>Your dedicated broker will begin actively marketing your property.</li>
            <li>We'll reach out promptly with any qualified buyer interest.</li>
            <li>You'll receive regular updates throughout the sales process.</li>
          </ol>
          <p style="margin:24px 0 0;font-size:14px;">
            Thank you for entrusting Texas Cemetery Brokers with the sale of your property.
            If you have any questions, simply reply to this email.
          </p>
          <p style="margin:20px 0 0;font-size:14px;">Warm regards,<br/><strong>Texas Cemetery Brokers</strong></p>
        </td></tr>
        <tr><td style="background:#f5f1ea;padding:18px 40px;text-align:center;font-size:11px;color:#6b7280;letter-spacing:1px;text-transform:uppercase;">
          Texas Cemetery Brokers · texascemeterybrokers.com
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

          const subject = `Fully executed ${kindLabel}${sub.cemetery ? ` — ${sub.cemetery}` : ''}`;
          const emailRes = await fetch('https://connector-gateway.lovable.dev/resend/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              'X-Connection-Api-Key': RESEND_KEY,
            },
            body: JSON.stringify({
              from: 'Texas Cemetery Brokers <contracts@texascemeterybrokers.com>',
              to: [sub.email],
              bcc: ['contracts@texascemeterybrokers.com'],
              subject,
              html,
              attachments: [{ filename, content: b64 }],
            }),
          });
          if (!emailRes.ok) {
            console.error('countersign email non-ok', emailRes.status, await emailRes.text());
          } else {
            await svc.from('contracts').update({ signed_copy_emailed_at: nowIso }).eq('id', c.id);
            try {
              await svc.from('email_messages').insert({
                matched_submission_id: c.submission_id,
                direction: 'outbound',
                from_email: 'contracts@texascemeterybrokers.com',
                to_email: sub.email,
                subject,
                body_html: html,
                body_text: `Fully executed contract attached.`,
                received_at: new Date().toISOString(),
              });
            } catch (logErr) { console.error('log email_messages failed', logErr); }
          }
        }
      } catch (e) { console.error('countersign email failed', e); }


      return new Response(JSON.stringify({ ok: true, pdf_path: outPath }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ================= SELLER SIGN (default POST) =================
    const {
      token, signature_name, signature_image, initials, consent,
    } = body;
    const co_owner_name: string | undefined = undefined;
    const co_owner_image: string | undefined = undefined;
    if (!token || !signature_name || !signature_image || !initials || consent !== true) {
      return new Response(JSON.stringify({ error: 'missing_fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    const c = await loadContract(token);
    if (!c) return new Response(JSON.stringify({ error: 'invalid' }), { status: 404, headers: corsHeaders });
    if (c.signed_at) {
      return new Response(JSON.stringify({ error: 'already_signed' }), { status: 409, headers: corsHeaders });
    }

    const { data: file } = await svc.storage.from('contracts').download(c.filled_pdf_path);
    if (!file) throw new Error('filled pdf missing');
    const preSignBytes = new Uint8Array(await file.arrayBuffer());
    const preSignHash = await sha256Hex(preSignBytes);

    const pdf = await PDFDocument.load(preSignBytes);
    const font = await pdf.embedFont(StandardFonts.TimesRoman);
    const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
    const pages = pdf.getPages();

    const sigImg = await decodeSignature(pdf, signature_image);
    const coSigImg = co_owner_image ? await decodeSignature(pdf, co_owner_image) : null;

    // === Stamp signature block on the correct template page ===
    // Coordinates measured directly from the template underline rects; stamp
    // sits ~3pt above the rule so the baseline sits on the line.
    if (c.kind === 'listing_agreement' && pages.length >= 8) {
      const p8 = pages[7];
      // Seller block (measured rects): printed name 281.3, sig 252.0, date 222.8.
      stampText(p8, signature_name, 210, 284.3, font, 11);
      if (sigImg) {
        const dims = sigImg.scaleToFit(220, 32);
        p8.drawImage(sigImg, { x: 210, y: 255, width: dims.width, height: dims.height });
      }
      stampText(p8, todayFormatted(), 210, 225.8, font, 11);
    } else if (c.kind === 'poa' && pages.length >= 3) {
      const p3 = pages[2];
      // Principal block only — one signer per contract.
      stampText(p3, signature_name, 210, 321.8, font, 11);
      if (sigImg) {
        const dims = sigImg.scaleToFit(220, 32);
        p3.drawImage(sigImg, { x: 210, y: 292.5, width: dims.width, height: dims.height });
      }
      stampText(p3, todayFormatted(), 210, 263.3, font, 11);
    }

    // Initials on the bottom-right of every content page (skip the appended certification page)
    const initialsStamp = initials.slice(0, 6).toUpperCase();
    stampFooterInitials(pages, initialsStamp, bold);
    // Listing Agreement has five "SELLER INITIAL HERE" acknowledgement boxes in
    // the body of the document; stamp the seller's initials inside each one so
    // every requested section is affirmatively initialed.
    if (c.kind === 'listing_agreement') stampInlineInitials(pages, initialsStamp, bold);

    // === Certification / audit page (E-SIGN + UETA compliance) ===
    // Styled to match the appended data-reference sheet and template chrome.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
    const ua = req.headers.get('user-agent') ?? '';
    const nowIso = new Date().toISOString();
    const serif = await pdf.embedFont(StandardFonts.TimesRoman);
    const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
    const HAIRLINE = rgb(0.68, 0.68, 0.68);
    const certPage = pdf.addPage([612, 792]);
    const pageW = 612;

    // Masthead
    certPage.drawText('TEXAS CEMETERY BROKERS', { x: 50, y: 740, size: 9, font: bold, color: MUTED });
    certPage.drawText('Certificate of Electronic Signature', { x: 50, y: 712, size: 18, font: serifBold, color: INK });
    certPage.drawLine({ start: { x: 50, y: 700 }, end: { x: pageW - 50, y: 700 }, thickness: 0.6, color: HAIRLINE });
    certPage.drawText('Executed under the U.S. E-SIGN Act (15 U.S.C. §§ 7001 et seq.) and the Texas Uniform',
      { x: 50, y: 682, size: 9.5, font, color: MUTED });
    certPage.drawText('Electronic Transactions Act (Tex. Bus. & Com. Code Ann. Ch. 322).',
      { x: 50, y: 670, size: 9.5, font, color: MUTED });

    // Metadata card
    const rowsCard: Array<[string, string]> = [
      ['Document', c.kind === 'poa' ? 'Special Power of Attorney' : 'Exclusive Right-to-Sell Agreement'],
      ['Signer (printed)', signature_name],
    ];
    if (co_owner_name) rowsCard.push(['Co-signer (printed)', co_owner_name]);
    rowsCard.push(
      ['Initials captured', initials.slice(0, 6).toUpperCase()],
      ['Date / Time (UTC)', nowIso],
      ['IP Address', ip || 'unavailable'],
      ['User Agent', ua.slice(0, 90)],
      ['Template SHA-256', preSignHash],
      ['Contract Ref', c.id],
    );
    const cardH = 34 + rowsCard.length * 20 + 10;
    let cy = 648;
    certPage.drawRectangle({ x: 50, y: cy - cardH, width: pageW - 100, height: cardH, borderColor: HAIRLINE, borderWidth: 0.5 });
    certPage.drawText('SIGNATURE RECORD', { x: 68, y: cy - 20, size: 8.5, font: bold, color: INK });
    certPage.drawLine({ start: { x: 68, y: cy - 26 }, end: { x: pageW - 68, y: cy - 26 }, thickness: 0.4, color: HAIRLINE });
    let ry = cy - 44;
    for (const [l, v] of rowsCard) {
      certPage.drawText(l, { x: 68, y: ry, size: 8, font, color: MUTED });
      certPage.drawText(String(v), { x: 210, y: ry, size: 10.5, font: serif, color: INK });
      ry -= 20;
    }

    // Consent block
    let cy2 = cy - cardH - 22;
    certPage.drawText('Consent to electronic records and signatures', { x: 50, y: cy2, size: 11, font: serifBold, color: INK });
    cy2 -= 16;
    const consentText = [
      'By typing my name, drawing my signature, and clicking "Sign & Submit," I agreed that my electronic',
      'signature is the legal equivalent of my manual, handwritten signature. I confirmed I received,',
      'reviewed, and had the opportunity to print or save a copy of this document, and I consented to',
      'conduct this transaction electronically. I understand I may withdraw consent for future electronic',
      'records by written notice to Texas Cemetery Brokers before further electronic delivery.',
    ];
    for (const ln of consentText) { certPage.drawText(ln, { x: 50, y: cy2, size: 10, font: serif, color: INK }); cy2 -= 13; }

    // Signature card at bottom
    if (sigImg) {
      const d = sigImg.scaleToFit(240, 60);
      const boxY = 100, boxH = 90;
      certPage.drawRectangle({ x: 50, y: boxY, width: pageW - 100, height: boxH, borderColor: HAIRLINE, borderWidth: 0.5 });
      certPage.drawText('CAPTURED SIGNATURE', { x: 68, y: boxY + boxH - 18, size: 8.5, font: bold, color: INK });
      certPage.drawImage(sigImg, { x: 68, y: boxY + 22, width: d.width, height: d.height });
      certPage.drawLine({ start: { x: 68, y: boxY + 18 }, end: { x: 68 + d.width + 20, y: boxY + 18 }, thickness: 0.5, color: MUTED });
      certPage.drawText(`${signature_name}  •  ${nowIso}`, { x: 68, y: boxY + 6, size: 9, font: serif, color: INK });
    }

    // Footer chrome
    certPage.drawLine({ start: { x: 50, y: 55 }, end: { x: pageW - 50, y: 55 }, thickness: 0.4, color: HAIRLINE });
    certPage.drawText('TEXASCEMETERYBROKERS.COM', { x: 50, y: 40, size: 8, font: bold, color: MUTED });
    const cf = 'CERTIFICATE OF ELECTRONIC SIGNATURE';
    certPage.drawText(cf, { x: pageW - 50 - bold.widthOfTextAtSize(cf, 8), y: 40, size: 8, font: bold, color: MUTED });

    const out = await pdf.save();
    const signedHash = await sha256Hex(out);
    const signedPath = `${c.submission_id}/${c.kind}-signed-${Date.now()}.pdf`;
    const { error: upErr } = await svc.storage.from('contracts')
      .upload(signedPath, out, { contentType: 'application/pdf', upsert: true });
    if (upErr) throw upErr;

    await svc.from('contracts').update({
      status: 'signed',
      signed_at: nowIso,
      signed_pdf_path: signedPath,
      signature_name,
      signature_image,
      signature_initials: initials,
      co_owner_signature_name: co_owner_name ?? null,
      co_owner_signature_image: co_owner_image ?? null,
      signer_ip: ip,
      signer_user_agent: ua,
      template_hash: preSignHash,
      signed_hash: signedHash,
      consent_accepted_at: nowIso,
    }).eq('id', c.id);

    const patch: Record<string, unknown> = {};
    if (c.kind === 'listing_agreement') patch.la_signed_at = nowIso;
    if (c.kind === 'poa') patch.poa_signed_at = nowIso;
    await svc.from('contact_submissions').update(patch).eq('id', c.submission_id);

    const { data: allContracts } = await svc
      .from('contracts').select('kind,status,notarized_at,signed_at').eq('submission_id', c.submission_id);
    const la = allContracts?.find((x) => x.kind === 'listing_agreement');
    const poa = allContracts?.find((x) => x.kind === 'poa');
    const completed = !!la?.signed_at && !!(poa?.notarized_at || poa?.signed_at);
    if (completed) {
      await svc.from('contact_submissions').update({
        contracts_completed_at: nowIso,
        texas_pipeline_stage: 'completed',
      }).eq('id', c.submission_id);
    }

    // === Email a receipt copy to the seller immediately after they sign ===
    try {
      const { data: sub } = await svc.from('contact_submissions')
        .select('email, name, cemetery').eq('id', c.submission_id).maybeSingle();
      const to = sub?.email;
      const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (to && RESEND_KEY && LOVABLE_API_KEY) {
        // Chunk-safe base64 encoding for large PDFs
        let bin = '';
        const CHUNK = 0x8000;
        for (let i = 0; i < out.length; i += CHUNK) {
          bin += String.fromCharCode(...out.subarray(i, i + CHUNK));
        }
        const b64 = btoa(bin);
        const docLabel = c.kind === 'poa' ? 'Power of Attorney' : 'Exclusive Right-to-Sell Agreement';
        const filename = `${(sub?.name ?? 'seller').replace(/[^A-Za-z0-9_-]+/g, '_')}-${c.kind}-signed.pdf`;
        const html = `
          <div style="font-family:Georgia,'Times New Roman',serif;color:#1f2a37;max-width:600px;margin:0 auto;padding:32px 24px;background:#f5f1ea">
            <div style="text-align:center;border-bottom:1px solid #d9c7a3;padding-bottom:20px;margin-bottom:24px">
              <div style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#8a7853">Texas Cemetery Brokers</div>
              <div style="font-size:22px;margin-top:8px;color:#1f2a37">Signature received — thank you</div>
            </div>
            <p>Hi ${sub?.name ?? ''},</p>
            <p>We have received your signed <strong>${docLabel}</strong>${sub?.cemetery ? ` for <em>${sub.cemetery}</em>` : ''}. A copy of exactly what you signed is attached to this email for your records.</p>
            <p><strong>What happens next:</strong> our broker will now countersign the document. As soon as that is complete you'll receive a second email with the <em>fully executed</em> copy attached.</p>
            ${c.kind === 'poa' ? '<p>Reminder: the Power of Attorney becomes fully effective once it is notarized. We will send a separate email with the notary session link.</p>' : ''}
            <p>If anything looks off, simply reply to this email and we'll help right away.</p>
            <p style="margin-top:28px;color:#8a7853;font-size:13px">— Texas Cemetery Brokers<br/><a href="https://www.texascemeterybrokers.com" style="color:#8a7853">www.texascemeterybrokers.com</a></p>
          </div>`;
        const emailRes = await fetch('https://connector-gateway.lovable.dev/resend/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'X-Connection-Api-Key': RESEND_KEY,
          },
          body: JSON.stringify({
            from: 'Texas Cemetery Brokers <contracts@texascemeterybrokers.com>',
            to: [to],
            bcc: ['contracts@texascemeterybrokers.com'],
            subject: `Signature received — your ${docLabel} (copy attached)`,
            html,
            attachments: [{ filename, content: b64 }],
          }),
        });
        if (emailRes.ok) {
          await svc.from('contracts')
            .update({ signed_copy_emailed_at: new Date().toISOString() })
            .eq('id', c.id);
          // Also log into email_messages so it appears in the submission's email history
          try {
            await svc.from('email_messages').insert({
              matched_submission_id: c.submission_id,
              direction: 'outbound',
              from_email: 'contracts@texascemeterybrokers.com',
              to_email: to,
              subject: `Signature received — your ${docLabel} (copy attached)`,
              body_html: html,
              body_text: `We received your signed ${docLabel}. A copy is attached.`,
              received_at: new Date().toISOString(),
            });
          } catch (logErr) { console.error('log email_messages failed', logErr); }
        } else {
          console.error('receipt email non-ok', emailRes.status, await emailRes.text());
        }
      }
    } catch (mailErr) {
      console.error('email receipt failed', mailErr);
    }



    return new Response(JSON.stringify({ ok: true, completed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('sign-contract error', err);
    return new Response(JSON.stringify({ error: String((err as Error).message ?? err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
