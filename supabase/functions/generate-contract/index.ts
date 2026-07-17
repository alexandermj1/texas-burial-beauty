// Generates a filled contract PDF (Listing Agreement or POA) for a submission
// and returns a signing URL (for LA) or a download link (for POA).
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';

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
  agreed_price?: number;
  quote_amount?: number;
  retail_price?: number;
  transfer_fee?: number;
}

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
  // Sanity check the PDF header
  const header = new TextDecoder().decode(buf.slice(0, 5));
  if (header !== '%PDF-') throw new Error('Template is not a valid PDF');
  return buf;
}

async function buildFilledPdf(
  templateBytes: Uint8Array,
  kind: 'listing_agreement' | 'poa',
  data: FillData,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(templateBytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Append a "SELLER-COMPLETED INFORMATION SHEET" page that contains every filled
  // value cleanly, so the signer sees the data plainly and the original template
  // stays intact for reference.
  const page = pdf.addPage([612, 792]); // US Letter
  const { width } = page.getSize();
  let y = 750;

  const drawH = (text: string) => {
    page.drawText(text, { x: 50, y, size: 16, font: bold, color: rgb(0.15, 0.28, 0.22) });
    y -= 24;
  };
  const drawLine = (label: string, value?: string) => {
    if (!value) return;
    page.drawText(label, { x: 50, y, size: 10, font: bold, color: rgb(0.25, 0.25, 0.25) });
    page.drawText(String(value), { x: 210, y, size: 11, font, color: rgb(0, 0, 0) });
    y -= 18;
  };
  const rule = () => {
    page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 0.5, color: rgb(0.7,0.7,0.7) });
    y -= 14;
  };

  drawH(kind === 'poa' ? 'POA — SELLER INFORMATION' : 'LISTING AGREEMENT — SELLER INFORMATION');
  rule();
  drawLine('PRINCIPAL / SELLER', data.seller_name);
  drawLine('CO-OWNER', data.co_owner_name);
  drawLine('ADDRESS', data.address);
  drawLine('CITY / STATE / ZIP', data.city_state_zip);
  drawLine('TELEPHONE', data.phone);
  drawLine('EMAIL', data.email);
  y -= 8;
  drawH('INTERMENT PROPERTY');
  rule();
  drawLine('CEMETERY', data.cemetery);
  drawLine('COUNTY / STATE', data.county_state);
  drawLine('NUMBER OF PLOTS', data.plot_count ? String(data.plot_count) : undefined);
  drawLine('PLOT DESCRIPTION', data.plot_description);

  if (kind === 'listing_agreement') {
    y -= 8;
    drawH('LISTING TERMS');
    rule();
    drawLine('LISTING OPTION', data.listing_option);
    drawLine('AUTHORIZED MIN / PLOT', money(data.authorized_min_per_plot));
    drawLine('AUTHORIZED MIN TOTAL', money(data.authorized_min_total));
    drawLine('SELLER NET AT MIN (85%)',
      data.authorized_min_total ? money(Math.round(Number(data.authorized_min_total) * 0.85)) : undefined);
  } else {
    y -= 8;
    drawH('SALE CONTEXT');
    rule();
    drawLine('QUOTED TO SELLER', money(data.quote_amount));
    drawLine('TRANSFER FEE (BUYER)', money(data.transfer_fee));
  }

  y -= 12;
  page.drawText(
    'Fields above populate the corresponding blanks in the template pages of this document.',
    { x: 50, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) },
  );

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
      .from('contact_submissions')
      .select('*')
      .eq('id', submission_id)
      .maybeSingle();
    if (subErr || !sub) throw subErr ?? new Error('submission not found');

    // Look up transfer fee from the cemeteries table if available
    let transferFee: number | null = sub.transfer_fee_amount ?? null;
    if (sub.cemetery) {
      const { data: cem } = await svc
        .from('texas_cemeteries')
        .select('transfer_fee')
        .ilike('name', sub.cemetery)
        .maybeSingle();
      if (cem?.transfer_fee != null) transferFee = Number(cem.transfer_fee);
    }

    const authMinTotal = Number(overrides.authorized_min_total ?? sub.list_price ?? sub.cemetery_retail ?? 0);
    const plots = Number(sub.plot_count ?? 1) || 1;

    const fill: FillData = {
      seller_name: overrides.seller_name ?? sub.name ?? '',
      co_owner_name: overrides.co_owner_name ?? sub.deed_owner_names ?? '',
      address: overrides.address ?? '',
      city_state_zip: overrides.city_state_zip ?? [sub.cemetery_city, sub.state].filter(Boolean).join(', '),
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
      listing_option: overrides.listing_option ?? sub.listing_tier ?? sub.listing_option ?? '',
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

    // Sign token (only meaningful for listing_agreement in-app signing)
    const signToken = kind === 'listing_agreement'
      ? crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
      : null;

    // Upsert contracts row
    const { data: existing } = await svc
      .from('contracts')
      .select('id')
      .eq('submission_id', submission_id)
      .eq('kind', kind)
      .maybeSingle();

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

    if (existing) {
      await svc.from('contracts').update(row).eq('id', existing.id);
    } else {
      await svc.from('contracts').insert(row);
    }

    // Signed URL for admin preview (24 h)
    const { data: signedUrl } = await svc.storage
      .from('contracts')
      .createSignedUrl(path, 60 * 60 * 24);

    // Mirror timestamps onto submission for legacy fields
    if (kind === 'listing_agreement') {
      await svc.from('contact_submissions')
        .update({ la_issued_at: new Date().toISOString() })
        .eq('id', submission_id);
    }

    return new Response(JSON.stringify({
      ok: true,
      sign_token: signToken,
      pdf_url: signedUrl?.signedUrl ?? null,
      pdf_path: path,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('generate-contract error', err);
    return new Response(JSON.stringify({ error: String((err as Error).message ?? err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
