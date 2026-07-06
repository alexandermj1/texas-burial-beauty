// One-off Bayer Guaranteed Sale Offer — preview + send.
// Admin-only. Sends via Resend gateway from the Bayer brand identity.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { renderBayerGuaranteeOffer, GUARANTEE_OFFER_DEFAULTS, type GuaranteeOfferInput } from "../_shared/marketing/guarantee-offer.ts";
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

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "preview");
    const input: GuaranteeOfferInput = { ...GUARANTEE_OFFER_DEFAULTS, ...(body.offer || {}) };
    const rendered = renderBayerGuaranteeOffer(input);

    if (action === "preview") {
      return j({ ok: true, ...rendered });
    }

    if (action === "send" || action === "send-test") {
      const brand = BRANDS.bayer;
      const recipient = String(body.toEmail || (action === "send-test" ? user.email : "")).trim();
      if (!recipient) return j({ error: "Recipient email required" }, 400);
      const subject = action === "send-test" ? `[TEST] ${rendered.subject}` : rendered.subject;

      const resp = await fetch(`${GATEWAY}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": RESEND_API_KEY,
        },
        body: JSON.stringify({
          from: `${input.agentName} <${brand.fromEmail}>`,
          to: [recipient],
          reply_to: input.agentEmail || brand.replyTo,
          subject,
          html: rendered.html,
          text: rendered.text,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        return j({ error: (data as any)?.message || `Resend ${resp.status}`, details: data }, resp.status);
      }
      return j({ ok: true, id: (data as any)?.id, sentTo: recipient });
    }

    return j({ error: "Unknown action" }, 400);
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
