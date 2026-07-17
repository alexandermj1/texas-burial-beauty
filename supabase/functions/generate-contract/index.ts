// Generates a filled contract PDF (Listing Agreement or POA) by overlaying seller
// data directly onto the template blanks, and returns a signing URL (LA) or a
// download link (POA). Also appends a plain-text "Seller Information Sheet" as a
// tamper-check reference page.
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'npm:pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface FillData {
  seller_name: string;
  co_owner_name?: string;
  address?: string;
  city_state_zip?: string;
  phone?: string;
  email?: string;
  cemetery?: string;
  county_state?: string;
  plot_count?: number | string;
  plot_description?: string;
  authorized_min_per_plot?: number;
  authorized_min_total?: number;
  listing_option?: string; // Starter | Pro | Featured
  quote_amount?: number;
  retail_price?: number;
  transfer_fee?: number;
}

const INK = rgb(0.05, 0.15, 0.28); // dark navy — reads clearly as filled-in
const MUTED = rgb(0.3, 0.3, 0.3);

function money(n?: number | null): string {
  if (n == null || Number.isNaN(Number(n))) return '';
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

async function fetchTemplate(
  svc: ReturnType<typeof createClient>,
  kind: 'listing_agreement' | 'poa',
): Promise<Uint8Array> {
  const file = kind === 'poa' ? 'poa-template.pdf' : 'listing-agreement-template.pdf';
  const { data, error } = await svc.storage.from('contracts').download(`_templates/${file}`);
  if (error || !data) throw new Error(`Could not fetch contract template: ${error?.message ?? 'missing'}`);
  const buf = new Uint8Array(await data.arrayBuffer());
  const header = new TextDecoder().decode(buf.slice(0, 5));
  if (header !== '%PDF-') throw new Error('Template is not a valid PDF');
  return buf;
}

/** Draw text on a template blank. y is the baseline in pdf-lib coords (bottom-left origin). */
function stamp(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size = 11, color = INK) {
  if (!text) return;
  page.drawText(String(text), { x, y, size, font, color });
}

/** Draw a bold "X" mark inside a checkbox at (cx, cy) center. */
function checkMark(page: PDFPage, cx: number, cy: number, font: PDFFont) {
  page.drawText('X', { x: cx - 4, y: cy - 4, size: 14, font, color: INK });
}

function buildLaOverlays(page1: PDFPage, page2: PDFPage, page8: PDFPage, font: PDFFont, bold: PDFFont, data: FillData) {
  // === Page 1 – Seller identity + interment property ===
  // Baselines derived from template label positions (pdfplumber y1 -> 792 - y1)
  const X_FIELD = 225;
  stamp(page1, data.seller_name ?? '', X_FIELD, 443, font, 11);
  stamp(page1, data.address ?? '', X_FIELD, 417, font, 11);
  stamp(page1, data.city_state_zip ?? '', X_FIELD, 391, font, 11);
  stamp(page1, data.phone ?? '', X_FIELD, 364, font, 11);
  stamp(page1, data.email ?? '', X_FIELD, 338, font, 11);

  // Interment Property box
  stamp(page1, data.cemetery ?? '', X_FIELD, 256, font, 11);
  stamp(page1, data.plot_count ? String(data.plot_count) : '', X_FIELD, 230, font, 11);
  // Multi-line description (up to ~55 char lines, 3 rows available)
  const desc = data.plot_description ?? '';
  const wrap = (s: string, w: number) => {
    const words = s.split(/\s+/); const out: string[] = []; let cur = '';
    for (const wd of words) {
      if ((cur + ' ' + wd).trim().length > w) { if (cur) out.push(cur); cur = wd; } else { cur = (cur + ' ' + wd).trim(); }
    }
    if (cur) out.push(cur);
    return out;
  };
  const lines = wrap(desc, 55).slice(0, 3);
  lines.forEach((ln, i) => stamp(page1, ln, X_FIELD, 193 - i * 22, font, 10));

  // === Page 2 – Option checkbox + Authorized minimum ===
  const opt = (data.listing_option ?? '').toLowerCase();
  if (opt.includes('starter') || opt === 'option 1') checkMark(page2, 108, 712, bold);
  else if (opt.includes('pro')) checkMark(page2, 108, 637, bold);
  else if (opt.includes('featured')) checkMark(page2, 108, 562, bold);

  // Authorized Minimum Price line
  if (data.authorized_min_per_plot != null) {
    stamp(page2, money(data.authorized_min_per_plot).replace('$', ''), 288, 379, font, 11);
  }
  if (data.authorized_min_total != null) {
    stamp(page2, money(data.authorized_min_total).replace('$', ''), 555, 379, font, 11);
  }

  // === Page 8 – Broker signature is preprinted; Seller side left for sign-contract ===
  // (Signatures are stamped by sign-contract to preserve wet-ink appearance and audit.)
  // Nothing to write here at generation time.

  // === Footer note on every page ===
  const pages = [page1, page2];
  for (const p of pages) {
    // no-op; keep original template footer
  }
}

function buildPoaOverlays(page1: PDFPage, page3: PDFPage, font: PDFFont, bold: PDFFont, data: FillData) {
  const X_FIELD = 225;
  // Page 1 principal block
  stamp(page1, data.seller_name ?? '', X_FIELD, 421, font, 11);
  stamp(page1, data.address ?? '', X_FIELD, 394, font, 11);
  stamp(page1, data.city_state_zip ?? '', X_FIELD, 368, font, 11);

  // Interment property block
  stamp(page1, data.cemetery ?? '', X_FIELD, 224, font, 11);
  stamp(page1, data.county_state ?? '', X_FIELD, 198, font, 11);
  stamp(page1, data.plot_count ? String(data.plot_count) : '', X_FIELD, 172, font, 11);
  const desc = data.plot_description ?? '';
  if (desc) {
    const parts = desc.length > 55 ? [desc.slice(0, 55), desc.slice(55, 110)] : [desc];
    parts.forEach((ln, i) => stamp(page1, ln, X_FIELD, 135 - i * 22, font, 10));
  }
}

function appendInfoSheet(pdf: PDFDocument, font: PDFFont, bold: PDFFont, kind: string, data: FillData) {
  const page = pdf.addPage([612, 792]);
  const { width } = page.getSize();
  let y = 750;
  page.drawText(kind === 'poa' ? 'POA — DATA REFERENCE SHEET' : 'LISTING AGREEMENT — DATA REFERENCE SHEET',
    { x: 50, y, size: 15, font: bold, color: rgb(0.15, 0.28, 0.22) });
  y -= 12;
  page.drawText('The fields above are stamped from this reference sheet. Verify each entry before signing.',
    { x: 50, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
  y -= 20;
  const row = (label: string, value?: string) => {
    if (!value) return;
    page.drawText(label, { x: 50, y, size: 9, font: bold, color: MUTED });
    page.drawText(String(value), { x: 210, y, size: 11, font });
    y -= 18;
  };
  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  y -= 14;
  row('SELLER / PRINCIPAL', data.seller_name);
  row('CO-OWNER', data.co_owner_name);
  row('ADDRESS', data.address);
  row('CITY / STATE / ZIP', data.city_state_zip);
  row('TELEPHONE', data.phone);
  row('EMAIL', data.email);
  y -= 6;
  row('CEMETERY', data.cemetery);
  row('COUNTY / STATE', data.county_state);
  row('PLOTS', data.plot_count ? String(data.plot_count) : undefined);
  row('DESCRIPTION', data.plot_description);
  if (kind === 'listing_agreement') {
    y -= 6;
    row('LISTING OPTION', data.listing_option);
    row('AUTH. MIN / PLOT', money(data.authorized_min_per_plot));
    row('AUTH. MIN TOTAL', money(data.authorized_min_total));
    row('SELLER NET AT MIN (85%)',
      data.authorized_min_total ? money(Math.round(Number(data.authorized_min_total) * 0.85)) : undefined);
  } else {
    y -= 6;
    row('QUOTED TO SELLER', money(data.quote_amount));
    row('TRANSFER FEE (BUYER)', money(data.transfer_fee));
  }
}

async function buildFilledPdf(
  templateBytes: Uint8Array,
  kind: 'listing_agreement' | 'poa',
  data: FillData,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(templateBytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages = pdf.getPages();

  if (kind === 'listing_agreement') {
    // Template has 9 pages; overlay onto 1, 2 (options / auth min), 8 (signature) reserved for sign.
    if (pages.length >= 8) buildLaOverlays(pages[0], pages[1], pages[7], font, bold, data);
  } else {
    if (pages.length >= 3) buildPoaOverlays(pages[0], pages[2], font, bold, data);
  }

  appendInfoSheet(pdf, font, bold, kind, data);
  return await pdf.save();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { submission_id, kind, overrides = {} } = await req.json();
    if (!submission_id || !['listing_agreement', 'poa'].includes(kind)) {
      return new Response(JSON.stringify({ error: 'bad request' }), { status: 400, headers: corsHeaders });
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const svc = createClient(SUPABASE_URL, SERVICE_KEY);
    const asUser = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await asUser.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const { data: sub, error: subErr } = await svc
      .from('contact_submissions').select('*').eq('id', submission_id).maybeSingle();
    if (subErr || !sub) throw subErr ?? new Error('submission not found');

    let transferFee: number | null = sub.transfer_fee_amount ?? null;
    if (sub.cemetery) {
      const { data: cem } = await svc
        .from('texas_cemeteries').select('transfer_fee').ilike('name', sub.cemetery).maybeSingle();
      if (cem?.transfer_fee != null) transferFee = Number(cem.transfer_fee);
    }

    const authMinTotal = Number(overrides.authorized_min_total ?? sub.list_price ?? sub.cemetery_retail ?? 0);
    const plots = Number(sub.plot_count ?? 1) || 1;

    const fill: FillData = {
      seller_name: overrides.seller_name ?? sub.name ?? '',
      co_owner_name: overrides.co_owner_name ?? sub.deed_owner_names ?? '',
      address: overrides.address ?? sub.mailing_address ?? '',
      city_state_zip: overrides.city_state_zip ?? [sub.cemetery_city, sub.state, sub.zip_code].filter(Boolean).join(', '),
      phone: overrides.phone ?? sub.phone ?? '',
      email: overrides.email ?? sub.email ?? '',
      cemetery: overrides.cemetery ?? sub.cemetery ?? '',
      county_state: overrides.county_state ?? [sub.cemetery_city, sub.state].filter(Boolean).join(', '),
      plot_count: overrides.plot_count ?? sub.plot_count ?? '',
      plot_description: overrides.plot_description ??
        [sub.section && `Section ${sub.section}`, sub.spaces && `Spaces ${sub.spaces}`, sub.space_numbers]
          .filter(Boolean).join(' • '),
      authorized_min_total: authMinTotal || undefined,
      authorized_min_per_plot: authMinTotal ? Math.round(authMinTotal / plots) : undefined,
      listing_option: overrides.listing_option ?? sub.listing_tier ?? sub.listing_option ?? 'Starter',
      quote_amount: Number(sub.quote_amount ?? 0) || undefined,
      retail_price: Number(sub.cemetery_retail ?? 0) || undefined,
      transfer_fee: transferFee ?? undefined,
    };

    const templateBytes = await fetchTemplate(svc, kind);
    const filled = await buildFilledPdf(templateBytes, kind, fill);

    const path = `${submission_id}/${kind}-${Date.now()}.pdf`;
    const { error: upErr } = await svc.storage
      .from('contracts')
      .upload(path, filled, { contentType: 'application/pdf', upsert: true });
    if (upErr) throw upErr;

    const signToken = kind === 'listing_agreement'
      ? crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
      : null;

    const { data: existing } = await svc
      .from('contracts').select('id').eq('submission_id', submission_id).eq('kind', kind).maybeSingle();

    const row = {
      submission_id,
      kind,
      status: 'sent' as const,
      sign_token: signToken,
      sign_token_expires_at: signToken ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString() : null,
      fill_data: fill,
      filled_pdf_path: path,
      sent_at: new Date().toISOString(),
      created_by: userData.user.id,
    };
    if (existing) await svc.from('contracts').update(row).eq('id', existing.id);
    else await svc.from('contracts').insert(row);

    const { data: signedUrl } = await svc.storage.from('contracts').createSignedUrl(path, 60 * 60 * 24);

    if (kind === 'listing_agreement') {
      await svc.from('contact_submissions').update({ la_issued_at: new Date().toISOString() }).eq('id', submission_id);
    }

    return new Response(JSON.stringify({
      ok: true, sign_token: signToken, pdf_url: signedUrl?.signedUrl ?? null, pdf_path: path,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('generate-contract error', err);
    return new Response(JSON.stringify({ error: String((err as Error).message ?? err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
