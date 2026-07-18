// Generates a filled contract PDF (Listing Agreement or POA) by overlaying seller
// data directly onto the template blanks, and returns a signing URL (LA) or a
// download link (POA). Also appends a plain-text "Seller Information Sheet" as a
// tamper-check reference page.
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { buildFilledPdf, type FillData } from '../_shared/contract-fill.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
    let cemeteryCity: string | null = null;
    if (sub.cemetery) {
      const { data: cem } = await svc
        .from('texas_cemeteries').select('transfer_fee, city').ilike('name', sub.cemetery).maybeSingle();
      if (cem?.transfer_fee != null) transferFee = Number(cem.transfer_fee);
      cemeteryCity = cem?.city ?? null;
    }

    const authMinTotal = Number(overrides.authorized_min_total ?? sub.list_price ?? sub.cemetery_retail ?? 0);
    const plots = Number(sub.plot_count ?? 1) || 1;

    // County/State for the Interment Property: default to the cemetery's city + TX
    // (admin can override in the review dialog). Never mix the seller's own address here.
    const cemLocationCity = cemeteryCity ?? sub.cemetery_city ?? '';
    const defaultCountyState = cemLocationCity ? `${cemLocationCity}, TX` : '';

    const fill: FillData = {
      seller_name: overrides.seller_name ?? sub.name ?? '',
      co_owner_name: overrides.co_owner_name ?? sub.deed_owner_names ?? '',
      // Seller's own mailing address — leave blank when unknown; the seller fills it on the sign page.
      address: overrides.address ?? '',
      city_state_zip: overrides.city_state_zip ?? '',
      phone: overrides.phone ?? sub.phone ?? '',
      email: overrides.email ?? sub.email ?? '',
      cemetery: overrides.cemetery ?? sub.cemetery ?? '',
      county_state: overrides.county_state ?? defaultCountyState,
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
      status: 'draft' as const,
      sign_token: signToken,
      sign_token_expires_at: signToken ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString() : null,
      fill_data: fill,
      filled_pdf_path: path,
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
