// Send a marketing campaign to every active contact for the campaign's brand.
// Creates the campaign row (or reuses an existing draft), iterates contacts,
// issues a unique unsubscribe token per recipient, calls Resend per email,
// and records per-recipient results in marketing_sends.
//
// Admin-only trigger. Actual send loop runs in the background so the HTTP
// response returns immediately after the campaign is queued.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getTemplate } from "../_shared/marketing/templates.ts";
import { BRANDS } from "../_shared/marketing/brands.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const GATEWAY = "https://connector-gateway.lovable.dev/resend";

// Simple pacing to stay well under Resend rate limits.
const RATE_PER_SECOND = 8;
const DELAY_MS = Math.ceil(1000 / RATE_PER_SECOND);

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

    const { brand, templateKey, subject, preheader, name } = await req.json();
    const tpl = getTemplate(templateKey);
    if (!tpl || tpl.brand !== brand) return j({ error: "Template does not match brand" }, 400);
    const brandCfg = BRANDS[brand as "texas" | "bayer"];

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Snapshot the active audience for this brand.
    const { data: contacts, error: cErr } = await admin
      .from("marketing_contacts")
      .select("id,email,first_name,last_name,company,city")
      .eq("brand", brand)
      .is("unsubscribed_at", null)
      .is("bounced_at", null)
      .is("complained_at", null);
    if (cErr) return j({ error: cErr.message }, 500);
    if (!contacts?.length) return j({ error: "No active contacts for this brand" }, 400);

    const { data: campaign, error: campErr } = await admin
      .from("marketing_campaigns")
      .insert({
        brand,
        name: name || `${brandCfg.name} — ${new Date().toISOString().slice(0, 10)}`,
        template_key: templateKey,
        subject: subject || tpl.defaultSubject,
        preheader: preheader || tpl.defaultPreheader,
        from_name: brandCfg.fromName,
        from_email: brandCfg.fromEmail,
        reply_to: brandCfg.replyTo,
        status: "sending",
        total_recipients: contacts.length,
        sent_at: new Date().toISOString(),
        created_by: user.id,
      })
      .select("id")
      .single();
    if (campErr) return j({ error: campErr.message }, 500);
    const campaignId = campaign.id;

    // Background send loop (EdgeRuntime.waitUntil keeps the isolate alive).
    // @ts-ignore Deno global
    const bg = (async () => {
      let sent = 0, failed = 0;
      for (const c of contacts) {
        try {
          const token = crypto.randomUUID().replace(/-/g, "");
          await admin.from("marketing_unsubscribe_tokens").insert({
            token,
            brand,
            email: c.email,
            contact_id: c.id,
            campaign_id: campaignId,
          });
          const unsubUrl = `${brandCfg.siteUrl}/unsubscribe?token=${token}&brand=${brand}`;
          const rendered = tpl.render(
            {
              brand,
              firstName: c.first_name,
              company: c.company,
              city: c.city,
              unsubscribeUrl: unsubUrl,
              siteUrl: brandCfg.siteUrl,
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
              from: `${brandCfg.fromName} <${brandCfg.fromEmail}>`,
              to: [c.email],
              reply_to: brandCfg.replyTo,
              subject: rendered.subject,
              html: rendered.html,
              text: rendered.text,
              headers: {
                "List-Unsubscribe": `<${unsubUrl}>, <mailto:${brandCfg.replyTo}?subject=unsubscribe>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              },
              tags: [
                { name: "campaign_id", value: campaignId },
                { name: "brand", value: brand },
              ],
            }),
          });
          const data = await resp.json().catch(() => ({}));
          if (!resp.ok) {
            failed++;
            await admin.from("marketing_sends").insert({
              campaign_id: campaignId,
              contact_id: c.id,
              brand,
              email: c.email,
              status: "failed",
              error: data?.message || `Resend ${resp.status}`,
            });
          } else {
            sent++;
            await admin.from("marketing_sends").insert({
              campaign_id: campaignId,
              contact_id: c.id,
              brand,
              email: c.email,
              status: "sent",
              resend_email_id: data?.id ?? null,
              sent_at: new Date().toISOString(),
            });
            await admin
              .from("marketing_contacts")
              .update({ last_sent_at: new Date().toISOString() })
              .eq("id", c.id);
          }
        } catch (e: any) {
          failed++;
          await admin.from("marketing_sends").insert({
            campaign_id: campaignId,
            contact_id: c.id,
            brand,
            email: c.email,
            status: "failed",
            error: e?.message || "Unknown error",
          });
        }
        await new Promise((r) => setTimeout(r, DELAY_MS));
      }
      await admin
        .from("marketing_campaigns")
        .update({
          status: failed > 0 && sent === 0 ? "failed" : "sent",
          total_sent: sent,
          total_failed: failed,
        })
        .eq("id", campaignId);
    })();
    // @ts-ignore
    (globalThis as any).EdgeRuntime?.waitUntil?.(bg);

    return j({ ok: true, campaignId, queued: contacts.length });
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
