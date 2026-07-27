// Admin-triggered: sends a beautifully styled email to the seller with their unique
// signing link. Marks the contract as "sent" (sent_at timestamp) so the panel status
// reflects it. Also updates any prior sent_at when re-sending.
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_KEY = Deno.env.get('RESEND_API_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

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

    const { contract_id, sign_url, to: overrideTo } = await req.json();
    if (!contract_id || !sign_url) {
      return new Response(JSON.stringify({ error: 'missing contract_id or sign_url' }), { status: 400, headers: corsHeaders });
    }

    const { data: c } = await svc.from('contracts').select('*').eq('id', contract_id).maybeSingle();
    if (!c) throw new Error('contract not found');
    if (!c.sign_token) throw new Error('contract has no signing token yet');

    const { data: sub } = await svc.from('contact_submissions')
      .select('email, name, cemetery').eq('id', c.submission_id).maybeSingle();
    const to = overrideTo || sub?.email;
    if (!to) throw new Error('no recipient email');

    const firstName = (sub?.name ?? '').trim().split(/\s+/)[0] || 'there';
    const cemLine = sub?.cemetery ? ` for ${escapeHtml(sub.cemetery)}` : '';
    const isPoa = c.kind === 'poa';

    const headline = isPoa
      ? 'Your Power of Attorney is ready to prepare'
      : 'Your listing agreement is ready to sign';
    const ctaLabel = isPoa
      ? 'Confirm your address &amp; get your notary packet →'
      : 'Review &amp; sign your agreement →';
    const introHtml = isPoa
      ? `<p style="margin:0 0 16px;">
            Your <strong>Limited Special Power of Attorney</strong>${cemLine} has been prepared by
            Texas Cemetery Brokers. This document allows us to complete the plot transfer paperwork on
            your behalf once your property is sold.
          </p>
          <p style="margin:0 0 24px;">
            Because the Power of Attorney authorises us to sign transfer paperwork for you, it must be
            <strong>notarized</strong>. Please click below to confirm your mailing address — we'll then
            email you the finished PDF along with a link to have it notarized online in about 15 minutes
            (or you can bring it to any local notary in person).
          </p>`
      : `<p style="margin:0 0 16px;">
            Thank you for choosing Texas Cemetery Brokers to represent the sale of your cemetery property${cemLine}.
            Your <strong>Exclusive Right-to-Sell Agreement</strong> is now prepared and ready for your review.
          </p>
          <p style="margin:0 0 24px;">
            You can review the full contract, add a couple of remaining details, and sign it electronically —
            it takes about two minutes. Your signature is legally binding under the U.S. E-Sign Act and Texas UETA.
          </p>`;
    const stepsHtml = isPoa
      ? `<ol style="padding-left:20px;margin:0 0 16px;font-size:13px;color:#4a5568;line-height:1.7;">
              <li>Click the button above and confirm your mailing address on the secure page.</li>
              <li>We'll email you the finished Power of Attorney PDF, plus a one-click link to notarize it online.</li>
              <li>Or print the PDF and bring it to any local notary — a bank, UPS Store, or courthouse all work.</li>
              <li>Once notarized, forward the signed PDF back to us and we'll file it with the cemetery.</li>
            </ol>`
      : `<ol style="padding-left:20px;margin:0 0 16px;font-size:13px;color:#4a5568;line-height:1.7;">
              <li>Review the document and complete the details on the signing page.</li>
              <li>Sign electronically — you'll get an emailed PDF copy immediately.</li>
              <li>Your broker countersigns and returns the fully executed contract.</li>
            </ol>`;

    const html = `
<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f5f1ea;font-family:Georgia,'Times New Roman',serif;color:#1f2a37;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1ea;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(31,42,55,0.08);">
        <tr>
          <td style="background:#1f2a37;color:#ffffff;padding:32px 40px;text-align:center;">
            <div style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#d9c7a3;">Texas Cemetery Brokers</div>
            <div style="font-size:22px;margin-top:10px;font-family:Georgia,serif;">${headline}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;font-size:15px;line-height:1.6;">
            <p style="margin:0 0 16px;">Dear ${escapeHtml(firstName)},</p>
            ${introHtml}
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
              <tr><td align="center" style="background:#1f2a37;border-radius:8px;">
                <a href="${escapeHtml(sign_url)}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-family:Georgia,serif;font-size:16px;">
                  ${ctaLabel}
                </a>
              </td></tr>
            </table>
            <p style="margin:24px 0 8px;font-size:13px;color:#4a5568;">
              Or copy this link into your browser:<br/>
              <span style="color:#1f2a37;word-break:break-all;">${escapeHtml(sign_url)}</span>
            </p>
            <hr style="border:none;border-top:1px solid #e5e0d5;margin:32px 0;" />
            <p style="margin:0 0 12px;font-size:13px;color:#4a5568;">
              <strong style="color:#1f2a37;">What happens next:</strong>
            </p>
            ${stepsHtml}
            <p style="margin:24px 0 0;font-size:13px;color:#4a5568;">
              If you have any questions, simply reply to this email — we're here to help.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f5f1ea;padding:20px 40px;text-align:center;font-size:11px;color:#6b7280;letter-spacing:1px;text-transform:uppercase;">
            Texas Cemetery Brokers · texascemeterybrokers.com
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    const subject = isPoa
      ? `Your Power of Attorney${sub?.cemetery ? ` for ${sub.cemetery}` : ''} — confirm address to receive notary packet`
      : `Your Listing Agreement${sub?.cemetery ? ` for ${sub.cemetery}` : ''} — ready to sign`;

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

    await svc.from('contracts')
      .update({ sent_at: new Date().toISOString(), status: 'sent' })
      .eq('id', c.id);

    // Only now — after the signing link has actually been emailed — do we mark
    // the submission's Listing Agreement as issued. Merely generating a draft
    // must not flip this flag.
    if (c.kind === 'listing_agreement' && c.submission_id) {
      await svc.from('contact_submissions')
        .update({ la_issued_at: new Date().toISOString() })
        .eq('id', c.submission_id);
    }

    return new Response(JSON.stringify({ ok: true, to }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-contract-link error', err);
    return new Response(JSON.stringify({ error: String((err as Error).message ?? err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
