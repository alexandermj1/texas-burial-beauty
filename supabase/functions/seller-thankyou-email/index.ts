// Branded thank-you email sent to the customer right after they submit the
// seller form. Sent from the info@ mailbox so replies (including a deed sent
// by reply) land in the synced inbox and attach to their submission.
//
// The thank-you itself carries the X-TCB-Auto: thankyou header, which
// sync-inbox uses to keep it OUT of the submission's email thread — only the
// customer's reply should appear there.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GMAIL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const FROM_NAME = "Texas Cemetery Brokers";
const FROM_EMAIL = "info@texascemeterybrokers.com";
// Preview copies may only be sent to the owners of the business.
const OWNER_EMAILS = new Set([
  "alexandermaclarenjames@gmail.com",
  "simonjamesphd@gmail.com",
  "emmamaclaren@gmail.com",
]);

const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const b64url = (value: string) => {
  let binary = "";
  new TextEncoder().encode(value).forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const firstNameOf = (name: string | null | undefined) => {
  const first = String(name ?? "").trim().split(/\s+/)[0];
  return first || "there";
};

function buildHtml(firstName: string, cemetery: string | null, needsDeed: boolean) {
  const preheader = needsDeed
    ? "Thank you - we have your details. One document will help us finish your valuation."
    : "Thank you - we have your details and your document, and we are on it.";

  const deedBlock = needsDeed
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px;border:1px solid #ead9c9;border-radius:10px;background:#faf6f0;">
      <tr><td style="padding:22px 24px;">
        <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:.22em;color:#7c3a2e;text-transform:uppercase;margin:0 0 10px;">One thing we still need</div>
        <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#2d2a26;">A copy of the <strong>deed or proof of purchase</strong> for the property. It is the one document we need at this stage, and it is what allows us to confirm ownership and put an accurate figure in front of you.</p>
        <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#2d2a26;">The easiest way is simply to <strong>reply to this email</strong> and attach a photo or scan. A clear phone photo is perfectly fine.</p>
        <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;line-height:1.7;color:#65594f;">If you cannot find the deed, your cemetery office can provide a copy or an equivalent document - just ask them for proof of ownership of the interment rights.</p>
      </td></tr>
    </table>`
    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px;border:1px solid #ead9c9;border-radius:10px;background:#faf6f0;">
      <tr><td style="padding:22px 24px;">
        <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:.22em;color:#7c3a2e;text-transform:uppercase;margin:0 0 10px;">Your document</div>
        <p style="margin:0;font-size:15px;line-height:1.7;color:#2d2a26;">Thank you for sending your deed or proof of purchase - we have it safely on file. If anything further is needed, we will let you know.</p>
      </td></tr>
    </table>`;

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Texas Cemetery Brokers</title></head>
<body data-tcb-email="thank_you" style="margin:0;padding:0;background:#f7f3ee;font-family:Georgia,'Times New Roman',serif;color:#1f2937;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ee;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #ead9c9;border-radius:14px;overflow:hidden;">
  <tr><td style="padding:28px 32px;border-bottom:1px solid #f1e6da;text-align:center;">
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:.18em;color:#7c3a2e;font-weight:600;">TEXAS CEMETERY BROKERS</div>
    <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:.28em;color:#a08a76;margin-top:6px;text-transform:uppercase;">Serving all of Texas</div>
  </td></tr>
  <tr><td style="padding:34px 40px 8px;text-align:center;">
    <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:.22em;color:#7c3a2e;text-transform:uppercase;margin:0 0 12px;">Thank you</div>
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:27px;line-height:1.3;color:#2d2a26;">We have your details${cemetery ? `<br><span style="font-size:17px;color:#8a7766;font-style:italic;">${esc(cemetery)}</span>` : ""}</div>
    <div style="width:54px;height:2px;background:#e0c9b4;margin:20px auto 0;"></div>
  </td></tr>
  <tr><td style="padding:22px 40px 34px;font-size:15px;line-height:1.75;color:#2d2a26;">
    <p style="margin:0 0 16px;">Dear ${esc(firstName)},</p>
    <p style="margin:0 0 16px;">Thank you for trusting us with your cemetery property. Your enquiry has come through safely and a member of our team is reviewing it personally - not a call centre, and never any pressure.</p>
    <p style="margin:0 0 22px;">We will research recent sales at your cemetery and come back to you with an honest view of what your property is worth and how we would go about selling it.</p>
    ${deedBlock}
    <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:13px;line-height:1.7;color:#65594f;">If you have any questions in the meantime, simply reply to this email or call <a href="tel:+12142304740" style="color:#7c3a2e;text-decoration:none;"><strong>(214) 230-4740</strong></a>. We are always happy to talk it through.</p>
    <p style="margin:0;font-size:14px;line-height:1.7;color:#2d2a26;">Warm regards,<br><strong>Alexander James</strong><br><span style="font-family:Arial,sans-serif;font-size:12px;color:#8a7766;">Cemetery Salesperson<br>Texas Cemetery Brokers</span></p>
  </td></tr>
  <tr><td style="padding:20px 32px;border-top:1px solid #f1e6da;text-align:center;font-family:Arial,sans-serif;font-size:12px;color:#8a7766;">
    <a href="https://www.texascemeterybrokers.com" style="color:#7c3a2e;text-decoration:none;">www.texascemeterybrokers.com</a><span style="color:#c8b8aa;"> &nbsp;&middot;&nbsp; </span><a href="tel:+12142304740" style="color:#7c3a2e;text-decoration:none;">(214) 230-4740</a>
  </td></tr>
</table></td></tr></table></body></html>`;
}

const buildPlain = (firstName: string, cemetery: string | null, needsDeed: boolean) => [
  `Dear ${firstName},`, "",
  `Thank you for trusting us with your cemetery property${cemetery ? ` at ${cemetery}` : ""}. Your enquiry has come through safely and a member of our team is reviewing it personally - not a call centre, and never any pressure.`, "",
  "We will research recent sales at your cemetery and come back to you with an honest view of what your property is worth and how we would go about selling it.", "",
  needsDeed
    ? "One thing we still need: a copy of the deed or proof of purchase for the property. The easiest way is simply to reply to this email and attach a photo or scan - a clear phone photo is fine. If you cannot find it, your cemetery office can provide a copy or an equivalent document."
    : "Thank you for sending your deed or proof of purchase - we have it safely on file.", "",
  "If you have any questions in the meantime, reply to this email or call (214) 230-4740.", "",
  "Warm regards,", "Alexander James", "Cemetery Salesperson", "Texas Cemetery Brokers",
].join("\n");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const gmailKey = Deno.env.get("GOOGLE_MAIL_API_KEY_1") ?? Deno.env.get("GOOGLE_MAIL_API_KEY");
    if (!lovableKey || !gmailKey) return respond({ error: "Email is not configured" }, 500);

    const input = await req.json().catch(() => ({}));
    const previewTo = typeof input?.preview_to === "string" ? input.preview_to.trim().toLowerCase() : null;
    const submissionId = typeof input?.submission_id === "string" ? input.submission_id : null;

    let toEmail: string | null = null;
    let name: string | null = null;
    let cemetery: string | null = null;
    let needsDeed = true;

    if (previewTo) {
      if (!OWNER_EMAILS.has(previewTo)) return respond({ error: "Preview recipient not allowed" }, 403);
      toEmail = previewTo;
      name = typeof input?.name === "string" ? input.name : "Alexander";
      cemetery = typeof input?.cemetery === "string" ? input.cemetery : "Restland Memorial Park";
      needsDeed = input?.needs_deed !== false;
    } else {
      if (!submissionId) return respond({ error: "submission_id required" }, 400);
      const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data, error } = await db.from("contact_submissions")
        .select("id,name,email,cemetery,seller_attachments").eq("id", submissionId).maybeSingle();
      if (error) return respond({ error: error.message }, 500);
      if (!data) return respond({ error: "Submission not found" }, 404);
      toEmail = String(data.email ?? "").trim();
      name = data.name;
      cemetery = data.cemetery;
      const attachments = Array.isArray(data.seller_attachments) ? data.seller_attachments : [];
      needsDeed = attachments.length === 0;
    }

    if (!toEmail || !toEmail.includes("@")) return respond({ ok: false, skipped: "no-email" });

    const firstName = firstNameOf(name);
    const subject = needsDeed
      ? "Thank you - we have your details (one document still needed)"
      : "Thank you - we have your details";
    const boundary = `tcb_${crypto.randomUUID().replace(/-/g, "")}`;
    const html = buildHtml(firstName, cemetery, needsDeed);
    const plain = buildPlain(firstName, cemetery, needsDeed);

    const mime = [
      `From: ${FROM_NAME} <${FROM_EMAIL}>`,
      `To: ${toEmail}`,
      `Reply-To: ${FROM_EMAIL}`,
      `Subject: ${subject}`,
      // Marker used by sync-inbox to keep this message out of the customer's
      // submission thread. Their reply is not marked, so it still appears.
      `X-TCB-Auto: thankyou`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      `Content-Transfer-Encoding: 8bit`,
      ``,
      plain,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: 8bit`,
      ``,
      html,
      ``,
      `--${boundary}--`,
      ``,
    ].join("\r\n");

    const res = await fetch(`${GMAIL}/users/me/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gmailKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: b64url(mime) }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Gmail send failed", res.status, json);
      return respond({ ok: false, error: `Gmail send failed [${res.status}]` }, 502);
    }
    return respond({ ok: true, sent_to: toEmail, needs_deed: needsDeed, gmail_message_id: json.id });
  } catch (err) {
    console.error(err);
    return respond({ ok: false, error: String((err as Error)?.message ?? err) }, 500);
  }
});
