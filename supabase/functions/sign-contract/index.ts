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

/** Stamp initials in the "SELLER'S INITIALS: ____" block at the bottom-right of each page. */
function stampFooterInitials(pages: PDFPage[], initials: string, font: PDFFont) {
  for (const p of pages) {
    stampText(p, initials, 712, 22, font, 10);
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

      // Email the fully executed copy to the seller
      try {
        const { data: sub } = await svc.from('contact_submissions')
          .select('email, name, cemetery').eq('id', c.submission_id).maybeSingle();
        const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
        if (sub?.email && RESEND_KEY) {
          const CHUNK = 0x8000;
          let bin = '';
          for (let i = 0; i < out.length; i += CHUNK) bin += String.fromCharCode(...out.subarray(i, i + CHUNK));
          const b64 = btoa(bin);
          const filename = `${(sub.name ?? 'seller').replace(/[^A-Za-z0-9_-]+/g, '_')}-${c.kind}-executed.pdf`;
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_KEY}` },
            body: JSON.stringify({
              from: 'Texas Cemetery Brokers <contracts@texascemeterybrokers.com>',
              to: [sub.email],
              bcc: ['contracts@texascemeterybrokers.com'],
              subject: `Fully executed ${c.kind === 'poa' ? 'Power of Attorney' : 'Listing Agreement'}${sub.cemetery ? ` — ${sub.cemetery}` : ''}`,
              html: `<div style="font-family:Georgia,serif;color:#222;max-width:560px"><p>Hi ${sub.name ?? ''},</p><p>Your ${c.kind === 'poa' ? 'Power of Attorney' : 'Listing Agreement'} has been countersigned by Texas Cemetery Brokers and is now fully executed. A copy is attached for your records.</p><p style="margin-top:24px">— Texas Cemetery Brokers</p></div>`,
              attachments: [{ filename, content: b64 }],
            }),
          });
          await svc.from('contracts').update({ signed_copy_emailed_at: nowIso }).eq('id', c.id);
        }
      } catch (e) { console.error('countersign email failed', e); }

      return new Response(JSON.stringify({ ok: true, pdf_path: outPath }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ================= SELLER SIGN (default POST) =================
    const {
      token, signature_name, signature_image, initials, consent,
      co_owner_name, co_owner_image,
    } = body;
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
      // Principal block (measured rects): printed 318.8, sig 289.5, date 260.3.
      // Co-owner block: printed 231.0, sig 201.8, date 172.5.
      stampText(p3, signature_name, 210, 321.8, font, 11);
      if (sigImg) {
        const dims = sigImg.scaleToFit(220, 32);
        p3.drawImage(sigImg, { x: 210, y: 292.5, width: dims.width, height: dims.height });
      }
      stampText(p3, todayFormatted(), 210, 263.3, font, 11);
      if (co_owner_name) stampText(p3, co_owner_name, 210, 234, font, 11);
      if (coSigImg) {
        const d2 = coSigImg.scaleToFit(220, 32);
        p3.drawImage(coSigImg, { x: 210, y: 204.8, width: d2.width, height: d2.height });
      }
      if (co_owner_name) stampText(p3, todayFormatted(), 210, 175.5, font, 11);
    }

    // Initials on the bottom-right of every content page (skip the appended certification page)
    stampFooterInitials(pages, initials.slice(0, 6).toUpperCase(), bold);

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

    // === Email a signed copy to the seller (and BCC the office) ===
    try {
      const { data: sub } = await svc.from('contact_submissions')
        .select('email, name, cemetery').eq('id', c.submission_id).maybeSingle();
      const to = sub?.email;
      const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
      if (to && RESEND_KEY) {
        const b64 = btoa(String.fromCharCode(...out));
        const docLabel = c.kind === 'poa' ? 'Power of Attorney' : 'Exclusive Right-to-Sell Agreement';
        const filename = `${(sub?.name ?? 'seller').replace(/[^A-Za-z0-9_-]+/g, '_')}-${c.kind}-signed.pdf`;
        const html = `
          <div style="font-family:Georgia,serif;color:#222;max-width:560px">
            <p>Hi ${sub?.name ?? ''},</p>
            <p>Thank you for signing your <strong>${docLabel}</strong>${sub?.cemetery ? ` for ${sub.cemetery}` : ''}. A fully executed copy is attached to this email for your records.</p>
            ${c.kind === 'poa' ? '<p>Reminder: the Power of Attorney becomes fully effective once it is notarized. We will send a separate email with the notary session link.</p>' : ''}
            <p>If anything looks off, please reply to this email and we will help right away.</p>
            <p style="margin-top:24px">— Texas Cemetery Brokers</p>
          </div>`;
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_KEY}` },
          body: JSON.stringify({
            from: 'Texas Cemetery Brokers <contracts@texascemeterybrokers.com>',
            to: [to],
            bcc: ['contracts@texascemeterybrokers.com'],
            subject: `Your signed ${docLabel} — copy for your records`,
            html,
            attachments: [{ filename, content: b64 }],
          }),
        });
        if (emailRes.ok) {
          await svc.from('contracts')
            .update({ signed_copy_emailed_at: new Date().toISOString() })
            .eq('id', c.id);
        } else {
          console.error('resend send failed', emailRes.status, await emailRes.text());
        }
      }
    } catch (mailErr) {
      console.error('email copy failed', mailErr);
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
