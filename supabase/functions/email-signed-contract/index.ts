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
    // Send through the info@ Gmail mailbox so it lands in the seller's inbox
    // and stays in their existing conversation; Resend is only a fallback.
    const subject = `Your signed ${docLabel} — copy for your records`;
    const { data: recent } = await svc.from('email_messages')
      .select('gmail_thread_id, gmail_message_id, received_at')
      .eq('matched_submission_id', c.submission_id)
      .not('gmail_thread_id', 'is', null)
      .order('received_at', { ascending: false })
      .limit(20);
    const realThread = ((recent ?? []) as { gmail_thread_id: string | null; gmail_message_id: string | null }[])
      .find((m) => m.gmail_thread_id && !/^(packet-|ownership-|local-|contract-)/.test(m.gmail_thread_id));

    const gmailRes = await fetch(`${SUPABASE_URL}/functions/v1/gmail-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: req.headers.get('Authorization') ?? '',
        apikey: (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '') || (Deno.env.get('SUPABASE_ANON_KEY') ?? ''),
      },
      body: JSON.stringify({
        action: 'send',
        to,
        bcc: 'info@texascemeterybrokers.com',
        subject,
        body: `Here is a copy of your signed ${docLabel}.`,
        htmlBody: html,
        submissionId: c.submission_id ?? undefined,
        attachments: [{ filename, mimeType: 'application/pdf', contentBase64: b64 }],
        ...(realThread?.gmail_thread_id ? { threadId: realThread.gmail_thread_id } : {}),
        ...(realThread?.gmail_message_id ? { inReplyToGmailId: realThread.gmail_message_id } : {}),
      }),
    });
    const gmailText = await gmailRes.text();
    let gmailJson: Record<string, unknown> = {};
    try { gmailJson = JSON.parse(gmailText); } catch { /* non-JSON */ }

    if (!gmailRes.ok || gmailJson.error) {
      console.warn('gmail send failed, falling back to Resend', gmailRes.status, gmailText);
      const res = await fetch('https://connector-gateway.lovable.dev/resend/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
          'X-Connection-Api-Key': RESEND_KEY,
        },
        body: JSON.stringify({
          from: 'Texas Cemetery Brokers <info@texascemeterybrokers.com>',
          reply_to: 'info@texascemeterybrokers.com',
          to: [to],
          bcc: ['info@texascemeterybrokers.com'],
          subject,
          html,
          attachments: [{ filename, content: b64 }],
        }),
      });
      if (!res.ok) throw new Error(`Could not send the signed copy (Gmail: ${gmailText}; Resend: ${res.status} ${await res.text()})`);
    }


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
