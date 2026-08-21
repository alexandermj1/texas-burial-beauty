// Public lookup for the success page — returns just enough to greet the
// customer by name and confirm what they paid for. Never exposes admin-only
// fields, seller identities, or the full transaction row.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const QuerySchema = z.object({ session_id: z.string().min(6).max(200) });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    let sessionId = url.searchParams.get("session_id");
    if (!sessionId && req.method === "POST") {
      try { sessionId = (await req.json())?.session_id ?? null; } catch { /* ignore */ }
    }
    const parsed = QuerySchema.safeParse({ session_id: sessionId });
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "invalid session_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data } = await supabase
      .from("payment_transactions")
      .select("recipient_name, recipient_email, description, amount_cents, currency, kind, status, metadata, submission_id")
      .eq("stripe_session_id", parsed.data.session_id)
      .maybeSingle();

    if (!data) {
      return new Response(JSON.stringify({ found: false }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // For a listing fee we carry the seller straight on to their agreement
    // instead of making them wait for (and hunt for) the email.
    let signUrl: string | null = null;
    if (data.kind === "listing_fee" && data.submission_id) {
      const { data: c } = await supabase
        .from("contracts")
        .select("sign_token, signed_at")
        .eq("submission_id", data.submission_id)
        .eq("kind", "listing_agreement")
        .maybeSingle();
      if (c?.sign_token && !c.signed_at) {
        signUrl = `/sign/${c.sign_token}`;
      } else if (!c && data.status === "paid") {
        // The webhook may not have run yet — prepare it now, same code path.
        try {
          const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/autopilot`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            },
            body: JSON.stringify({ submission_id: data.submission_id, step: "listing_agreement" }),
          });
          const out = await res.json();
          const full = String(out?.sign_url ?? "");
          const m = full.match(/\/sign\/[A-Za-z0-9]+$/);
          if (m) signUrl = m[0];
        } catch (e) { console.error("autopilot prepare failed", e); }
      }
    }

    return new Response(JSON.stringify({
      found: true,
      signUrl,
      recipientName: data.recipient_name,
      recipientEmail: data.recipient_email,
      description: data.description,
      amountCents: data.amount_cents,
      currency: data.currency,
      kind: data.kind,
      status: data.status,
      productName: (data.metadata as any)?.product_name || null,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
