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
    const parsed = QuerySchema.safeParse({ session_id: url.searchParams.get("session_id") });
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "invalid session_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data } = await supabase
      .from("payment_transactions")
      .select("recipient_name, recipient_email, description, amount_cents, currency, kind, status, metadata")
      .eq("stripe_session_id", parsed.data.session_id)
      .maybeSingle();

    if (!data) {
      return new Response(JSON.stringify({ found: false }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      found: true,
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
