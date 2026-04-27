// Convert an email-only inquiry into a contact_submissions row. Admin only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const { data: roleData } = await userClient
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleData) return json({ error: "Admin only" }, 403);

    const body = await req.json();
    const emailId = body.email_id;
    const kindInput = body.source ?? "contact"; // 'contact' | 'sell' | 'buy'
    if (!emailId || typeof emailId !== "string") return json({ error: "email_id required" }, 400);

    // Normalize to canonical source + customer_kind values used elsewhere.
    const customerKind =
      kindInput === "sell" || kindInput === "seller" ? "seller" :
      kindInput === "buy"  || kindInput === "buyer"  ? "buyer"  : "contact";
    const sourceCanonical =
      customerKind === "seller" ? "seller_quote" :
      customerKind === "buyer"  ? "buy_property_wizard" : "contact";

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: email, error: emailErr } = await admin
      .from("email_messages").select("*").eq("id", emailId).single();
    if (emailErr || !email) return json({ error: "Email not found" }, 404);

    const submissionId = crypto.randomUUID();
    const { error: subErr } = await admin.from("contact_submissions").insert({
      id: submissionId,
      source: sourceCanonical,
      customer_kind: customerKind,
      name: email.from_name ?? email.from_email,
      email: email.from_email,
      message: email.body_text ?? email.snippet,
      source_email_id: email.id,
    });
    if (subErr) return json({ error: subErr.message }, 500);

    // Link the email back
    await admin.from("email_messages").update({
      matched_submission_id: submissionId,
      match_confidence: "high",
    }).eq("id", email.id);

    return json({ success: true, submission_id: submissionId });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
