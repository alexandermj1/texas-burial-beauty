// Autopilot — chains the three seller steps so one action flows into the next:
//
//   quote accepted (paid / Starter clicked / tier picked)  ->  listing agreement emailed
//   listing agreement signed                               ->  family tree emailed
//
// Nothing is re-implemented here. Each step calls the very same edge function
// the office uses by hand (generate-contract + send-contract-link, and
// ownership-questions), authenticated internally with the service-role key, so
// no accuracy is lost versus doing it manually. Every step is idempotent.
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { isInternalCall } from '../_shared/internal-auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const PUBLIC_SITE_URL = 'https://www.texascemeterybrokers.com';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const svc = createClient(SUPABASE_URL, SERVICE_KEY);

/** Call another edge function as the system (service-role). */
async function callFn(name: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(text); } catch { /* non-JSON */ }
  if (!res.ok || parsed.error) {
    throw new Error(`${name} failed (${res.status}): ${parsed.error ? JSON.stringify(parsed.error) : text.slice(0, 400)}`);
  }
  return parsed;
}

type Sub = Record<string, any>;

/** Merge sibling duplicates the same way generate-contract does, so a value
 *  captured on one row of a merged seller is never missed.
 *  IMPORTANT: only descriptive fields are borrowed. Milestone timestamps and
 *  status columns stay on this row — otherwise an old submission that was
 *  already signed would make the chain think this one is finished. */
const MERGEABLE = new Set([
  'name', 'phone', 'cemetery', 'cemetery_city', 'property_type', 'spaces', 'section', 'lawn',
  'space_numbers', 'plot_count', 'deed_owner_names', 'state', 'relationship_to_owner',
  'ownership_type', 'purchase_info', 'cemetery_retail', 'customer_profile_id',
]);

async function loadSubmission(id: string): Promise<Sub | null> {
  const { data: sub } = await svc.from('contact_submissions').select('*').eq('id', id).maybeSingle();
  if (!sub) return null;
  if (sub.email) {
    const { data: sibs } = await svc.from('contact_submissions').select('*').eq('email', sub.email);
    for (const s of sibs ?? []) {
      if ((s as Sub).id === sub.id) continue;
      for (const [k, v] of Object.entries(s as Sub)) {
        if (!MERGEABLE.has(k)) continue;
        if ((sub as Sub)[k] == null || (sub as Sub)[k] === '') (sub as Sub)[k] = v;
      }
    }
  }
  return sub as Sub;
}

const TIER_LABEL: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  featured: 'Featured',
  custom_plus: 'Featured',
  set_your_price: 'Set your own price',
  set_your_own_price: 'Set your own price',
};

async function stampAutopilot(sub: Sub, patch: Record<string, unknown>) {
  const answers = (sub.ownership_answers ?? {}) as Record<string, unknown>;
  const auto = (answers.autopilot ?? {}) as Record<string, unknown>;
  await svc.from('contact_submissions')
    .update({ ownership_answers: { ...answers, autopilot: { ...auto, ...patch } } as never })
    .eq('id', sub.id);
}

/** Step 1 — generate the listing agreement from the accepted quote and email it. */
async function sendListingAgreement(sub: Sub, force: boolean, email = true) {
  if (!sub.email) return { step: 'listing_agreement', status: 'skipped', reason: 'no email' };

  const { data: existing } = await svc.from('contracts')
    .select('id, status, sent_at, signed_at, sign_token')
    .eq('submission_id', sub.id).eq('kind', 'listing_agreement').maybeSingle();

  const existingUrl = existing?.sign_token ? `${PUBLIC_SITE_URL}/sign/${existing.sign_token}` : null;
  if (sub.la_signed_at && !force) {
    return { step: 'listing_agreement', status: 'skipped', reason: 'already signed', sign_url: existingUrl, contract_id: existing?.id ?? null };
  }
  if (!force && existing?.sent_at) {
    // Already prepared and emailed — hand back the same link so the seller can
    // be carried straight to it on the website instead of hunting their inbox.
    return { step: 'listing_agreement', status: 'ready', reason: 'already sent', contract_id: existing.id, sign_url: existingUrl };
  }

  const answers = (sub.ownership_answers ?? {}) as Record<string, any>;
  const prepared = (answers.autopilot ?? {}) as Record<string, any>;

  const plots = Math.max(1, Number(prepared.plotCount ?? sub.plot_count ?? sub.spaces ?? 1) || 1);
  // The quote panel stores the guaranteed net PER SPACE in quote_amount; the
  // agreement prints the authorized minimum TOTAL. Prefer whatever the broker
  // locked in when the quote was prepared.
  const perPlot = Number(prepared.netPerPlot ?? sub.quote_amount ?? 0) || 0;
  const total = Number(prepared.authorizedMinTotal ?? 0) ||
    (perPlot > 0 ? perPlot * plots : Number(sub.accepted_quote_amount ?? sub.list_price ?? 0) || 0);
  if (!total) return { step: 'listing_agreement', status: 'skipped', reason: 'no accepted price on file' };

  const tierKey = String(sub.listing_tier ?? sub.listing_option ?? 'starter').toLowerCase();
  const listingOption = TIER_LABEL[tierKey] ?? (tierKey.includes('own') ? 'Set your own price' : 'Starter');

  const gen = await callFn('generate-contract', {
    submission_id: sub.id,
    kind: 'listing_agreement',
    overrides: {
      plot_count: plots,
      authorized_min_total: total,
      authorized_min_per_plot: perPlot || Math.round(total / plots),
      listing_option: listingOption,
      ...(prepared.deedOwnerNames ? { co_owner_name: prepared.deedOwnerNames } : {}),
      ...(prepared.plotDescription ? { plot_description: prepared.plotDescription } : {}),
      ...(prepared.countyState ? { county_state: prepared.countyState } : {}),
    },
  });

  const signToken = String(gen.sign_token ?? '');
  const contractId = (gen.contract_id as string | null) ?? existing?.id ?? null;
  if (!signToken || !contractId) throw new Error('contract generated without a signing link');

  const signUrl = `${PUBLIC_SITE_URL}/sign/${signToken}`;
  // If the broker prepared the agreement email in the quote wizard, send that
  // exact copy — with every signing link rewritten to this contract's token.
  const preparedHtml = typeof prepared.agreementEmailHtml === 'string' && prepared.agreementEmailHtml.length > 40
    ? String(prepared.agreementEmailHtml).replace(/https?:\/\/[^"'\s<>]*\/sign\/[A-Za-z0-9_-]+/g, signUrl)
    : null;
  if (email) {
    // The seller is normally carried straight to this page on the website; the
    // email is the belt-and-braces copy so the link is always in their inbox.
    await callFn('send-contract-link', {
      contract_id: contractId,
      sign_url: signUrl,
      to: sub.email,
      ...(preparedHtml ? { html_override: preparedHtml } : {}),
      ...(prepared.agreementEmailSubject ? { subject_override: String(prepared.agreementEmailSubject) } : {}),
    });
  }

  await stampAutopilot(sub, { listingAgreementSentAt: new Date().toISOString(), listingOption, authorizedMinTotal: total });
  return { step: 'listing_agreement', status: 'sent', contract_id: contractId, total, listingOption, sign_url: signUrl };
}

/** Step 2 — the moment the agreement is signed, send the family tree. */
async function sendFamilyTree(sub: Sub, force: boolean) {
  if (!sub.email) return { step: 'family_tree', status: 'skipped', reason: 'no email' };
  const answers = (sub.ownership_answers ?? {}) as Record<string, any>;
  if (!force && answers.sellerConfirmedAt) return { step: 'family_tree', status: 'skipped', reason: 'already completed' };
  if (!force && answers.questionsSentAt) return { step: 'family_tree', status: 'skipped', reason: 'already sent' };

  const prepared = (answers.autopilot ?? {}) as Record<string, any>;
  const treeHtml = typeof prepared.familyTreeEmailHtml === 'string' && prepared.familyTreeEmailHtml.length > 40
    ? String(prepared.familyTreeEmailHtml) : null;
  await callFn('ownership-questions', {
    action: 'send',
    submission_id: sub.id,
    to: sub.email,
    ...(treeHtml ? { html_override: treeHtml } : {}),
  });
  const fresh = await loadSubmission(sub.id);
  await stampAutopilot(fresh ?? sub, { familyTreeSentAt: new Date().toISOString() });
  return { step: 'family_tree', status: 'sent', next_url: `${PUBLIC_SITE_URL}/confirm?s=${sub.id}` };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { submission_id, step = 'listing_agreement', force = false, email = true } = await req.json();
    if (!submission_id || typeof submission_id !== 'string') return json({ error: 'submission_id required' }, 400);
    if (!['listing_agreement', 'family_tree'].includes(step)) return json({ error: 'unknown step' }, 400);

    // Internal (service-role) OR a signed-in admin/staff user.
    if (!isInternalCall(req)) {
      const asUser = createClient(SUPABASE_URL, SERVICE_KEY, {
        global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
      });
      const { data: userData } = await asUser.auth.getUser();
      if (!userData.user) return json({ error: 'unauthorized' }, 401);
      const { data: roles } = await svc.from('user_roles')
        .select('role').eq('user_id', userData.user.id).in('role', ['admin', 'staff']);
      if (!roles?.length) return json({ error: 'admin or staff only' }, 403);
    }

    const sub = await loadSubmission(submission_id);
    if (!sub) return json({ error: 'submission not found' }, 404);

    const result = step === 'family_tree'
      ? await sendFamilyTree(sub, force === true)
      : await sendListingAgreement(sub, force === true, email !== false);

    return json({ ok: true, ...result });
  } catch (err) {
    console.error('autopilot error', err);
    return json({ ok: false, error: String((err as Error).message ?? err) }, 500);
  }
});
