// Issues a Stripe refund for a recorded payment. Restricted to the single
// owner account — no other admin or staff member can call this successfully.
// The charge.refunded webhook also lands and keeps the row in sync; we update
// optimistically here so the accounting screen reflects it immediately.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Only this account may issue refunds. */
const OWNER_EMAILS = ["alexandermaclarenjames@gmail.com"];

const BodySchema = z.object({
  transactionId: z.string().uuid(),
  // Omit for a full refund; otherwise a partial amount in cents.
  amountCents: z.number().int().positive().max(50_000_000).optional(),
  reason: z.string().max(300).optional(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const email = (user.email ?? "").toLowerCase();
    if (!OWNER_EMAILS.includes(email)) {
      console.warn("refund-payment: blocked non-owner", email);
      return json({ error: "Refunds are restricted to the owner account." }, 403);
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
    const { transactionId, amountCents, reason } = parsed.data;

    const { data: tx } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("id", transactionId)
      .maybeSingle();
    if (!tx) return json({ error: "Transaction not found" }, 404);
    if (tx.status !== "paid") return json({ error: `Only paid transactions can be refunded (this one is "${tx.status}").` }, 400);
    if (tx.refunded_at) return json({ error: "This payment has already been refunded." }, 400);

    const alreadyRefunded = tx.refund_amount_cents ?? 0;
    const maxRefundable = tx.amount_cents - alreadyRefunded;
    const refundCents = amountCents ?? maxRefundable;
    if (refundCents > maxRefundable) {
      return json({ error: `Maximum refundable amount is $${(maxRefundable / 100).toFixed(2)}.` }, 400);
    }

    const env: StripeEnv = tx.environment === "live" ? "live" : "sandbox";
    const stripe = createStripeClient(env);

    // Prefer the charge, fall back to the payment intent, and finally resolve
    // it from the checkout session if the webhook never stored either.
    let charge: string | null = tx.stripe_charge_id ?? null;
    let paymentIntent: string | null = tx.stripe_payment_intent_id ?? null;
    if (!charge && !paymentIntent && tx.stripe_session_id) {
      const session = await stripe.checkout.sessions.retrieve(tx.stripe_session_id);
      paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
    }
    if (!charge && !paymentIntent) return json({ error: "No Stripe charge is linked to this payment, so it can't be refunded automatically." }, 400);

    const refund = await stripe.refunds.create({
      ...(charge ? { charge } : { payment_intent: paymentIntent! }),
      amount: refundCents,
      metadata: {
        transaction_id: tx.id,
        issued_by: email,
        ...(reason ? { note: reason.slice(0, 200) } : {}),
      },
    });

    const totalRefunded = alreadyRefunded + refundCents;
    const fullyRefunded = totalRefunded >= tx.amount_cents;

    await supabase
      .from("payment_transactions")
      .update({
        status: fullyRefunded ? "refunded" : tx.status,
        refund_amount_cents: totalRefunded,
        refunded_at: fullyRefunded ? new Date().toISOString() : tx.refunded_at,
        metadata: {
          ...(tx.metadata && typeof tx.metadata === "object" ? tx.metadata : {}),
          refunds: [
            ...(Array.isArray((tx.metadata as any)?.refunds) ? (tx.metadata as any).refunds : []),
            { id: refund.id, amount_cents: refundCents, at: new Date().toISOString(), by: email, reason: reason ?? null },
          ],
        },
      })
      .eq("id", tx.id);

    return json({ success: true, refundId: refund.id, refundedCents: refundCents, fullyRefunded });
  } catch (e) {
    console.error("refund-payment error", e);
    return json({ error: e instanceof Error ? e.message : "Refund failed" }, 500);
  }
});
