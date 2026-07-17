// Public endpoint: lets a seller view a contract by token and submit their signature.
// GET  ?token=... returns metadata (submission info + signed PDF URL to display)
// POST { token, signature_name, signature_image, initials, co_owner_name?, co_owner_image? }
//   -> stamps signature onto PDF, saves signed copy, marks contract signed.
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const svc = createClient(SUPABASE_URL, SERVICE_KEY);

async function loadContract(token: string) {
  const { data } = await svc
    .from('contracts').select('*').eq('sign_token', token).maybeSingle();
  return data;
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
      // Mark viewed
      if (!c.viewed_at) {
        await svc.from('contracts').update({ viewed_at: new Date().toISOString(), status: c.status === 'sent' ? 'viewed' : c.status }).eq('id', c.id);
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
    const { token, signature_name, signature_image, initials, co_owner_name, co_owner_image } = body;
    if (!token || !signature_name || !signature_image) {
      return new Response(JSON.stringify({ error: 'missing_fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const c = await loadContract(token);
    if (!c) return new Response(JSON.stringify({ error: 'invalid' }), { status: 404, headers: corsHeaders });
    if (c.signed_at) {
      return new Response(JSON.stringify({ error: 'already_signed' }), { status: 409, headers: corsHeaders });
    }

    // Load existing filled PDF
    const { data: file } = await svc.storage.from('contracts').download(c.filled_pdf_path);
    if (!file) throw new Error('filled pdf missing');
    const pdf = await PDFDocument.load(new Uint8Array(await file.arrayBuffer()));
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const page = pdf.addPage([612, 792]);
    let y = 740;
    page.drawText('SIGNATURE CERTIFICATION', { x: 50, y, size: 16, font: bold, color: rgb(0.15, 0.28, 0.22) });
    y -= 30;
    page.drawText(`Signed by: ${signature_name}`, { x: 50, y, size: 12, font: bold });
    y -= 18;
    page.drawText(`Date: ${new Date().toUTCString()}`, { x: 50, y, size: 10, font });
    y -= 14;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
    const ua = req.headers.get('user-agent') ?? '';
    page.drawText(`IP: ${ip}`, { x: 50, y, size: 9, font, color: rgb(0.3,0.3,0.3) });
    y -= 12;
    page.drawText(`User agent: ${ua.slice(0, 110)}`, { x: 50, y, size: 9, font, color: rgb(0.3,0.3,0.3) });
    y -= 30;

    // Embed signature image (data URL)
    async function embedSig(dataUrl: string, label: string, name: string, yStart: number): Promise<number> {
      let yy = yStart;
      page.drawText(label, { x: 50, y: yy, size: 10, font: bold });
      yy -= 14;
      const m = /^data:image\/(png|jpeg);base64,(.+)$/.exec(dataUrl);
      if (m) {
        const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
        const img = m[1] === 'png' ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        const dims = img.scaleToFit(300, 80);
        page.drawImage(img, { x: 50, y: yy - dims.height, width: dims.width, height: dims.height });
        yy -= dims.height + 6;
      }
      page.drawLine({ start: { x: 50, y: yy }, end: { x: 380, y: yy }, thickness: 0.5, color: rgb(0.4,0.4,0.4) });
      yy -= 12;
      page.drawText(name, { x: 50, y: yy, size: 10, font });
      yy -= 24;
      return yy;
    }

    y = await embedSig(signature_image, 'PRINCIPAL SIGNATURE', signature_name, y);
    if (co_owner_image && co_owner_name) {
      y = await embedSig(co_owner_image, 'CO-OWNER SIGNATURE', co_owner_name, y);
    }

    if (initials) {
      page.drawText(`Initials on required sections: ${initials}`, { x: 50, y, size: 10, font: bold });
    }

    const out = await pdf.save();
    const signedPath = `${c.submission_id}/${c.kind}-signed-${Date.now()}.pdf`;
    await svc.storage.from('contracts').upload(signedPath, out, { contentType: 'application/pdf', upsert: true });

    const now = new Date().toISOString();
    await svc.from('contracts').update({
      status: c.kind === 'poa' ? 'signed' : 'signed',
      signed_at: now,
      signed_pdf_path: signedPath,
      signature_name,
      signature_image,
      signature_initials: initials ?? null,
      co_owner_signature_name: co_owner_name ?? null,
      co_owner_signature_image: co_owner_image ?? null,
      signer_ip: ip,
      signer_user_agent: ua,
    }).eq('id', c.id);

    // Mirror on submission
    const patch: Record<string, unknown> = {};
    if (c.kind === 'listing_agreement') patch.la_signed_at = now;
    if (c.kind === 'poa') patch.poa_signed_at = now;
    await svc.from('contact_submissions').update(patch).eq('id', c.submission_id);

    // Check completion
    const { data: allContracts } = await svc
      .from('contracts').select('kind,status,notarized_at,signed_at').eq('submission_id', c.submission_id);
    const la = allContracts?.find((x) => x.kind === 'listing_agreement');
    const poa = allContracts?.find((x) => x.kind === 'poa');
    const completed = !!la?.signed_at && !!(poa?.notarized_at || poa?.signed_at);
    if (completed) {
      await svc.from('contact_submissions').update({
        contracts_completed_at: now,
        texas_pipeline_stage: 'completed',
      }).eq('id', c.submission_id);
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
