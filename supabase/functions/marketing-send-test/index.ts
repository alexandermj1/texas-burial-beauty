// Send a single test email using the same rendering pipeline.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getTemplate } from "../_shared/marketing/templates.ts";
import { BRANDS } from "../_shared/marketing/brands.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const GATEWAY = "https://connector-gateway.lovable.dev/resend";

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

    const { templateKey, subject, preheader, toEmail, firstName, company, city } = await req.json();
    const tpl = getTemplate(templateKey);
    if (!tpl) return j({ error: "Unknown template" }, 400);
    const brand = BRANDS[tpl.brand];
    const recipient = String(toEmail || user.email || "").trim();
    if (!recipient) return j({ error: "No recipient" }, 400);

    const rendered = tpl.render(
      {
        brand: tpl.brand,
        firstName: firstName || "Alex",
        company: company || null,
        city: city || null,
        unsubscribeUrl: `${brand.siteUrl}/unsubscribe?token=TEST&brand=${tpl.brand}`,
        siteUrl: brand.siteUrl,
      },
      { subject, preheader },
    );

    const resp = await fetch(`${GATEWAY}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: `${brand.fromName} <${brand.fromEmail}>`,
        to: [recipient],
        reply_to: brand.replyTo,
        subject: `[TEST] ${rendered.subject}`,
        html: rendered.html,
        text: rendered.text,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) return j({ error: data?.message || `Resend ${resp.status}`, details: data }, resp.status);
    return j({ ok: true, id: data?.id, sentTo: recipient });
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
