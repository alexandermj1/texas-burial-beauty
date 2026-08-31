// Generates a filled contract PDF (Listing Agreement or POA) by overlaying seller
// data directly onto the template blanks, and returns a signing URL (LA) or a
// download link (POA). Also appends a plain-text "Seller Information Sheet" as a
// tamper-check reference page.
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { buildFilledPdf, type FillData } from '../_shared/contract-fill.ts';
import { buildAffidavitPdf, buildSpousalConsentPdf, buildJointPoaPdf } from '../_shared/affidavit-heirship.ts';
import { contactFor, nameKey } from '../_shared/questionnaire-contacts.ts';
import { formatPlotDescription } from '../_shared/plot-description.ts';
import { isInternalCall } from '../_shared/internal-auth.ts';


const KINDS = ['listing_agreement', 'poa', 'affidavit_heirship', 'spousal_consent'] as const;
type Kind = typeof KINDS[number];

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
    if (!submission_id || !KINDS.includes(kind)) {
      return new Response(JSON.stringify({ error: 'bad request' }), { status: 400, headers: corsHeaders });
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const svc = createClient(SUPABASE_URL, SERVICE_KEY);
    const internal = isInternalCall(req);
    const asUser = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = internal ? { data: { user: null } } : await asUser.auth.getUser();
    if (!internal && !userData.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const { data: sub, error: subErr } = await svc
      .from('contact_submissions').select('*').eq('id', submission_id).maybeSingle();
    if (subErr || !sub) throw subErr ?? new Error('submission not found');

    // Merge duplicate submissions by email: the selected row (visible "primary"
    // after dedup) may be missing the quote we sent on a sibling row. Fill any
    // null/empty field from whichever duplicate has it so the contract picks
    // up quote_amount, cemetery_retail, listing_tier, plot info, etc.
    if (sub.email) {
      const { data: sibs } = await svc
        .from('contact_submissions').select('*').eq('email', sub.email);
      for (const s of sibs ?? []) {
        if ((s as any).id === (sub as any).id) continue;
        for (const [k, v] of Object.entries(s as any)) {
          if ((sub as any)[k] == null || (sub as any)[k] === '') (sub as any)[k] = v;
        }
      }
    }

    let transferFee: number | null = sub.transfer_fee_amount ?? null;
    let cemeteryCity: string | null = null;
    if (sub.cemetery) {
      const { data: cem } = await svc
        .from('texas_cemeteries').select('transfer_fee, city').ilike('name', sub.cemetery).maybeSingle();
      if (cem?.transfer_fee != null) transferFee = Number(cem.transfer_fee);
      cemeteryCity = cem?.city ?? null;
    }

    // Authorized minimum = the quoted price we actually sent the seller (what they accepted).
    // Fall back to list_price / retail only when no quote exists on the submission.
    const authMinTotal = Number(
      overrides.authorized_min_total ??
      sub.quote_amount ??
      sub.list_price ??
      sub.cemetery_retail ??
      0,
    );
    // Prefer explicit plot_count, then fall back to `spaces` (many submissions store the plot
     // count there and leave plot_count null). Also honour an admin override from the review dialog.
     const plots = Number(
       overrides.plot_count ?? sub.plot_count ?? sub.spaces ?? 1,
     ) || 1;

    // The plot description an admin typed on the quote / listing agreement is
    // the controlling wording — it is stored on the submission and reused
    // verbatim on every later document. Only fall back to parsing the raw
    // section/lot fields when nobody has written one.
    const adminPlotDescription = typeof overrides.plot_description === 'string' && overrides.plot_description.trim()
      ? overrides.plot_description.trim()
      : (typeof sub.plot_description === 'string' && sub.plot_description.trim() ? sub.plot_description.trim() : '');
    if (
      typeof overrides.plot_description === 'string' && overrides.plot_description.trim() &&
      overrides.plot_description.trim() !== (sub.plot_description ?? '')
    ) {
      await svc.from('contact_submissions')
        .update({ plot_description: overrides.plot_description.trim() })
        .eq('id', submission_id);
    }
    const plotDescription = adminPlotDescription ||
      formatPlotDescription({ section: sub.section, lawn: sub.lawn, spaces: sub.spaces, space_numbers: sub.space_numbers });
    const plotDescriptionNoCount = adminPlotDescription ||
      formatPlotDescription({ section: sub.section, lawn: sub.lawn, space_numbers: sub.space_numbers });

    // County/State for the Interment Property: default to the cemetery's city + TX
    // (admin can override in the review dialog). Never mix the seller's own address here.
    const cemLocationCity = cemeteryCity ?? sub.cemetery_city ?? '';
    const defaultCountyState = cemLocationCity ? `${cemLocationCity}, TX` : '';


    // Everything the seller told us in the family-tree questionnaire — the POA
    // is now built entirely from this, so nothing is left blank for them to fill.
    const ownership = (sub.ownership_answers ?? {}) as Record<string, unknown>;
    const people = Array.isArray(ownership.people) ? ownership.people as Record<string, string>[] : [];
    const spouseOnRoster = people.find((p) => p.role === 'spouse')?.name;
    const affiant = overrides.seller_name ?? sub.name ?? '';

    const rawPrincipal = String(
      overrides.seller_name ??
      (Array.isArray(overrides.joint_names) ? (overrides.joint_names as string[])[0] : '') ??
      sub.name ?? '',
    );
    // Always print the full legal name the seller gave us in the questionnaire
    // ("David Allan Cline"), not the short name on the enquiry ("David Cline").
    const rosterNames = [
      ...people.map((p) => p.name),
      ...(Array.isArray((sub as Record<string, unknown>).ownership_roster)
        ? ((sub as Record<string, unknown>).ownership_roster as Record<string, string>[]).map((p) => p.name)
        : []),
      ...(() => {
        const v2 = (ownership.v2 ?? {}) as Record<string, unknown>;
        const deed = Array.isArray(v2.deed) ? v2.deed as Record<string, string>[] : [];
        // The last step of the family tree asks for each signer's name exactly
        // as it reads on their ID, so that spelling wins on the document.
        const contacts = (v2.contacts ?? {}) as Record<string, { legal?: string }>;
        const legal = Object.values(contacts).map((c) => String(c?.legal ?? ''));
        return [...deed.map((d) => d.n), ...legal];
      })(),
    ].filter((n) => typeof n === 'string' && n.trim());
    const fullName = (n: string) => {
      const key = nameKey(n);
      const hits = rosterNames.filter((c) => nameKey(c) === key);
      // Prefer the most complete spelling (middle names included).
      return hits.sort((a, b) => b.trim().length - a.trim().length)[0] ?? n;
    };
    const principalName = fullName(rawPrincipal);
    const sellerContact = contactFor(ownership, principalName);

    // A submission can require one POA per signer. Keep each person's document
    // in its own contract row instead of letting the next generated POA replace
    // the previous person's PDF.
    const principalKey = kind === 'poa' ? nameKey(principalName) : '';

    const fill: FillData = {
      seller_name: principalName || (sub.name ?? ''),
      co_owner_name: overrides.co_owner_name ?? sub.deed_owner_names ?? '',
      // The signer writes their own address on the Power of Attorney in front of
      // the notary, so we never pre-print one there. Other documents keep using
      // whatever address we hold.
      address: kind === 'poa' ? '' : (overrides.address || sellerContact.address || ''),
      city_state_zip: kind === 'poa' ? '' : (overrides.city_state_zip || sellerContact.city_state_zip || ''),
      phone: overrides.phone || sellerContact.phone || sub.phone || '',
      email: overrides.email || sellerContact.email || sub.email || '',
      cemetery: overrides.cemetery ?? sub.cemetery ?? '',
      // POAs never carry a county: our stored county is frequently wrong, and the
      // acknowledgment county must be where the signing happens, not the cemetery.
      county_state: kind === 'poa' ? '' : (overrides.county_state ?? defaultCountyState),
      plot_count: overrides.plot_count ?? sub.plot_count ?? sub.spaces ?? '',
      // The POA must describe the property exactly as the quote / listing
      // agreement does, so a later edit to that wording flows through here too.
      plot_description: kind === 'poa' ? (plotDescriptionNoCount || plotDescription) : plotDescription,

      authorized_min_total: authMinTotal || undefined,
      authorized_min_per_plot: Number(overrides.authorized_min_per_plot) ||
        (authMinTotal ? Math.round(authMinTotal / plots) : undefined),
      listing_option: overrides.listing_option ?? sub.listing_tier ?? sub.listing_option ?? 'Starter',
      quote_amount: Number(sub.quote_amount ?? 0) || undefined,
      retail_price: Number(sub.cemetery_retail ?? 0) || undefined,
      transfer_fee: transferFee ?? undefined,
    };


    let filled: Uint8Array;
    if (kind === 'affidavit_heirship') {
      // Same rule as the POA: the legal spelling and the address the seller gave
      // in the questionnaire win over the short name on the enquiry.
      const affiantName = fullName(affiant);
      const affiantContact = contactFor(ownership, affiantName);
      filled = await buildAffidavitPdf({
        county: overrides.county ?? cemLocationCity ?? '',
        affiant_name: affiantName,
        affiant_address: [overrides.address, overrides.city_state_zip].filter(Boolean).join(', ') ||
          [affiantContact.address, affiantContact.city_state_zip].filter(Boolean).join(', '),
        affiant_relationship: overrides.affiant_relationship ?? sub.relationship_to_owner ?? '',
        affiant_is_heir: overrides.affiant_is_heir ?? true,
        decedent_name: overrides.decedent_name ?? sub.deed_owner_names ?? '',
        // Only people who actually inherit FROM the decedent belong in the heir
        // table. A spouse of an heir (e.g. the seller's wife) holds a right of
        // interment and consents separately — she is not an heir of the decedent
        // and must not be sworn to as one.
        heirs: overrides.heirs ?? people
          .filter((p) => p.role === 'heir' || p.role === 'co_owner')
          .filter((p) => !/husband or wife of|spouse of (?!.*deed)/i.test(p.relationship ?? ''))
          .map((p) => {
            const n = fullName(p.name);
            const c = contactFor(ownership, n);
            return {
              name: n,
              relationship: p.relationship ?? '',
              address: p.address || [c.address, c.city_state_zip].filter(Boolean).join(', '),
            };
          }),
        surviving_spouse: overrides.surviving_spouse ?? (spouseOnRoster ? fullName(spouseOnRoster) : ''),
        cemetery: overrides.cemetery ?? sub.cemetery ?? '',
        cemetery_city: cemLocationCity,
        plot_description: plotDescriptionNoCount,
        spaces: sub.spaces ?? '',
        include_spouse_page: overrides.include_spouse_page ?? ownership.spouse === 'yes',
      });
    } else if (kind === 'spousal_consent') {
      filled = await buildSpousalConsentPdf({
        county: overrides.county ?? cemLocationCity ?? '',
        spouse_name: fullName(String(overrides.spouse_name ?? spouseOnRoster ?? overrides.seller_name ?? '')),
        owner_name: fullName(String(overrides.owner_name ?? sub.deed_owner_names ?? sub.name ?? '')),
        cemetery: overrides.cemetery ?? sub.cemetery ?? '',
        cemetery_city: cemLocationCity,
        plot_description: plotDescriptionNoCount,
        spaces: sub.spaces ?? '',
      });

    } else if (kind === 'poa' && Array.isArray(overrides.joint_names) && overrides.joint_names.filter(Boolean).length > 1) {
      // A married couple signing one instrument instead of one POA each.
      const jointNames = (overrides.joint_names as string[]).filter(Boolean).slice(0, 2).map(fullName);
      // Remember this on the contract so every later regeneration (the seller's
      // sign page, the notary packet) rebuilds the JOINT document, not the
      // single-signer template.
      (fill as Record<string, unknown>).joint_names = jointNames;
      fill.seller_name = jointNames.join(' & ');
      filled = await buildJointPoaPdf({
        county: overrides.county ?? overrides.county_state ?? cemLocationCity ?? '',
        county_state: fill.county_state,
        // Left blank on purpose: each principal fills in their own address when
        // they sign the joint Power of Attorney before the notary.
        principals: jointNames.map((n) => ({ name: n, address: '' })),

        cemetery: overrides.cemetery ?? sub.cemetery ?? '',
        cemetery_city: cemLocationCity,
        plot_description: plotDescriptionNoCount,
        spaces: adminPlotDescription ? '' : (sub.spaces ?? ''),
        phone: fill.phone,
        email: fill.email,
      });

    } else {
      const templateBytes = await fetchTemplate(svc, kind as 'listing_agreement' | 'poa');
      filled = await buildFilledPdf(templateBytes, kind as 'listing_agreement' | 'poa', fill);
    }

    const path = `${submission_id}/${kind}-${Date.now()}.pdf`;
    const { error: upErr } = await svc.storage
      .from('contracts')
      .upload(path, filled, { contentType: 'application/pdf', upsert: true });
    if (upErr) throw upErr;

    // Both the Listing Agreement and the Power of Attorney get a signing token.
    // The LA uses it for a full e-sign session; the POA uses it for a lightweight
    // "confirm your mailing address" page that then emails the seller a notary-ready packet.
    //
    // IMPORTANT: if this document already exists we KEEP the existing signing
    // token (and its sent status). Rotating the token on every regeneration
    // silently invalidated links we had already emailed — sellers landed on
    // "Link not valid".
    const { data: existing } = await svc
      .from('contracts')
      .select('id, sign_token, sign_token_expires_at, status, sent_at, signed_at')
      .eq('submission_id', submission_id)
      .eq('kind', kind)
      .eq('principal_key', principalKey)
      .maybeSingle();

    const existingTokenUsable =
      !!existing?.sign_token &&
      existing.status !== 'void' &&
      (!existing.sign_token_expires_at || new Date(existing.sign_token_expires_at) > new Date());

    const signToken = existingTokenUsable
      ? (existing!.sign_token as string)
      : crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');

    // Keep "sent" (or later) states — regenerating the PDF for an already-sent
    // agreement must not knock it back to draft in the contracts panel.
    const keepStatus =
      existing && ['sent', 'viewed', 'signed', 'countersigned', 'completed'].includes(String(existing.status))
        ? (existing.status as string)
        : 'draft';

    // There is a unique constraint on (submission_id, kind), so regenerating a
    // document must update the existing row rather than insert a second one.
    const row = {
      submission_id,
      kind,
      status: keepStatus,
      sign_token: signToken,
      sign_token_expires_at: existingTokenUsable
        ? (existing!.sign_token_expires_at as string | null)
        : new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      fill_data: fill,
      filled_pdf_path: path,
      created_by: userData.user?.id ?? null,
      principal_key: principalKey,
    };

    const SELECT_COLS = 'id, kind, status, signature_name, fill_data, signed_at, notarized_at, completed_at, countersigned_at, sign_token, principal_key';
    const { data: inserted, error: insErr } = await svc.from('contracts')
      .upsert(row, { onConflict: 'submission_id,kind,principal_key' })
      .select(SELECT_COLS)
      .single();
    if (insErr) throw insErr;

    // ---- Supersede older copies of the same document -------------------
    // Editing a prepared document (fixing a name, merging two POAs into one
    // joint POA, correcting the plot description) used to leave the previous
    // version live, so the seller's document page kept showing the old PDF.
    // Any earlier, unsigned copy of the same kind that covers one of the same
    // people — or the exact row the admin was editing — is voided here.
    try {
      const newKeys = new Set(
        (kind === 'poa' && Array.isArray((fill as Record<string, unknown>).joint_names)
          ? ((fill as Record<string, unknown>).joint_names as string[])
          : [fill.seller_name])
          .map((n) => nameKey(n)).filter(Boolean),
      );
      const supersedeId = typeof overrides.supersede_contract_id === 'string'
        ? overrides.supersede_contract_id
        : null;

      const { data: siblings } = await svc.from('contracts')
        .select('id, status, principal_key, fill_data, signed_at, notarized_at, completed_at')
        .eq('submission_id', submission_id)
        .eq('kind', kind);

      const staleIds = (siblings ?? []).filter((c) => {
        const cid = c.id as string;
        if (cid === (inserted?.id as string)) return false;
        if (['signed', 'notarized', 'completed', 'void'].includes(String(c.status))) return false;
        if (c.signed_at || c.notarized_at || c.completed_at) return false;
        if (supersedeId && cid === supersedeId) return true;
        const f = (c.fill_data ?? {}) as Record<string, unknown>;
        const theirs = [
          ...(Array.isArray(f.joint_names) ? f.joint_names as string[] : []),
          String(f.seller_name ?? ''),
          String(c.principal_key ?? ''),
        ].map((n) => nameKey(n)).filter(Boolean);
        return theirs.some((k) => newKeys.has(k));
      }).map((c) => c.id as string);

      if (staleIds.length) {
        await svc.from('contracts').update({ status: 'void' }).in('id', staleIds);
      }
    } catch (e) {
      console.error('supersede older contracts failed', e);
    }




    const { data: signedUrl } = await svc.storage.from('contracts').createSignedUrl(path, 60 * 60 * 24);

    // Note: la_issued_at is intentionally NOT set here — generating a draft does
    // not mean the seller has received it. That flag is set in send-contract-link
    // once the signing link is actually emailed.

    return new Response(JSON.stringify({
      ok: true, sign_token: signToken, contract_id: inserted?.id ?? existing?.id ?? null,
      pdf_url: signedUrl?.signedUrl ?? null, pdf_path: path,
      contract: inserted ?? null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('generate-contract error', err);
    return new Response(JSON.stringify({ error: String((err as Error).message ?? err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
