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
    // Every prepared Power of Attorney travels inside this same request — one
    // email for the seller, never a separate POA message. The POA is completed
    // from their questionnaire answers, so the PDF itself is attached: they
    // print it, sign before a notary and send it back. No fields to fill in.
    const poasIn: { name?: string | null; url?: string | null; path?: string | null }[] =
      Array.isArray(body?.poas) ? body.poas : [];
    const poaUrl: string | null = body?.poa_url ?? null;
    const poaFor: string | null = body?.poa_for ?? null;
    const poas = poasIn.length ? poasIn : (poaUrl ? [{ name: poaFor, url: poaUrl }] : []);
    // Any other paper we prepared for them (affidavit of heirship, custom
    // contracts) is attached as a finished PDF alongside the POAs.
    const extraDocs: { label?: string | null; path?: string | null }[] =
      Array.isArray(body?.docs) ? body.docs : [];


    const previewOnly: boolean = body?.preview === true;
    if (!submissionId || !packetUrl) {
      return new Response(JSON.stringify({ error: 'missing submission_id or packet_url' }), { status: 400, headers: corsHeaders });
    }

    const { data: sub } = await svc.from('contact_submissions')
      .select('email, name, cemetery').eq('id', submissionId).maybeSingle();
    const to = body?.to || sub?.email;
    if (!to) throw new Error('no recipient email');

    // The broker can override the greeting (the auto-picked name is sometimes
    // wrong) and add a personal message of their own above the checklist.
    const greetingOverride = String(body?.greeting_name ?? '').trim();
    const brokerNote = String(body?.note ?? '').trim();
    const firstName = greetingOverride || (sub?.name ?? '').trim().split(/\s+/)[0] || 'there';
    const cemLine = sub?.cemetery ? ` at ${esc(sub.cemetery)}` : '';

    // The email stays deliberately short: one button, nothing else. The list of
    // documents, how to get each one, notary steps and the mailing address all
    // live on the seller's document page — never in the email itself.
    const subject = `The documents we need to complete your sale${sub?.cemetery ? ` — ${sub.cemetery}` : ''}`;
    const attachCount = poas.filter((p) => p.path).length + extraDocs.filter((d) => d.path).length;



    const html = `
<!doctype html>
<html><body data-tcb-email="document_request" style="margin:0;padding:0;background:#f5f1ea;font-family:Georgia,'Times New Roman',serif;color:#1f2a37;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1ea;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(31,42,55,0.08);">
        <tr><td style="background:#1f2a37;color:#ffffff;padding:32px 40px;text-align:center;">
          <div style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#d9c7a3;">Texas Cemetery Brokers</div>
          <div style="font-size:22px;margin-top:10px;">Your document page is ready</div>
        </td></tr>
        <tr><td style="padding:32px 40px;font-size:15px;line-height:1.7;">
          <p style="margin:0 0 16px;">Dear ${esc(firstName)},</p>
          ${brokerNote ? `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
            <tr><td style="border-left:3px solid #d9c7a3;background:#faf7f1;padding:14px 18px;font-size:15px;line-height:1.7;color:#1f2a37;">
              ${esc(brokerNote).replace(/\n/g, '<br/>')}
            </td></tr>
          </table>` : ''}
          <p style="margin:0 0 22px;">
            To complete the sale of your property${cemLine} we need a few documents. We've put them all on one
            secure page for you, with simple instructions for each one.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 22px;">
            <tr><td align="center" style="background:#1f2a37;border-radius:8px;">
              <a href="${esc(packetUrl)}" style="display:inline-block;padding:16px 36px;color:#ffffff;text-decoration:none;font-size:17px;">
                Open your document page →
              </a>
            </td></tr>
          </table>
          <p style="margin:0 0 22px;text-align:center;font-size:13px;color:#6b7280;">
            Everything you need to know is on that page — just click the button above.
          </p>
          ${attachCount ? `
          <p style="margin:0 0 22px;font-size:14px;color:#4a5568;line-height:1.7;">
            We've also attached ${attachCount === 1 ? 'a document' : `${attachCount} documents`} to this email that we've
            already prepared and filled in for you — please print, sign where indicated (before a notary where the page says so)
            and send back to us.
          </p>` : ''}

          <p style="margin:26px 0 0;font-size:13px;color:#4a5568;">
            If the button doesn't work, copy this link into your browser:<br/>
            <span style="color:#1f2a37;word-break:break-all;">${esc(packetUrl)}</span>
          </p>
          <p style="margin:20px 0 0;font-size:13px;color:#4a5568;line-height:1.7;">
            Any questions, call <a href="tel:+12142304740" style="color:#1f2a37;text-decoration:none;"><strong>(214) 230-4740</strong></a>
            or just reply to this email.
          </p>
        </td></tr>
        <tr><td style="background:#1f2a37;padding:22px 40px;text-align:center;">
          <div style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#d9c7a3;">Texas Cemetery Brokers</div>
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

    // Each POA the checklist asks for rides along as a real PDF attachment.
    // The panel is the single source of truth: if it sent a `poas` array we use
    // exactly that, so a document removed from the request can never sneak back
    // into the email. Only legacy callers that send no array at all fall back to
    // the live POAs on the submission.
    const clientSuppliedPoas = Array.isArray(body?.poas) || !!poaUrl;
    let poaSources = poas.filter((p) => p.path);
    if (!poaSources.length && !clientSuppliedPoas) {
      const { data: liveContracts } = await svc.from('contracts')
        .select('signature_name, fill_data, filled_pdf_path, principal_key, status')
        .eq('submission_id', submissionId).eq('kind', 'poa').neq('status', 'void');
      poaSources = ((liveContracts ?? []) as {
        signature_name?: string | null; fill_data?: Record<string, unknown> | null;
        filled_pdf_path?: string | null; principal_key?: string | null;
      }[])
        .filter((c) => c.filled_pdf_path)
        .map((c) => ({
          name: c.signature_name ?? (c.fill_data?.seller_name as string | undefined) ?? c.principal_key ?? null,
          url: null,
          path: c.filled_pdf_path ?? null,
        }));
    }


    const attachments: { filename: string; mimeType: string; contentBase64: string }[] = [];
    const seenPaths = new Set<string>();
    for (const p of poaSources) {
      if (!p.path || seenPaths.has(p.path)) continue;
      seenPaths.add(p.path);
      const { data: file } = await svc.storage.from('contracts').download(p.path);
      if (!file) continue;
      const bytes = new Uint8Array(await file.arrayBuffer());
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) {
        bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      const safeName = String(p.name ?? 'Signer').replace(/[^A-Za-z0-9 ._-]/g, '').trim() || 'Signer';
      attachments.push({
        filename: `Power of Attorney - ${safeName}.pdf`,
        mimeType: 'application/pdf',
        contentBase64: btoa(bin),
      });
    }

    // Every other prepared document (affidavit of heirship, custom paperwork).
    for (const d of extraDocs) {
      if (!d.path || seenPaths.has(d.path)) continue;
      seenPaths.add(d.path);
      const { data: file } = await svc.storage.from('contracts').download(d.path);
      if (!file) continue;
      const bytes = new Uint8Array(await file.arrayBuffer());
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) {
        bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      const safeLabel = String(d.label ?? 'Document').replace(/[^A-Za-z0-9 ._-]/g, '').trim().slice(0, 80) || 'Document';
      attachments.push({
        filename: `${safeLabel}.pdf`,
        mimeType: 'application/pdf',
        contentBase64: btoa(bin),
      });
    }


    // Keep the request inside the customer's existing Gmail conversation so the
    // whole chain stays in one place on the submission.
    const { data: lastMsg } = await svc.from('email_messages')
      .select('gmail_thread_id, gmail_message_id, received_at')
      .eq('matched_submission_id', submissionId)
      .not('gmail_thread_id', 'is', null)
      .order('received_at', { ascending: false })
      .limit(20);
    const realThread = ((lastMsg ?? []) as { gmail_thread_id: string | null; gmail_message_id: string | null }[])
      .find((m) => m.gmail_thread_id && !m.gmail_thread_id.startsWith('packet-') && !m.gmail_thread_id.startsWith('ownership-') && !m.gmail_thread_id.startsWith('local-'));

    // Send through the info@ Gmail mailbox (same path as the quote email) so the
    // message lands in Gmail's Sent folder and can be verified there.
    const plain = `Your document page: ${packetUrl}\n\nEverything we need is listed on that page.${attachments.length ? `\n\nWe've attached ${attachments.length} document${attachments.length === 1 ? '' : 's'} we've already filled in for you — please print, sign (before a notary where indicated) and send back.` : ''}`;
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
        subject,
        body: plain,
        htmlBody: html,
        submissionId,
        ...(realThread?.gmail_thread_id ? { threadId: realThread.gmail_thread_id } : {}),
        ...(realThread?.gmail_message_id ? { inReplyToGmailId: realThread.gmail_message_id } : {}),
        ...(attachments.length ? { attachments } : {}),
      }),
    });


    const gmailText = await gmailRes.text();
    let gmailJson: Record<string, unknown> = {};
    try { gmailJson = JSON.parse(gmailText); } catch { /* non-JSON */ }
    if (!gmailRes.ok || gmailJson.error) {
      throw new Error(`Gmail send failed: ${gmailJson.error ? JSON.stringify(gmailJson.error) : `${gmailRes.status} ${gmailText}`}`);
    }

    const now = new Date().toISOString();
    await svc.from('contact_submissions')
      .update({ documents_requested_at: now }).eq('id', submissionId);

    // gmail-action already logged a bare row for the sent message; enrich it so
    // the packet shows up on this submission's thread with the full HTML body.
    const sentId = typeof gmailJson.id === 'string' ? gmailJson.id : null;
    const logRow = {
      gmail_message_id: sentId || `packet-${submissionId}-${Date.now()}`,
      gmail_thread_id: (typeof gmailJson.threadId === 'string' ? gmailJson.threadId : null) || `packet-${submissionId}`,
      from_email: (typeof gmailJson.from === 'string' ? gmailJson.from : 'info@texascemeterybrokers.com'),
      from_name: 'Texas Cemetery Brokers',
      to_email: to,
      subject,
      snippet: `Document request sent — ${items.length} item${items.length === 1 ? '' : 's'}${attachments.length ? ` + ${attachments.length} Power of Attorney attached` : ''}.`,
      body_text: plain,
      body_html: html,
      received_at: now,
      matched_submission_id: submissionId,
      is_read: true,
    };
    const { error: logErr } = await svc
      .from('email_messages')
      .upsert(logRow as Record<string, unknown>, { onConflict: 'gmail_message_id' });
    if (logErr) console.error('could not log packet email', logErr);



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
