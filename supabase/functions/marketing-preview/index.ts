// Render a marketing template server-side for the admin Compose preview.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getTemplate } from "../_shared/marketing/templates.ts";
import { BRANDS } from "../_shared/marketing/brands.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return j({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return j({ error: "Admin only" }, 403);

    const { templateKey, subject, preheader, firstName, company, city } = await req.json();
    const tpl = getTemplate(templateKey);
    if (!tpl) return j({ error: "Unknown template" }, 400);
    const brand = BRANDS[tpl.brand];
    const rendered = tpl.render(
      {
        brand: tpl.brand,
        firstName: firstName || "Alex",
        company: company || "Sample Funeral Home",
        city: city || "Dallas",
        unsubscribeUrl: `${brand.siteUrl}/unsubscribe?token=PREVIEW&brand=${tpl.brand}`,
        siteUrl: brand.siteUrl,
      },
      { subject, preheader },
    );
    return j(rendered);
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
