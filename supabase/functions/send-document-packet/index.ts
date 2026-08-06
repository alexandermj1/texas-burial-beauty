// Admin-triggered: one single branded email that asks the seller for every
// outstanding document at once, links their curated upload page, and — when a
// Power of Attorney has been prepared — explains the notary route inline so the
// seller never receives two competing emails.
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_KEY = Deno.env.get('RESEND_API_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

const esc = (s: string) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

type Item = {
  code?: string;
  label: string;
  why?: string;
  what?: string;
  how?: string;
  person?: string | null;
  needsNotary?: boolean;
  issuedByUs?: boolean;
  /** When set, the cemetery requires the original — post it to this address. */
  mailTo?: string | null;
};


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

    const body = await req.json();
    const submissionId: string = body?.submission_id;
    const items: Item[] = Array.isArray(body?.items) ? body.items : [];
    const packetUrl: string = body?.packet_url;
    const poaUrl: string | null = body?.poa_url ?? null;
    const poaFor: string | null = body?.poa_for ?? null;
    const previewOnly: boolean = body?.preview === true;
    if (!submissionId || !packetUrl) {
      return new Response(JSON.stringify({ error: 'missing submission_id or packet_url' }), { status: 400, headers: corsHeaders });
    }

    const { data: sub } = await svc.from('contact_submissions')
      .select('email, name, cemetery').eq('id', submissionId).maybeSingle();
    const to = body?.to || sub?.email;
    if (!to) throw new Error('no recipient email');

    const firstName = (sub?.name ?? '').trim().split(/\s+/)[0] || 'there';
    const cemLine = sub?.cemetery ? ` at ${esc(sub.cemetery)}` : '';

    const itemHtml = items.map((it) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #eee7dc;">
          <div style="font-size:15px;color:#1f2a37;font-family:Georgia,serif;">
            ${esc(it.label)}
            ${it.needsNotary ? '<span style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#6d28d9;margin-left:8px;">Notary</span>' : ''}
            ${it.issuedByUs ? '<span style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#1d4ed8;margin-left:8px;">We send this to you</span>' : ''}
            ${it.mailTo ? '<span style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#b91c1c;margin-left:8px;">Original by post</span>' : ''}
          </div>
          ${it.what ? `<div style="font-size:13px;color:#4a5568;line-height:1.6;margin-top:4px;">${esc(it.what)}</div>` : ''}
          ${it.how ? `<div style="font-size:13px;color:#6b7280;line-height:1.6;margin-top:4px;"><em>How to get it:</em> ${esc(it.how)}</div>` : ''}
          ${it.mailTo ? `<div style="margin-top:8px;padding:10px 12px;background:#fdf2f2;border-radius:8px;font-size:13px;color:#7f1d1d;line-height:1.6;">
            The cemetery requires an <strong>original copy</strong> of this document — a photograph or scan will not be accepted.
            Please post the original to us; we store all originals safely on your file and return them to you if the sale does not complete.
            <div style="margin-top:6px;color:#1f2a37;white-space:pre-line;">${esc(it.mailTo)}</div>
          </div>` : ''}
        </td>
      </tr>`).join('');


    const poaHtml = poaUrl ? `
      <div style="margin:28px 0 0;padding:20px 22px;background:#f7f3ec;border-radius:10px;">
        <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#8a6d3b;">Also enclosed</div>
        <div style="font-size:17px;font-family:Georgia,serif;color:#1f2a37;margin:6px 0 10px;">
          Your Limited Power of Attorney${poaFor ? ` — ${esc(poaFor)}` : ''}
        </div>
        <p style="margin:0 0 12px;font-size:13px;color:#4a5568;line-height:1.7;">
          This lets us handle the cemetery's transfer paperwork on your behalf, so you don't have to
          post forms back and forth. Because it is a sworn document it must be notarized.
        </p>
        <ol style="padding-left:18px;margin:0 0 14px;font-size:13px;color:#4a5568;line-height:1.8;">
          <li>Open the link below and confirm your mailing address — the document fills in as you type.</li>
          <li>Sign it online with a remote notary (about 15 minutes, from your phone), or print it and take it to any bank, UPS Store or courthouse notary.</li>
          <li>Upload the notarized copy on the same page and you're finished.</li>
        </ol>
        <a href="${esc(poaUrl)}" style="display:inline-block;padding:11px 22px;background:#1f2a37;color:#ffffff;text-decoration:none;border-radius:8px;font-family:Georgia,serif;font-size:14px;">
          Prepare &amp; notarize your Power of Attorney →
        </a>
      </div>` : '';

    const subject = `The documents we need to complete your sale${sub?.cemetery ? ` — ${sub.cemetery}` : ''}`;

    const html = `
<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f1ea;font-family:Georgia,'Times New Roman',serif;color:#1f2a37;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1ea;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(31,42,55,0.08);">
        <tr><td style="background:#1f2a37;color:#ffffff;padding:32px 40px;text-align:center;">
          <div style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#d9c7a3;">Texas Cemetery Brokers</div>
          <div style="font-size:22px;margin-top:10px;">Everything we need, on one page</div>
        </td></tr>
        <tr><td style="padding:32px 40px;font-size:15px;line-height:1.7;">
          <p style="margin:0 0 16px;">Dear ${esc(firstName)},</p>
          <p style="margin:0 0 16px;">
            Thank you again for listing your property${cemLine} with us. To transfer it cleanly we need a
            short list of documents — everything is gathered on one secure page made just for you.
          </p>
          <p style="margin:0 0 22px;">
            You can upload straight from your computer, or tap <strong>Phone</strong> on any item, scan the
            QR code with your camera and simply photograph the document. The page updates itself as each
            item arrives, so you always know what is left.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 26px;">
            <tr><td align="center" style="background:#1f2a37;border-radius:8px;">
              <a href="${esc(packetUrl)}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:16px;">
                Open your document page →
              </a>
            </td></tr>
          </table>
          ${items.length ? `
          <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#8a6d3b;margin-bottom:8px;">What we still need</div>
          <p style="margin:0 0 14px;font-size:13px;color:#4a5568;line-height:1.7;">
            Our team has worked directly with the cemetery${sub?.cemetery ? ` (${esc(sub.cemetery)})` : ''} to confirm this list.
            It is the <strong>complete set of documents</strong> required to sell your property — these would be needed
            regardless of how you sold it, privately or through a broker. The only item unique to selling through us is
            the Limited Power of Attorney, which lets us handle the cemetery paperwork on your behalf.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemHtml}</table>` : `
          <p style="margin:0;font-size:14px;color:#4a5568;">Nothing is outstanding right now — we'll email you the moment something is needed.</p>`}
          ${poaHtml}
          <p style="margin:26px 0 0;font-size:13px;color:#4a5568;">
            Or copy this link into your browser:<br/>
            <span style="color:#1f2a37;word-break:break-all;">${esc(packetUrl)}</span>
          </p>
          <div style="margin:24px 0 0;padding:18px 20px;background:#f7f3ec;border-radius:10px;">
            <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#8a6d3b;">Questions about any document?</div>
            <p style="margin:8px 0 0;font-size:13px;color:#4a5568;line-height:1.7;">
              Call us on <a href="tel:+12142304740" style="color:#1f2a37;text-decoration:none;"><strong>(214) 230-4740</strong></a>,
              email <a href="mailto:info@texascemeterybrokers.com" style="color:#1f2a37;">info@texascemeterybrokers.com</a>,
              or simply reply to this message — a broker will walk you through it personally.
            </p>
          </div>
        </td></tr>
        <tr><td style="background:#1f2a37;padding:22px 40px;text-align:center;">
          <div style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#d9c7a3;">Texas Cemetery Brokers</div>
          <div style="font-size:12px;color:#a9b4c2;margin-top:8px;">
            The Modern Way to Sell Cemetery Property in Texas
          </div>
          <div style="font-size:12px;color:#a9b4c2;margin-top:8px;">
            (214) 230-4740 · info@texascemeterybrokers.com · texascemeterybrokers.com
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;

    // Preview mode: hand the exact email back so the admin can read it before
    // anything is sent. Nothing is emailed and nothing is written.
    if (previewOnly) {
      return new Response(JSON.stringify({ ok: true, preview: true, to, subject, html }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch('https://connector-gateway.lovable.dev/resend/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_KEY,
      },
      body: JSON.stringify({
        from: 'Texas Cemetery Brokers <contracts@texascemeterybrokers.com>',
        to: [to],
        bcc: ['contracts@texascemeterybrokers.com'],
        subject,
        html,
      }),
    });
    if (!res.ok) throw new Error(`Resend error: ${res.status} ${await res.text()}`);

    const now = new Date().toISOString();
    await svc.from('contact_submissions')
      .update({ documents_requested_at: now }).eq('id', submissionId);

    try {
      await svc.from('email_messages').insert({
        gmail_message_id: `packet-${submissionId}-${Date.now()}`,
        gmail_thread_id: null,
        from_email: 'contracts@texascemeterybrokers.com',
        from_name: 'Texas Cemetery Brokers',
        to_email: to,
        subject,
        snippet: `Document packet requested — ${items.length} item${items.length === 1 ? '' : 's'}${poaUrl ? ' + Power of Attorney' : ''}.`,
        body_text: `Document page: ${packetUrl}\n\n${items.map((i) => `• ${i.label}`).join('\n')}${poaUrl ? `\n\nPOA: ${poaUrl}` : ''}`,
        received_at: now,
        matched_submission_id: submissionId,
        is_read: true,
      } as Record<string, unknown>);
    } catch (e) {
      console.warn('could not log packet email', e);
    }

    return new Response(JSON.stringify({ ok: true, to, items: items.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-document-packet error', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
