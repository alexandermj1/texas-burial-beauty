// Daily 5pm PT summary email — sends a digest + CSV backup of customer data
// to alexandermaclarenjames@gmail.com from texascemeterybrokers@gmail.com
// via the Gmail connector gateway.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const FROM_EMAIL = "texascemeterybrokers@gmail.com";
const TO_EMAILS = [
  "alexandermaclarenjames@gmail.com",
  "simonjamesphd@gmail.com",
  "emmamaclaren@gmail.com",
];

function fmtDate(d: Date) {
  return d.toLocaleString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "full", timeStyle: "short" });
}
function csvEscape(v: any): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCSV(rows: any[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  return [cols.join(","), ...rows.map(r => cols.map(c => csvEscape(r[c])).join(","))].join("\n");
}
function b64url(s: string): string {
  // UTF-8 safe base64url
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_MAIL_API_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
    if (!GOOGLE_MAIL_API_KEY) throw new Error("GOOGLE_MAIL_API_KEY missing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Window: last 24h
    const now = new Date();
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sinceISO = since.toISOString();

    const [subsRes, activityRes, profilesRes, allSubsRes, allProfilesRes, notesRes, filesRes, quotesRes] = await Promise.all([
      supabase.from("contact_submissions").select("id,name,email,phone,source,cemetery,message,created_at,handled,pipeline_stage_override").gte("created_at", sinceISO).order("created_at", { ascending: false }),
      supabase.from("customer_activity_log").select("*").gte("created_at", sinceISO).order("created_at", { ascending: false }),
      supabase.from("customer_profiles").select("id,primary_name,primary_email,primary_phone,customer_kind,created_at").gte("created_at", sinceISO),
      supabase.from("contact_submissions").select("*"),
      supabase.from("customer_profiles").select("*"),
      supabase.from("customer_notes").select("*"),
      supabase.from("customer_files").select("*"),
      supabase.from("quote_estimates").select("*"),
    ]);

    const subs = subsRes.data ?? [];
    const activity = activityRes.data ?? [];
    const newProfiles = profilesRes.data ?? [];

    // Pipeline transitions from activity log
    const transitions = activity.filter((a: any) =>
      ["stage_changed", "pipeline_advanced", "stage_change", "pipeline"].some(k => (a.action_type || "").toLowerCase().includes(k))
        || /stage|pipeline/i.test(a.action_summary || "")
    );

    const inquiriesBySource: Record<string, number> = {};
    subs.forEach((s: any) => { inquiriesBySource[s.source || "unknown"] = (inquiriesBySource[s.source || "unknown"] || 0) + 1; });

    // Build HTML
    const html = `
<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;color:#222;">
  <h1 style="border-bottom:2px solid #6b8e5a;padding-bottom:8px;">Daily Summary — ${fmtDate(now)}</h1>
  <p>Activity for the last 24 hours.</p>

  <h2 style="color:#6b8e5a;">📊 Highlights</h2>
  <ul>
    <li><strong>${subs.length}</strong> new inquiries</li>
    <li><strong>${newProfiles.length}</strong> new customer profiles</li>
    <li><strong>${transitions.length}</strong> pipeline movements</li>
    <li><strong>${activity.length}</strong> total tracked actions</li>
  </ul>

  ${Object.keys(inquiriesBySource).length ? `
  <h3>Inquiries by source</h3>
  <ul>${Object.entries(inquiriesBySource).map(([k,v]) => `<li>${k}: ${v}</li>`).join("")}</ul>` : ""}

  <h2 style="color:#6b8e5a;">📥 New inquiries (${subs.length})</h2>
  ${subs.length ? `<table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse;width:100%;font-size:13px;">
    <tr style="background:#f0ede4;"><th>Time</th><th>Name</th><th>Source</th><th>Cemetery</th><th>Contact</th></tr>
    ${subs.map((s: any) => `<tr>
      <td>${new Date(s.created_at).toLocaleString("en-US",{timeZone:"America/Los_Angeles",hour:"numeric",minute:"2-digit",month:"short",day:"numeric"})}</td>
      <td>${s.name ?? "—"}</td>
      <td>${s.source ?? "—"}</td>
      <td>${s.cemetery ?? "—"}</td>
      <td>${s.email ?? ""}${s.email && s.phone ? "<br>" : ""}${s.phone ?? ""}</td>
    </tr>`).join("")}
  </table>` : "<p><em>No new inquiries.</em></p>"}

  <h2 style="color:#6b8e5a;">🔄 Pipeline movements (${transitions.length})</h2>
  ${transitions.length ? `<ul style="font-size:13px;">${transitions.map((t: any) => `<li><strong>${t.actor_name || "system"}:</strong> ${t.action_summary}</li>`).join("")}</ul>` : "<p><em>No pipeline movements.</em></p>"}

  <h2 style="color:#6b8e5a;">📝 All tracked actions (${activity.length})</h2>
  ${activity.length ? `<ul style="font-size:12px;color:#555;">${activity.slice(0, 50).map((a: any) => `<li>[${new Date(a.created_at).toLocaleTimeString("en-US",{timeZone:"America/Los_Angeles"})}] ${a.actor_name || "system"} — ${a.action_summary}</li>`).join("")}</ul>` : "<p><em>No actions logged.</em></p>"}

  <hr style="margin:32px 0;">
  <p style="font-size:12px;color:#888;">A complete CSV backup of customer data is attached. Generated automatically at 5:00 PM PT.</p>
</div>`.trim();

    // Build CSV backup ZIP-equivalent: single combined CSV per table, sent as 1 attachment per table joined into a multi-section text or a zip.
    // Simpler: ship one combined multi-section CSV as a single file.
    const backup = [
      `# customer_profiles (${(allProfilesRes.data ?? []).length})`,
      toCSV(allProfilesRes.data ?? []),
      "",
      `# contact_submissions (${(allSubsRes.data ?? []).length})`,
      toCSV(allSubsRes.data ?? []),
      "",
      `# customer_notes (${(notesRes.data ?? []).length})`,
      toCSV(notesRes.data ?? []),
      "",
      `# customer_files (${(filesRes.data ?? []).length})`,
      toCSV(filesRes.data ?? []),
      "",
      `# quote_estimates (${(quotesRes.data ?? []).length})`,
      toCSV(quotesRes.data ?? []),
      "",
      `# customer_activity_log (last 24h: ${activity.length})`,
      toCSV(activity),
    ].join("\n");

    const dateStamp = now.toISOString().slice(0, 10);
    const filename = `tcb-backup-${dateStamp}.csv`;

    // Build multipart MIME with attachment
    const boundary = "----=_Part_" + crypto.randomUUID();
    const subject = `Daily Summary ${dateStamp} — ${subs.length} inquiries, ${transitions.length} movements`;

    const csvB64 = btoa(unescape(encodeURIComponent(backup)));
    const csvLines = csvB64.match(/.{1,76}/g)?.join("\r\n") ?? csvB64;

    const mime = [
      `From: Texas Cemetery Brokers <${FROM_EMAIL}>`,
      `To: ${TO_EMAILS.join(", ")}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      html,
      ``,
      `--${boundary}`,
      `Content-Type: text/csv; name="${filename}"`,
      `Content-Disposition: attachment; filename="${filename}"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      csvLines,
      ``,
      `--${boundary}--`,
    ].join("\r\n");

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

    return new Response(JSON.stringify({
      ok: true,
      sent_to: TO_EMAIL,
      inquiries: subs.length,
      profiles: newProfiles.length,
      transitions: transitions.length,
      gmail_message_id: sendJson.id,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
