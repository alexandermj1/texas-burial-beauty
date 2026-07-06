// Public endpoint. GET validates a token; POST records the unsubscribe.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const token = url.searchParams.get("token") || "";
      if (!token) return j({ error: "Missing token" }, 400);
      const { data } = await admin
        .from("marketing_unsubscribe_tokens")
        .select("brand,email,used_at")
        .eq("token", token)
        .maybeSingle();
      if (!data) return j({ error: "Invalid or expired link" }, 404);
      return j({ brand: data.brand, email: data.email, alreadyUnsubscribed: !!data.used_at });
    }
    if (req.method === "POST") {
      const { token } = await req.json();
      if (!token) return j({ error: "Missing token" }, 400);
      const { data: tk } = await admin
        .from("marketing_unsubscribe_tokens")
        .select("brand,email")
        .eq("token", token)
        .maybeSingle();
      if (!tk) return j({ error: "Invalid or expired link" }, 404);
      const ts = new Date().toISOString();
      await admin
        .from("marketing_contacts")
        .update({ unsubscribed_at: ts })
        .eq("brand", tk.brand)
        .ilike("email", tk.email);
      await admin.from("marketing_unsubscribe_tokens").update({ used_at: ts }).eq("token", token);
      return j({ ok: true, brand: tk.brand, email: tk.email });
    }
    return j({ error: "Method not allowed" }, 405);
  } catch (e: any) {
    return j({ error: e?.message || "Unknown error" }, 500);
  }
});
function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
