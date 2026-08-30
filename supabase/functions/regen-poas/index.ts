// TEMPORARY maintenance function.
// Regenerates every unsigned POA so it picks up the new Scope of Authority
// wording (the right to sell on the terms of the Listing Agreement).
// Signed / notarized / completed documents are never touched.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = new URL(req.url)
  const dryRun = url.searchParams.get('dry') === '1'
  const svc = createClient(SUPABASE_URL, SERVICE_KEY)

  const { data: rows, error } = await svc
    .from('contracts')
    .select('id, submission_id, kind, status, fill_data, principal_key')
    .eq('kind', 'poa')
    .is('deleted_at', null)
    .in('status', ['draft', 'sent', 'viewed'])

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const results: Record<string, unknown>[] = []
  for (const c of rows ?? []) {
    const fd = (c.fill_data ?? {}) as Record<string, unknown>
    const joint = Array.isArray(fd.joint_names) ? (fd.joint_names as string[]).filter(Boolean) : []
    const overrides: Record<string, unknown> = {
      seller_name: joint[0] ?? fd.seller_name,
      co_owner_name: fd.co_owner_name,
      address: fd.address,
      city_state_zip: fd.city_state_zip,
      phone: fd.phone,
      email: fd.email,
      cemetery: fd.cemetery,
      county_state: fd.county_state,
      plot_count: fd.plot_count,
      plot_description: fd.plot_description,
      listing_option: fd.listing_option,
      authorized_min_total: fd.authorized_min_total,
      authorized_min_per_plot: fd.authorized_min_per_plot,
    }
    if (joint.length > 1) overrides.joint_names = joint

    if (dryRun) {
      results.push({ id: c.id, submission_id: c.submission_id, signer: overrides.seller_name, joint: joint.length > 1, dry: true })
      continue
    }

    const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-contract`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission_id: c.submission_id, kind: 'poa', overrides }),
    })
    const body = await res.text()
    results.push({
      id: c.id,
      submission_id: c.submission_id,
      signer: overrides.seller_name,
      ok: res.ok,
      detail: res.ok ? undefined : body.slice(0, 300),
    })
  }

  return new Response(JSON.stringify({ total: results.length, results }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
