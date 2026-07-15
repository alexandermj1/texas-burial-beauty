// Handles Stripe webhook events. Marks payment_transactions as paid,
// stamps the linked submission, notifies admins, and emails receipts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function db() {
  if (!_supabase) {
    _supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  }
  return _supabase;
}

const BRAND = "Texas Cemetery Brokers";
const SITE = "https://www.texascemeterybrokers.com";
const FROM_NAME = "Alexander James";
const FROM_TITLE = "Cemetery Salesperson";

const fmt = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]!));

function brandedShell(innerHtml: string, preheader = ""): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${BRAND}</title></head>
<body style="margin:0;padding:0;background:#f7f3ee;font-family:Georgia,'Times New Roman',serif;color:#1f2937;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ee;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #ead9c9;border-radius:14px;overflow:hidden;">
      <tr><td style="padding:28px 32px;border-bottom:1px solid #f1e6da;text-align:center;">
        <div style="font-family:Georgia,serif;font-size:22px;letter-spacing:.18em;color:#7c3a2e;font-weight:600;">TEXAS CEMETERY BROKERS</div>
        <div style="font-size:11px;letter-spacing:.28em;color:#a08a76;margin-top:6px;text-transform:uppercase;">Serving all of Texas</div>
      </td></tr>
      <tr><td style="padding:32px 40px;font-size:15px;line-height:1.7;color:#2d2a26;">${innerHtml}</td></tr>
      <tr><td style="padding:20px 32px;border-top:1px solid #f1e6da;text-align:center;font-size:12px;color:#8a7766;">
        <a href="${SITE}" style="color:#7c3a2e;text-decoration:none;">www.texascemeterybrokers.com</a>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}

const GMAIL_GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const MAILBOX = "info@texascemeterybrokers.com";

function encodeBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function encodeSubject(s: string): string {
  // eslint-disable-next-line no-control-regex
  if (!/[^\x00-\x7F]/.test(s)) return s;
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return `=?UTF-8?B?${btoa(bin)}?=`;
}


function buildRawEmail(to: string, subject: string, html: string): string {
  const boundary = `=_tcb_${crypto.randomUUID().replace(/-/g, "")}`;
  const plain = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const lines = [
    `From: ${MAILBOX}`,
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    plain,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    html,
    `--${boundary}--`,
    "",
  ];
  return encodeBase64Url(lines.join("\r\n"));
}

async function sendEmail(to: string, subject: string, html: string) {
  try {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const gmailKey = Deno.env.get("GOOGLE_MAIL_API_KEY");
    if (!lovableKey || !gmailKey) {
      console.error("sendEmail: missing LOVABLE_API_KEY or GOOGLE_MAIL_API_KEY");
      return;
    }
    const raw = buildRawEmail(to, subject, html);
    const res = await fetch(`${GMAIL_GATEWAY}/users/me/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gmailKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });
    if (!res.ok) {
      console.error("sendEmail gmail gateway error", res.status, await res.text());
    }
  } catch (e) {
    console.error("sendEmail throw", e);
  }
}

async function notifyAdmins(title: string, message: string, submissionId: string | null) {
  try {
    const { data: admins } = await db()
      .from("user_roles").select("user_id").eq("role", "admin");
    if (!admins?.length) return;
    const rows = admins.map(a => ({
      user_id: a.user_id, title, message,
      link: submissionId ? `/admin?submission=${submissionId}` : "/admin",
      read: false,
    }));
    await db().from("user_notifications").insert(rows);
  } catch (e) {
    console.error("notifyAdmins", e);
  }
}

const TIER_LABEL: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  custom_plus: "Custom Plus",
};

function receiptBlock(tx: any, itemLabel: string, cardBrand?: string, cardLast4?: string) {
  const paidOn = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const method = cardBrand && cardLast4
    ? `${cardBrand.charAt(0).toUpperCase() + cardBrand.slice(1)} •••• ${cardLast4}`
    : "Card payment";
  const ref = (tx.stripe_payment_intent_id || tx.stripe_session_id || tx.id || "").toString().slice(-12).toUpperCase();
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid #ead9c9;border-radius:10px;background:#faf6f0;">
      <tr><td style="padding:18px 22px;">
        <div style="font-size:11px;letter-spacing:.24em;color:#a08a76;text-transform:uppercase;margin-bottom:12px;">Receipt</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#2d2a26;">
          <tr><td style="padding:4px 0;color:#8a7766;">Date</td><td align="right" style="padding:4px 0;">${paidOn}</td></tr>
          <tr><td style="padding:4px 0;color:#8a7766;">Reference</td><td align="right" style="padding:4px 0;font-family:monospace;">${ref}</td></tr>
          <tr><td style="padding:4px 0;color:#8a7766;">Payment method</td><td align="right" style="padding:4px 0;">${escapeHtml(method)}</td></tr>
          <tr><td style="padding:4px 0;color:#8a7766;">Item</td><td align="right" style="padding:4px 0;">${escapeHtml(itemLabel)}</td></tr>
          <tr><td colspan="2" style="padding:8px 0 0;border-top:1px solid #ead9c9;"></td></tr>
          <tr><td style="padding:10px 0 0;font-weight:600;">Total paid</td><td align="right" style="padding:10px 0 0;font-weight:600;color:#7c3a2e;">${fmt(tx.amount_cents)} USD</td></tr>
        </table>
      </td></tr>
    </table>`;
}

async function handleListingFeePaid(tx: any, cardBrand?: string, cardLast4?: string) {
  const tier = tx.metadata?.listing_tier || "pro";
  if (tx.submission_id) {
    await db().from("contact_submissions").update({
      listing_tier: tier,
      listing_paid_at: new Date().toISOString(),
      payment_received_at: new Date().toISOString(),
    }).eq("id", tx.submission_id);
  }
  const firstName = (tx.recipient_name || "").split(" ")[0] || "there";
  const tierLabel = TIER_LABEL[tier] || "Listing";
  const html = brandedShell(`
    <p>Dear ${escapeHtml(firstName)},</p>
    <p>Thank you. We've received your ${escapeHtml(tierLabel)} listing payment. Please keep this email as your receipt.</p>
    ${receiptBlock(tx, `${tierLabel} Listing`, cardBrand, cardLast4)}
    <p>Regards,<br><strong>${FROM_NAME}</strong><br>${FROM_TITLE}<br>${BRAND}</p>
  `, `Receipt - ${tierLabel} listing ${fmt(tx.amount_cents)}`);
  if (tx.recipient_email) {
    await sendEmail(tx.recipient_email, `Receipt - ${tierLabel} listing (${fmt(tx.amount_cents)})`, html);
  }
  await notifyAdmins(
    "Listing fee paid",
    `${tx.recipient_name || tx.recipient_email} paid ${fmt(tx.amount_cents)} (${tierLabel}).`,
    tx.submission_id,
  );
}

async function handlePlotSalePaid(tx: any, cardBrand?: string, cardLast4?: string) {
  if (tx.submission_id) {
    await db().from("contact_submissions").update({
      sold_at: new Date().toISOString(),
      sold_price: tx.amount_cents / 100,
      payment_received_at: new Date().toISOString(),
      seller_payout_status: "pending",
      closed_outcome: "sold",
    }).eq("id", tx.submission_id);
  }
  const firstName = (tx.recipient_name || "").split(" ")[0] || "there";
  const itemLabel = tx.description || "Cemetery plot";
  const html = brandedShell(`
    <p>Dear ${escapeHtml(firstName)},</p>
    <p>Thank you — your payment for <em>${escapeHtml(itemLabel)}</em> has been received. Please keep this email as your official receipt.</p>
    ${receiptBlock(tx, itemLabel, cardBrand, cardLast4)}
    <p>The plot is now reserved in your name. Our transfer team will be in touch within one business day with the cemetery transfer paperwork and next steps.</p>
    <p>Warm regards,<br><strong>${FROM_NAME}</strong><br>${FROM_TITLE}<br>${BRAND}</p>
  `, `Receipt — ${fmt(tx.amount_cents)} for your cemetery plot.`);
  if (tx.recipient_email) {
    await sendEmail(tx.recipient_email, `Receipt — Plot purchase (${fmt(tx.amount_cents)})`, html);
  }
  await notifyAdmins(
    "Plot sold",
    `${tx.recipient_name || tx.recipient_email} paid ${fmt(tx.amount_cents)} for ${tx.description || "a plot"}.`,
    tx.submission_id,
  );
}

async function handleCustomPaid(tx: any, cardBrand?: string, cardLast4?: string) {
  const firstName = (tx.recipient_name || "").split(" ")[0] || "there";
  const itemLabel = tx.description || "Invoice";
  const html = brandedShell(`
    <p>Dear ${escapeHtml(firstName)},</p>
    <p>Thank you — we've received your payment. Please keep this email as your official receipt.</p>
    ${receiptBlock(tx, itemLabel, cardBrand, cardLast4)}
    <p>Reply to this email anytime with questions.</p>
    <p>Warm regards,<br><strong>${FROM_NAME}</strong><br>${FROM_TITLE}<br>${BRAND}</p>
  `, `Receipt — ${fmt(tx.amount_cents)}`);
  if (tx.recipient_email) {
    await sendEmail(tx.recipient_email, `Receipt — ${BRAND} (${fmt(tx.amount_cents)})`, html);
  }
  await notifyAdmins(
    "Invoice paid",
    `${tx.recipient_name || tx.recipient_email} paid ${fmt(tx.amount_cents)}.`,
    tx.submission_id,
  );
}

async function handleRefund(tx: any, refundAmountCents: number) {
  await db().from("payment_transactions").update({
    status: "refunded",
    refunded_at: new Date().toISOString(),
    refund_amount_cents: refundAmountCents,
  }).eq("id", tx.id);

  if (tx.submission_id) {
    if (tx.kind === "plot_sale") {
      await db().from("contact_submissions").update({
        sold_at: null,
        sold_price: null,
        closed_outcome: null,
        seller_payout_status: null,
      }).eq("id", tx.submission_id);
    } else if (tx.kind === "listing_fee") {
      await db().from("contact_submissions").update({
        listing_tier: null,
        listing_paid_at: null,
      }).eq("id", tx.submission_id);
    }
  }

  await notifyAdmins(
    "Refund processed",
    `${tx.recipient_name || tx.recipient_email} refunded ${fmt(refundAmountCents)} (${tx.kind}).`,
    tx.submission_id,
  );
}

async function handleDispute(tx: any, status: string) {
  await db().from("payment_transactions").update({
    dispute_status: status,
  }).eq("id", tx.id);
  await notifyAdmins(
    "Stripe dispute opened",
    `${tx.recipient_name || tx.recipient_email} disputed ${fmt(tx.amount_cents)}. Review in Stripe dashboard.`,
    tx.submission_id,
  );
}

async function fetchCardDetails(paymentIntentId: string | null, env: StripeEnv): Promise<{ brand?: string; last4?: string }> {
  if (!paymentIntentId) return {};
  try {
    const { createStripeClient } = await import("../_shared/stripe.ts");
    const stripe = createStripeClient(env);
    const pi: any = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] });
    const charge = pi?.latest_charge;
    const pmd = charge?.payment_method_details?.card;
    return { brand: pmd?.brand, last4: pmd?.last4 };
  } catch (e) {
    console.error("fetchCardDetails", e);
    return {};
  }
}

async function markPaid(sessionId: string, paymentIntentId: string | null, env: StripeEnv) {
  const { data: tx } = await db()
    .from("payment_transactions")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: paymentIntentId,
    })
    .eq("stripe_session_id", sessionId)
    .eq("environment", env)
    .select()
    .maybeSingle();

  if (!tx) return;
  const { brand, last4 } = await fetchCardDetails(paymentIntentId, env);
  if (tx.kind === "listing_fee") await handleListingFeePaid(tx, brand, last4);
  else if (tx.kind === "plot_sale") await handlePlotSalePaid(tx, brand, last4);
  else if (tx.kind === "custom") await handleCustomPaid(tx, brand, last4);
}

async function markFailed(sessionId: string, env: StripeEnv) {
  await db().from("payment_transactions")
    .update({ status: "failed" })
    .eq("stripe_session_id", sessionId)
    .eq("environment", env);
}

async function findTxByCharge(charge: any, env: StripeEnv) {
  const intentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  let q = db().from("payment_transactions").select("*").eq("environment", env);
  if (intentId) {
    const { data } = await q.eq("stripe_payment_intent_id", intentId).maybeSingle();
    if (data) {
      if (charge.id) {
        await db().from("payment_transactions").update({ stripe_charge_id: charge.id }).eq("id", data.id);
      }
      return data;
    }
  }
  if (charge.id) {
    const { data } = await db().from("payment_transactions").select("*")
      .eq("environment", env).eq("stripe_charge_id", charge.id).maybeSingle();
    return data;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), { status: 200 });
  }
  const env: StripeEnv = rawEnv;
  try {
    const event = await verifyWebhook(req, env);
    switch (event.type) {
      case "checkout.session.completed":
      case "transaction.completed": {
        const obj: any = event.data.object;
        const paymentIntentId = typeof obj.payment_intent === "string" ? obj.payment_intent : null;
        await markPaid(obj.id, paymentIntentId, env);
        break;
      }
      case "transaction.payment_failed":
      case "checkout.session.expired": {
        await markFailed(event.data.object.id, env);
        break;
      }
      case "charge.refunded": {
        const charge: any = event.data.object;
        const tx = await findTxByCharge(charge, env);
        if (tx) await handleRefund(tx, charge.amount_refunded ?? charge.amount ?? tx.amount_cents);
        break;
      }
      case "charge.dispute.created":
      case "charge.dispute.closed": {
        const dispute: any = event.data.object;
        const chargeObj = { id: dispute.charge, payment_intent: dispute.payment_intent };
        const tx = await findTxByCharge(chargeObj, env);
        if (tx) await handleDispute(tx, dispute.status || event.type);
        break;
      }
      default:
        console.log("Unhandled:", event.type);
    }
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
