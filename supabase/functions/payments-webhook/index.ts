// Handles Stripe webhook events. Marks payment_transactions as paid and
// stamps the linked submission when a plot sale completes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function db() {
  if (!_supabase) {
    _supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  }
  return _supabase;
}

async function markPaid(sessionId: string, paymentIntentId: string | null, env: StripeEnv, metadata: Record<string, any>) {
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

  if (tx.kind === "plot_sale" && tx.submission_id) {
    await db()
      .from("contact_submissions")
      .update({
        sold_at: new Date().toISOString(),
        sold_price: tx.amount_cents / 100,
        payment_received_at: new Date().toISOString(),
        seller_payout_status: "pending",
        closed_outcome: "sold",
      })
      .eq("id", tx.submission_id);
  }
  if (tx.kind === "listing_fee" && tx.submission_id) {
    await db()
      .from("contact_submissions")
      .update({ payment_received_at: new Date().toISOString() })
      .eq("id", tx.submission_id);
  }
}

async function markFailed(sessionId: string, env: StripeEnv) {
  await db()
    .from("payment_transactions")
    .update({ status: "failed" })
    .eq("stripe_session_id", sessionId)
    .eq("environment", env);
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
        const sessionId = obj.id;
        const paymentIntentId = typeof obj.payment_intent === "string" ? obj.payment_intent : null;
        await markPaid(sessionId, paymentIntentId, env, obj.metadata ?? {});
        break;
      }
      case "transaction.payment_failed":
      case "checkout.session.expired": {
        await markFailed(event.data.object.id, env);
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
