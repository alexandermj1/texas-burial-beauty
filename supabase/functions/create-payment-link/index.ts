// Generates a branded Stripe Checkout link for a submission (listing fee,
// plot sale to buyer, or custom amount). Records the transaction in
// payment_transactions for accounting. Admin-only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  submissionId: z.string().uuid(),
  kind: z.enum(["listing_fee", "plot_sale", "custom"]),
  amountCents: z.number().int().nonnegative().max(50_000_000),
  description: z.string().min(2).max(500),
  recipientEmail: z.string().email(),
  recipientName: z.string().max(200).optional().default(""),
  listingTier: z.enum(["starter", "pro", "custom_plus"]).optional(),
  environment: z.enum(["sandbox", "live"]).optional(),
});

const BRAND_NAME = "Texas Cemetery Brokers";

function deriveEnv(token?: string | null): StripeEnv {
  if (token?.startsWith("pk_live_")) return "live";
  return "sandbox";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { submissionId, kind, amountCents, description, recipientEmail, recipientName } = parsed.data;
    const env: StripeEnv = parsed.data.environment ?? "sandbox";

    const { data: submission } = await supabase
      .from("contact_submissions")
      .select("id, cemetery, section, property_type, spaces, name")
      .eq("id", submissionId)
      .maybeSingle();

    const productName =
      kind === "plot_sale" && submission?.cemetery
        ? `Cemetery plot — ${submission.cemetery}${submission.section ? `, Section ${submission.section}` : ""}`
        : description;

    const productDescription = [
      submission?.cemetery && `Cemetery: ${submission.cemetery}`,
      submission?.section && `Section: ${submission.section}`,
      submission?.property_type && `Type: ${submission.property_type}`,
      submission?.spaces && `Spaces: ${submission.spaces}`,
    ].filter(Boolean).join(" · ") || undefined;

    const stripe = createStripeClient(env);

    const origin = req.headers.get("origin") || "https://texascemeterybrokers.com";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "hosted",
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: productName,
            ...(productDescription && { description: productDescription }),
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      customer_email: recipientEmail,
      payment_intent_data: {
        description: `${BRAND_NAME} — ${productName}`,
        metadata: {
          submission_id: submissionId,
          kind,
          recipient_name: recipientName,
        },
      },
      metadata: {
        submission_id: submissionId,
        kind,
        recipient_email: recipientEmail,
        recipient_name: recipientName,
      },
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment-cancelled`,
    });

    const { data: tx, error: txErr } = await supabase
      .from("payment_transactions")
      .insert({
        submission_id: submissionId,
        kind,
        description,
        recipient_email: recipientEmail,
        recipient_name: recipientName || null,
        amount_cents: amountCents,
        currency: "usd",
        status: "pending",
        stripe_session_id: session.id,
        checkout_url: session.url,
        environment: env,
        created_by_user_id: user.id,
        metadata: { product_name: productName },
      })
      .select()
      .single();

    if (txErr) {
      console.error("Failed to insert transaction:", txErr);
    }

    if (kind === "plot_sale") {
      await supabase
        .from("contact_submissions")
        .update({
          list_price: amountCents / 100,
          payment_link_sent_at: new Date().toISOString(),
        })
        .eq("id", submissionId);
    }

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
        transactionId: tx?.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("create-payment-link error:", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
