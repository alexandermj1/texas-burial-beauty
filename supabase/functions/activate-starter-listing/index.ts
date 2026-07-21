// Public endpoint hit when a seller clicks the "Select Starter" button in
// their quote email. Flips the pending free transaction to paid, marks the
// submission as an accepted Starter listing, and sends a branded confirmation
// email + admin notification. No auth required — validated by the opaque
// payment_transactions row UUID passed in the URL.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({ transactionId: z.string().uuid() });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid transactionId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { transactionId } = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tx } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("id", transactionId)
      .maybeSingle();

    if (!tx) {
      return new Response(JSON.stringify({ error: "Selection link not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (tx.kind !== "listing_fee" || (tx.metadata as any)?.listing_tier !== "starter") {
      return new Response(JSON.stringify({ error: "This link is not a Starter selection" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const alreadyActive = tx.status === "paid";
    const nowIso = new Date().toISOString();

    // Look up cemetery/name for the confirmation UI + emails.
    const { data: submission } = await supabase
      .from("contact_submissions")
      .select("id, name, email, cemetery, quote_amount")
      .eq("id", tx.submission_id)
      .maybeSingle();

    if (!alreadyActive) {
      // Flip pending → paid.
      await supabase.from("payment_transactions").update({
        status: "paid",
        paid_at: nowIso,
      }).eq("id", transactionId);

      // Mark the submission as an accepted Starter listing so it shows up
      // correctly in the admin panel (same fields the manual tier picker
      // sets in SubmissionsPanel.tsx).
      const acceptedPrice = Number(submission?.quote_amount) || 0;
      await supabase.from("contact_submissions").update({
        listing_tier: "starter",
        listing_paid_at: nowIso,
        payment_received_at: nowIso,
        quote_response: "accepted",
        quote_responded_at: nowIso,
        accepted_quote_amount: acceptedPrice > 0 ? acceptedPrice : null,
        acceptance_channel: "starter_button",
      } as any).eq("id", tx.submission_id);

      // Confirmation email to the seller.
      const firstName = (tx.recipient_name || submission?.name || "").split(" ")[0] || "there";
      const cemLabel = submission?.cemetery || "your cemetery";
      const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f7f3ee;font-family:Georgia,serif;color:#1f2937;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ee;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #ead9c9;border-radius:14px;max-width:640px;">
<tr><td style="padding:28px 32px;border-bottom:1px solid #f1e6da;text-align:center;">
<div style="font-size:22px;letter-spacing:.18em;color:#7c3a2e;font-weight:600;">TEXAS CEMETERY BROKERS</div>
<div style="font-size:11px;letter-spacing:.28em;color:#a08a76;margin-top:6px;text-transform:uppercase;">Serving all of Texas</div>
</td></tr>
<tr><td style="padding:32px 40px;font-size:15px;line-height:1.7;">
<p>Dear ${firstName},</p>
<p>Thank you for selecting our <strong>Starter listing</strong> for your property at ${cemLabel}. Your listing is now active — there is no upfront cost for this tier.</p>
<p>Our next step is to send you the Exclusive Sales Agreement to sign, which formally lists your property with us. You will receive that in a separate email shortly.</p>
<p>If you have additional documentation (deed, photos, cemetery letters), simply reply and attach them.</p>
<p>Warm regards,<br><strong>Alexander James</strong><br>Cemetery Salesperson<br>Texas Cemetery Brokers</p>
</td></tr></table></td></tr></table></body></html>`;
      try {
        if (tx.recipient_email) {
          await supabase.functions.invoke("gmail-action", {
            body: {
              action: "send",
              to: tx.recipient_email,
              subject: "Your Starter listing is active — Texas Cemetery Brokers",
              htmlBody: html,
              body: html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
            },
          });
        }
      } catch (e) { console.error("Starter confirmation email failed", e); }

      // Admin notification.
      try {
        const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
        if (admins?.length) {
          await supabase.from("user_notifications").insert(admins.map((a: any) => ({
            user_id: a.user_id,
            title: "Starter listing selected",
            message: `${tx.recipient_name || tx.recipient_email || "Seller"} clicked to activate a free Starter listing.`,
            link: `/admin?submission=${tx.submission_id}`,
            read: false,
          })));
        }
      } catch (e) { console.error("Starter admin notify failed", e); }
    }

    return new Response(JSON.stringify({
      ok: true,
      alreadyActive,
      recipientName: tx.recipient_name,
      recipientEmail: tx.recipient_email,
      cemetery: submission?.cemetery ?? null,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("activate-starter-listing error:", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
