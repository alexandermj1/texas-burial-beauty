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

async function sendEmail(to: string, subject: string, html: string) {
  try {
    const { error } = await db().functions.invoke("gmail-action", {
      body: { action: "send", to, subject, htmlBody: html, body: html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() },
    });
    if (error) console.error("sendEmail error", error);
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

async function handleListingFeePaid(tx: any) {
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
    <p>Thank you — we've received your <strong>${escapeHtml(tierLabel)} listing</strong> payment of <strong>${fmt(tx.amount_cents)}</strong>.</p>
    <p>Your plot is now in our active marketing rotation. Here's what happens next:</p>
    <ol>
      <li>We finalise your listing copy and any photography within 1–2 business days.</li>
      <li>It goes live to our buyer network across Texas.</li>
      <li>We notify you the moment a qualified buyer is matched.</li>
    </ol>
    <p>If you have additional documentation (deed, photos, cemetery letters), simply reply to this email and attach them.</p>
    <p>Warm regards,<br><strong>${FROM_NAME}</strong><br>${FROM_TITLE}<br>${BRAND}</p>
  `, `Payment received — ${tierLabel} listing activated.`);
  if (tx.recipient_email) {
    await sendEmail(tx.recipient_email, `Your ${tierLabel} listing is active — ${BRAND}`, html);
  }
  await notifyAdmins(
    "Listing fee paid",
    `${tx.recipient_name || tx.recipient_email} paid ${fmt(tx.amount_cents)} (${tierLabel}).`,
    tx.submission_id,
  );
}

async function handlePlotSalePaid(tx: any) {
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
  const html = brandedShell(`
    <p>Dear ${escapeHtml(firstName)},</p>
    <p>Thank you — your payment of <strong>${fmt(tx.amount_cents)}</strong> for <em>${escapeHtml(tx.description || "your cemetery plot")}</em> has been received.</p>
    <p>The plot is now reserved in your name. Our transfer team will be in touch within one business day with the cemetery transfer paperwork and next steps.</p>
    <p>A Stripe receipt has also been emailed to you separately.</p>
    <p>Warm regards,<br><strong>${FROM_NAME}</strong><br>${FROM_TITLE}<br>${BRAND}</p>
  `, `Payment confirmed — your plot is reserved.`);
  if (tx.recipient_email) {
    await sendEmail(tx.recipient_email, `Payment confirmed — ${BRAND}`, html);
  }
  await notifyAdmins(
    "Plot sold",
    `${tx.recipient_name || tx.recipient_email} paid ${fmt(tx.amount_cents)} for ${tx.description || "a plot"}.`,
    tx.submission_id,
  );
}

async function handleCustomPaid(tx: any) {
  const firstName = (tx.recipient_name || "").split(" ")[0] || "there";
  const html = brandedShell(`
    <p>Dear ${escapeHtml(firstName)},</p>
    <p>Thank you — we've received your payment of <strong>${fmt(tx.amount_cents)}</strong> for <em>${escapeHtml(tx.description || "your invoice")}</em>.</p>
    <p>A Stripe receipt has been emailed to you separately. Reply to this email anytime with questions.</p>
    <p>Warm regards,<br><strong>${FROM_NAME}</strong><br>${FROM_TITLE}<br>${BRAND}</p>
  `, "Payment received.");
  if (tx.recipient_email) {
    await sendEmail(tx.recipient_email, `Payment received — ${BRAND}`, html);
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
  if (tx.kind === "listing_fee") await handleListingFeePaid(tx);
  else if (tx.kind === "plot_sale") await handlePlotSalePaid(tx);
  else if (tx.kind === "custom") await handleCustomPaid(tx);
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
