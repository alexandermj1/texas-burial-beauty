// Receives Resend webhook events (email.bounced, email.complained, email.opened,
// email.clicked, email.delivered) and updates marketing_sends + marketing_contacts.
// Paste this function's public URL into Resend → Webhooks after deploy.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  try {
    const payload = await req.json();
    const type: string = payload?.type || "";
    const data = payload?.data || {};
    const emailId: string | undefined = data?.email_id || data?.id;
    const toArr: string[] = Array.isArray(data?.to) ? data.to : [];
    const email = toArr[0]?.toLowerCase();
    const ts = new Date().toISOString();

    const patch: Record<string, unknown> = {};
    let contactPatch: Record<string, unknown> = {};
    let campaignField: string | null = null;
    if (type === "email.opened") { patch.opened_at = ts; campaignField = "total_opened"; }
    else if (type === "email.clicked") { patch.clicked_at = ts; campaignField = "total_clicked"; }
    else if (type === "email.bounced") {
      patch.bounced_at = ts; patch.status = "bounced"; campaignField = "total_bounced";
      contactPatch.bounced_at = ts;
    } else if (type === "email.complained") {
      patch.complained_at = ts; patch.status = "complained"; campaignField = "total_unsubscribed";
      contactPatch.complained_at = ts; contactPatch.unsubscribed_at = ts;
    } else if (type === "email.delivered") {
      // no-op, already recorded as sent
      return new Response("ok");
    } else {
      return new Response("ignored");
    }

    let campaignId: string | null = null;
    if (emailId) {
      const { data: send } = await admin
        .from("marketing_sends")
        .select("id,campaign_id,contact_id")
        .eq("resend_email_id", emailId)
        .maybeSingle();
      if (send) {
        campaignId = send.campaign_id;
        await admin.from("marketing_sends").update(patch).eq("id", send.id);
        if (send.contact_id && Object.keys(contactPatch).length) {
          await admin.from("marketing_contacts").update(contactPatch).eq("id", send.contact_id);
        }
      }
    }
    if (!campaignId && email) {
      // Fallback: match by tag on the payload if Resend sent tags.
      const tags = data?.tags || [];
      for (const t of tags) if (t?.name === "campaign_id") campaignId = t.value;
      if (campaignId) {
        await admin
          .from("marketing_sends")
          .update(patch)
          .eq("campaign_id", campaignId)
          .ilike("email", email);
        if (Object.keys(contactPatch).length) {
          const { data: send2 } = await admin
            .from("marketing_sends")
            .select("brand")
            .eq("campaign_id", campaignId)
            .maybeSingle();
          if (send2) {
            await admin
              .from("marketing_contacts")
              .update(contactPatch)
              .eq("brand", send2.brand)
              .ilike("email", email);
          }
        }
      }
    }
    if (campaignId && campaignField) {
      // Increment the aggregate counter atomically-ish.
      const { data: camp } = await admin
        .from("marketing_campaigns")
        .select(campaignField)
        .eq("id", campaignId)
        .maybeSingle();
      if (camp) {
        const current = Number((camp as any)[campaignField] ?? 0);
        await admin
          .from("marketing_campaigns")
          .update({ [campaignField]: current + 1 })
          .eq("id", campaignId);
      }
    }
    return new Response("ok", { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as any)?.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
