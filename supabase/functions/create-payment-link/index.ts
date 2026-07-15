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
    const { submissionId, kind, amountCents, description, recipientEmail, recipientName, listingTier } = parsed.data;
    const env: StripeEnv = parsed.data.environment ?? "sandbox";

    // Starter ($0) listing — no Stripe session needed, just record + activate.
    if (kind === "listing_fee" && amountCents === 0) {
      await supabase.from("contact_submissions").update({
        listing_tier: listingTier || "starter",
        listing_paid_at: new Date().toISOString(),
        payment_received_at: new Date().toISOString(),
      }).eq("id", submissionId);
      const { data: freeTx } = await supabase.from("payment_transactions").insert({
        submission_id: submissionId, kind, description,
        recipient_email: recipientEmail, recipient_name: recipientName || null,
        amount_cents: 0, currency: "usd", status: "paid",
        paid_at: new Date().toISOString(),
        environment: env, created_by_user_id: user.id,
        metadata: { listing_tier: listingTier || "starter", product_name: "Starter Listing" },
      }).select().single();

      // Send branded confirmation email + admin notification (same treatment as Pro).
      const firstName = (recipientName || "").split(" ")[0] || "there";
      const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f7f3ee;font-family:Georgia,serif;color:#1f2937;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ee;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #ead9c9;border-radius:14px;max-width:640px;">
<tr><td style="padding:28px 32px;border-bottom:1px solid #f1e6da;text-align:center;">
<div style="font-size:22px;letter-spacing:.18em;color:#7c3a2e;font-weight:600;">TEXAS CEMETERY BROKERS</div>
<div style="font-size:11px;letter-spacing:.28em;color:#a08a76;margin-top:6px;text-transform:uppercase;">Serving all of Texas</div>
</td></tr>
<tr><td style="padding:32px 40px;font-size:15px;line-height:1.7;">
<p>Dear ${firstName},</p>
<p>Your <strong>Starter listing</strong> is now active — no payment was required for this tier. We'll finalise your listing copy within 1–2 business days and notify you the moment a qualified buyer is matched.</p>
<p>If you have additional documentation (deed, photos, cemetery letters), simply reply to this email and attach them.</p>
<p>Warm regards,<br><strong>Alexander James</strong><br>Cemetery Salesperson<br>Texas Cemetery Brokers</p>
</td></tr></table></td></tr></table></body></html>`;
      try {
        await supabase.functions.invoke("gmail-action", {
          body: { action: "send", to: recipientEmail, subject: "Your Starter listing is active — Texas Cemetery Brokers", htmlBody: html, body: html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() },
        });
      } catch (e) { console.error("Starter email failed", e); }

      try {
        const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
        if (admins?.length) {
          await supabase.from("user_notifications").insert(admins.map((a: any) => ({
            user_id: a.user_id,
            title: "Starter listing activated",
            message: `${recipientName || recipientEmail} activated a free Starter listing.`,
            link: `/admin?submission=${submissionId}`,
            read: false,
          })));
        }
      } catch (e) { console.error("Starter notify failed", e); }

      return new Response(JSON.stringify({ url: null, free: true, transactionId: freeTx?.id }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      ui_mode: "hosted_page",
      // Force plain card checkout — skips Stripe Link's "Pay with Link"
      // landing screen and the SMS/phone confirmation step that goes with it.
      payment_method_types: ["card"],
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
          ...(listingTier && { listing_tier: listingTier }),
        },
      },
      metadata: {
        submission_id: submissionId,
        kind,
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        ...(listingTier && { listing_tier: listingTier }),
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
        metadata: { product_name: productName, ...(listingTier && { listing_tier: listingTier }) },
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
