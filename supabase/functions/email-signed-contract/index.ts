// Admin-triggered: emails the signed (or notarized) contract PDF as an attachment
// to a chosen recipient (defaults to the seller on the submission).
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_KEY = Deno.env.get('RESEND_API_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const svc = createClient(SUPABASE_URL, SERVICE_KEY);
    const asUser = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: userData } = await asUser.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const { contract_id, to: overrideTo } = await req.json();
    if (!contract_id) {
      return new Response(JSON.stringify({ error: 'missing contract_id' }), { status: 400, headers: corsHeaders });
    }

    const { data: c } = await svc.from('contracts').select('*').eq('id', contract_id).maybeSingle();
    if (!c) throw new Error('contract not found');

    const path = c.notarized_pdf_path ?? c.signed_pdf_path ?? c.filled_pdf_path;
    if (!path) throw new Error('no PDF available for this contract yet');

    const { data: sub } = await svc.from('contact_submissions')
      .select('email, name, cemetery').eq('id', c.submission_id).maybeSingle();
    const to = overrideTo || sub?.email;
    if (!to) throw new Error('no recipient email');

    const { data: file } = await svc.storage.from('contracts').download(path);
    if (!file) throw new Error('signed PDF missing from storage');
    const bytes = new Uint8Array(await file.arrayBuffer());
    // Chunk-safe base64 encode (avoid call-stack overflow on large PDFs)
    let bin = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    const b64 = btoa(bin);

    const docLabel = c.kind === 'poa' ? 'Power of Attorney' : 'Exclusive Right-to-Sell Agreement';
    const filename = `${(sub?.name ?? 'seller').replace(/[^A-Za-z0-9_-]+/g, '_')}-${c.kind}-signed.pdf`;
    const html = `
      <div style="font-family:Georgia,serif;color:#222;max-width:560px">
        <p>Hi ${sub?.name ?? ''},</p>
        <p>Here is a copy of your signed <strong>${docLabel}</strong>${sub?.cemetery ? ` for ${sub.cemetery}` : ''} for your records.</p>
        <p>If you have any questions, just reply to this email.</p>
        <p style="margin-top:24px">— Texas Cemetery Brokers</p>
      </div>`;
    const res = await fetch('https://api.resend.com/emails', {
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
    if (!res.ok) throw new Error(`Resend error: ${res.status} ${await res.text()}`);

    await svc.from('contracts')
      .update({ signed_copy_emailed_at: new Date().toISOString() })
      .eq('id', c.id);

    return new Response(JSON.stringify({ ok: true, to }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('email-signed-contract error', err);
    return new Response(JSON.stringify({ error: String((err as Error).message ?? err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
