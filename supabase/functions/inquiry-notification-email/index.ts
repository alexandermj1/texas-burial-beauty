// Sends an instant email notification to the owners whenever a new
// customer inquiry / contact_submission is created.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const FROM_EMAIL = "texascemeterybrokers@gmail.com";
const TO_EMAILS = [
  "alexandermaclarenjames@gmail.com",
  "simonjamesphd@gmail.com",
  "emmamaclaren@gmail.com",
];

function b64url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function encodeSubject(s: string): string {
  if (/^[\x20-\x7E]*$/.test(s)) return s;
  const b = btoa(unescape(encodeURIComponent(s)));
  return `=?UTF-8?B?${b}?=`;
}
function esc(v: any): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function fmtDT(v: any): string {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString("en-US", {
      timeZone: "America/Los_Angeles",
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(v);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_MAIL_API_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
    if (!GOOGLE_MAIL_API_KEY) throw new Error("GOOGLE_MAIL_API_KEY missing");

    const body = await req.json().catch(() => ({}));
    const submissionId: string | undefined = body?.submission_id;
    let s: any = body?.submission;

    if (!s && submissionId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data, error } = await supabase
        .from("contact_submissions")
        .select("*")
        .eq("id", submissionId)
        .maybeSingle();
      if (error) throw new Error(`Lookup failed: ${error.message}`);
      s = data;
    }

    if (!s) throw new Error("No submission provided");

    // Region: matches the badge in the admin Submissions panel — Bayer only
    // when the inquiry channel is the Bayer "Sell a Plot" form; everything
    // else (including all website forms) is Texas. We deliberately ignore the
    // pipeline_region column because it defaults to 'bayer' in the database.
    const region: "Bayer" | "Texas" =
      s.inquiry_channel === "bayer_sell_a_plot" ? "Bayer" : "Texas";
    const regionColor = region === "Bayer" ? "#8b5e3c" : "#6b8e5a";

    // Curated key fields shown first
    const KEY_FIELDS: Array<[string, any]> = [
      ["Name", s.name],
      ["Email", s.email],
      ["Phone", s.phone],
      ["Region", region],
      ["Source", s.source],
      ["Inquiry channel", s.inquiry_channel],
      ["Cemetery", s.cemetery],
      ["Section", s.section],
      ["Lot", s.lot],
      ["Property type", s.property_type],
      ["Spaces", s.spaces],
      ["Asking price", s.asking_price],
      ["Budget", s.budget],
      ["Timeline", s.timeline],
      ["Deed owner", s.deed_owner],
      ["Relationship to owner", s.relationship_to_owner],
      ["City", s.city],
      ["State", s.state],
      ["Region/area", s.region],
      ["Preferred contact", s.preferred_contact],
      ["Message", s.message],
      ["Details", s.details],
      ["Notes", s.notes],
      ["Received", fmtDT(s.created_at)],
    ];
    const seenKeys = new Set([
      "name","email","phone","pipeline_region","source","inquiry_channel","cemetery","section","lot",
      "property_type","spaces","asking_price","budget","timeline","deed_owner","relationship_to_owner",
      "city","state","region","preferred_contact","message","details","notes","created_at",
      "id","updated_at","handled","pipeline_stage_override",
    ]);
    const extraFields: Array<[string, any]> = Object.entries(s)
      .filter(([k, v]) => !seenKeys.has(k) && v !== null && v !== undefined && v !== "" && typeof v !== "object")
      .map(([k, v]) => [k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), v]);

    const allFields = [...KEY_FIELDS, ...extraFields];
    const rows = allFields
      .filter(([_, v]) => v !== null && v !== undefined && v !== "")
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 10px;background:#f0ede4;font-weight:600;width:180px;vertical-align:top;">${esc(k)}</td><td style="padding:6px 10px;vertical-align:top;white-space:pre-wrap;">${esc(v)}</td></tr>`,
      )
      .join("");

    const headerName = s.name || s.email || "New lead";
    const cemeteryBit = s.cemetery ? ` — ${s.cemetery}` : "";
    const rawSubject = `Customer inquiry — ${region}: ${headerName}${cemeteryBit}`;
    const subject = encodeSubject(rawSubject);

    const adminUrl = `https://www.texascemeterybrokers.com/admin?submission=${encodeURIComponent(s.id ?? "")}`;

    const html = `
<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;color:#222;">
  <h1 style="border-bottom:2px solid ${regionColor};padding-bottom:8px;color:#3d4a2e;margin-bottom:4px;">Customer inquiry</h1>
  <p style="margin:6px 0 14px 0;"><span style="display:inline-block;background:${regionColor};color:#fff;font-weight:600;letter-spacing:0.06em;font-size:12px;padding:4px 10px;border-radius:999px;text-transform:uppercase;">${region}</span></p>
  <p style="color:#666;margin-top:0;">A new inquiry just came in.</p>
  <p style="margin:14px 0 18px 0;"><a href="${adminUrl}" style="display:inline-block;background:${regionColor};color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 18px;border-radius:8px;">Open in admin panel →</a></p>
  <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;font-size:14px;border:1px solid #ddd;">
    ${rows}
  </table>
  <p style="margin-top:24px;font-size:13px;"><a href="${adminUrl}" style="color:${regionColor};">View this inquiry in the admin panel</a></p>
  <p style="margin-top:8px;font-size:12px;color:#888;">You're receiving this because you're listed as an owner of Texas Cemetery Brokers.</p>
</div>`;

    const mime = [
      `From: Texas Cemetery Brokers <${FROM_EMAIL}>`,
      `To: ${TO_EMAILS.join(", ")}`,
      `Subject: ${subject}`,
      s.email ? `Reply-To: ${s.email}` : "",
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      btoa(unescape(encodeURIComponent(html))).match(/.{1,76}/g)?.join("\r\n") ?? "",
    ]
      .filter(Boolean)
      .join("\r\n");

    const raw = b64url(mime);

    const sendRes = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_MAIL_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });
    const sendJson = await sendRes.json();
    if (!sendRes.ok) {
      console.error("Gmail send failed", sendRes.status, sendJson);
      throw new Error(`Gmail send failed [${sendRes.status}]: ${JSON.stringify(sendJson)}`);
    }

    return new Response(
      JSON.stringify({ ok: true, sent_to: TO_EMAILS, gmail_message_id: sendJson.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
