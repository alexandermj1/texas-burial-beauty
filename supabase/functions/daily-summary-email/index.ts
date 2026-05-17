// Daily 5pm PT summary email — sends a digest + CSV backup of customer data
// to the owners' inboxes from texascemeterybrokers@gmail.com via the Gmail
// connector gateway.
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
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
// RFC 2047 encoded-word for non-ASCII subject lines (UTF-8 base64).
function encodeSubject(s: string): string {
  // If pure ASCII, send as-is
  if (/^[\x20-\x7E]*$/.test(s)) return s;
  const b = btoa(unescape(encodeURIComponent(s)));
  return `=?UTF-8?B?${b}?=`;
}
// Pretty actor name — strip emails / domains, take first name.
function prettyActor(raw: string | null | undefined): string {
  if (!raw) return "system";
  let s = String(raw).trim();
  if (s.includes("@")) s = s.split("@")[0];
  // split job-title separators
  s = s.split(/\s+[—–\-|/:]\s+/)[0];
  s = s.replace(/[._]+/g, " ").replace(/\s*\([^)]*\)\s*$/g, "").trim();
  // Capitalize first letter
  if (s.length) s = s.charAt(0).toUpperCase() + s.slice(1);
  return s || "system";
}
function plotDescriptor(s: any): string {
  const parts: string[] = [];
  if (s.property_type) parts.push(String(s.property_type));
  if (s.spaces) parts.push(`${s.spaces} ${Number(s.spaces) === 1 ? "space" : "spaces"}`);
  return parts.join(", ") || "—";
}
function fmtMoney(n: any): string {
  if (n == null || n === "") return "—";
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `$${v.toLocaleString("en-US")}`;
}
function sourceLabel(source: any): string {
  const raw = String(source ?? "").trim();
  const normalized = raw.toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "seller_quote") return "Form Submission";
  if (!raw) return "—";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function fmtShortDateTime(value: any): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit", month: "short", day: "numeric" });
}
function fmtTime(value: any): string {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" });
}
function quoteSentLabel(s: any): string {
  if (!s.quote_sent_at) return "No";
  const amount = s.quote_net_amount ?? s.quote_amount;
  return `Yes (${fmtShortDateTime(s.quote_sent_at)}${amount ? `, ${fmtMoney(amount)}` : ""})`;
}
function outcomeLabel(value: any): string {
  const normalized = String(value ?? "").toLowerCase();
  if (["accepted", "accept", "approved", "yes"].includes(normalized)) return "Accepted";
  if (["rejected", "reject", "declined", "decline", "no"].includes(normalized)) return "Rejected";
  return value ? String(value) : "—";
}
function isFinalQuoteOutcome(value: any): boolean {
  const normalized = String(value ?? "").toLowerCase();
  return ["accepted", "accept", "approved", "yes", "rejected", "reject", "declined", "decline", "no"].includes(normalized);
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

    // Sync the Gmail inbox first so any contact-form emails that arrived
    // since the last run are promoted to submissions and included in today's
    // digest. Non-fatal: a failure here shouldn't block the summary email.
    try {
      const syncUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/sync-inbox`;
      const syncRes = await fetch(syncUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ maxResults: 200 }),
      });
      console.log("Pre-summary sync-inbox status:", syncRes.status);
    } catch (e) {
      console.warn("Pre-summary sync-inbox failed (non-fatal):", e);
    }

    const now = new Date();
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sinceISO = since.toISOString();

    const [subsRes, activityRes, profilesRes, allSubsRes, allProfilesRes, notesRes, filesRes, quotesAllRes] = await Promise.all([
      supabase.from("contact_submissions").select("id,name,email,phone,source,cemetery,property_type,spaces,message,created_at,handled,pipeline_stage_override,quote_sent_at,quote_amount,quote_net_amount,quote_response,quote_responded_at,closed_at,closed_outcome,listing_live_at,listing_url,listing_number").gte("created_at", sinceISO).order("created_at", { ascending: false }),
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
    const allSubs = allSubsRes.data ?? [];
    const subsById: Record<string, any> = {};
    allSubs.forEach((s: any) => { subsById[s.id] = s; });

    // Stage transitions from activity log are the source of truth (pipeline uses pipeline_stage_override)
    const transitions = activity.filter((a: any) =>
      ["stage_changed", "pipeline_advanced", "stage_change", "pipeline"].some(k => (a.action_type || "").toLowerCase().includes(k))
        || /stage|pipeline|moved/i.test(a.action_summary || "")
    );

    // Helper: latest stage_changed event per submission with destination stage matching predicate
    function transitionsTo(predicate: (toStage: string) => boolean) {
      const seen = new Set<string>();
      const out: any[] = [];
      // activity is already sorted desc; take the most recent transition per submission
      for (const t of transitions) {
        const to = String(t.details?.to ?? "").toLowerCase();
        if (!predicate(to)) continue;
        const sid = t.submission_id;
        if (!sid || seen.has(sid)) continue;
        seen.add(sid);
        const sub = subsById[sid] ?? {};
        out.push({ ...sub, ...t, _to: to, _at: t.created_at });
      }
      return out;
    }

    const listingsLive = transitionsTo((to) => to === "listing_live");
    const listingsCompleted = transitionsTo((to) => to === "listing_completed" || to === "closed" || to === "completed");
    const quotesSent = transitionsTo((to) => to === "quote_issued" || to === "quote_sent");
    const quotesSentSubIds = new Set(quotesSent.map((q: any) => q.submission_id));
    const quoteOutcomes = transitionsTo((to) => ["quote_accepted", "accepted", "quote_declined", "declined", "rejected", "morgued"].includes(to));

    const inquiriesBySource: Record<string, number> = {};
    subs.forEach((s: any) => {
      const label = sourceLabel(s.source || "unknown");
      inquiriesBySource[label] = (inquiriesBySource[label] || 0) + 1;
    });

    const dateStamp = now.toISOString().slice(0, 10);

    const html = `
<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;color:#222;">
  <h1 style="border-bottom:2px solid #6b8e5a;padding-bottom:8px;">Daily Summary &mdash; ${fmtDate(now)}</h1>
  <p>Activity for the last 24 hours.</p>

  <h2 style="color:#6b8e5a;">Highlights</h2>
  <ul>
    <li><strong>${subs.length}</strong> new inquiries</li>
    <li><strong>${quotesSent.length}</strong> quotes sent</li>
    <li><strong>${listingsLive.length}</strong> listings went live</li>
    <li><strong>${listingsCompleted.length}</strong> listings completed</li>
    <li><strong>${quoteOutcomes.length}</strong> quotes accepted/rejected</li>
    <li><strong>${newProfiles.length}</strong> new customer profiles</li>
    <li><strong>${transitions.length}</strong> pipeline movements</li>
    <li><strong>${activity.length}</strong> total tracked actions</li>
  </ul>

  ${Object.keys(inquiriesBySource).length ? `
  <h3>Inquiries by source</h3>
  <ul>${Object.entries(inquiriesBySource).map(([k,v]) => `<li>${k}: ${v}</li>`).join("")}</ul>` : ""}

  <h2 style="color:#6b8e5a;">New inquiries (${subs.length})</h2>
  ${subs.length ? `<table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse;width:100%;font-size:13px;">
    <tr style="background:#f0ede4;"><th>Time</th><th>Name</th><th>Source</th><th>Cemetery</th><th>Plot type</th><th>Quote sent?</th><th>Contact</th></tr>
    ${subs.map((s: any) => {
      const quoteSentToday = quotesSentSubIds.has(s.id);
      const quoteCell = s.quote_sent_at ? quoteSentLabel(s) : (quoteSentToday ? "Yes (today)" : "No");
      return `<tr>
      <td>${fmtShortDateTime(s.created_at)}</td>
      <td>${s.name ?? "—"}</td>
      <td>${sourceLabel(s.source)}</td>
      <td>${s.cemetery ?? "—"}</td>
      <td>${plotDescriptor(s)}</td>
      <td>${quoteCell}</td>
      <td>${s.email ?? ""}${s.email && s.phone ? "<br>" : ""}${s.phone ?? ""}</td>
    </tr>`;
    }).join("")}
  </table>` : "<p><em>No new inquiries.</em></p>"}

  <h2 style="color:#6b8e5a;">Quotes sent today (${quotesSent.length})</h2>
  ${quotesSent.length ? `<table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse;width:100%;font-size:13px;">
    <tr style="background:#f0ede4;"><th>Time</th><th>Name</th><th>Cemetery</th><th>Plot type</th><th>Quote amount</th><th>Contact</th></tr>
    ${quotesSent.map((q: any) => `<tr>
      <td>${fmtShortDateTime(q._at)}</td>
      <td>${q.name ?? "—"}</td>
      <td>${q.cemetery ?? "—"}</td>
      <td>${plotDescriptor(q)}</td>
      <td>${fmtMoney(q.quote_net_amount ?? q.quote_amount)}</td>
      <td>${q.email ?? ""}${q.email && q.phone ? "<br>" : ""}${q.phone ?? ""}</td>
    </tr>`).join("")}
  </table>` : "<p><em>No quotes were sent today.</em></p>"}

  <h2 style="color:#6b8e5a;">Listings live or completed today (${listingsLive.length + listingsCompleted.length})</h2>
  ${listingsLive.length || listingsCompleted.length ? `<table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse;width:100%;font-size:13px;">
    <tr style="background:#f0ede4;"><th>Time</th><th>Status</th><th>Name</th><th>Cemetery</th><th>Plot type</th><th>Listing</th><th>Contact</th></tr>
    ${[
      ...listingsLive.map((l: any) => ({ ...l, summary_status: "Went live" })),
      ...listingsCompleted.map((l: any) => ({ ...l, summary_status: outcomeLabel(l.closed_outcome) === "—" ? "Completed" : `Completed: ${outcomeLabel(l.closed_outcome)}` })),
    ].sort((a: any, b: any) => new Date(b._at).getTime() - new Date(a._at).getTime()).map((l: any) => `<tr>
      <td>${fmtShortDateTime(l._at)}</td>
      <td>${l.summary_status}</td>
      <td>${l.name ?? "—"}</td>
      <td>${l.cemetery ?? "—"}</td>
      <td>${plotDescriptor(l)}</td>
      <td>${l.listing_url ? `<a href="${l.listing_url}">${l.listing_number || "Open listing"}</a>` : (l.listing_number ?? "—")}</td>
      <td>${l.email ?? ""}${l.email && l.phone ? "<br>" : ""}${l.phone ?? ""}</td>
    </tr>`).join("")}
  </table>` : "<p><em>No listings went live or completed today.</em></p>"}

  <h2 style="color:#6b8e5a;">Quotes accepted or rejected today (${quoteOutcomes.length})</h2>
  ${quoteOutcomes.length ? `<table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse;width:100%;font-size:13px;">
    <tr style="background:#f0ede4;"><th>Time</th><th>Name</th><th>Outcome</th><th>Cemetery</th><th>Plot type</th><th>Quote amount</th><th>Contact</th></tr>
    ${quoteOutcomes.map((q: any) => {
      const outcome = (q._to === "quote_accepted" || q._to === "accepted") ? "Accepted" : "Rejected";
      return `<tr>
      <td>${fmtShortDateTime(q._at)}</td>
      <td>${q.name ?? "—"}</td>
      <td>${outcome}</td>
      <td>${q.cemetery ?? "—"}</td>
      <td>${plotDescriptor(q)}</td>
      <td>${fmtMoney(q.quote_net_amount ?? q.quote_amount)}</td>
      <td>${q.email ?? ""}${q.email && q.phone ? "<br>" : ""}${q.phone ?? ""}</td>
    </tr>`;
    }).join("")}
  </table>` : "<p><em>No quotes were accepted or rejected today.</em></p>"}

  <h2 style="color:#6b8e5a;">Pipeline movements (${transitions.length})</h2>
  ${transitions.length ? `<ul style="font-size:13px;">${transitions.map((t: any) => `<li><strong>${prettyActor(t.actor_name)}:</strong> ${t.action_summary}</li>`).join("")}</ul>` : "<p><em>No pipeline movements.</em></p>"}

  <h2 style="color:#6b8e5a;">All tracked actions (${activity.length})</h2>
  ${activity.length ? `<ul style="font-size:12px;color:#555;">${activity.slice(0, 80).map((a: any) => `<li>[${fmtTime(a.created_at)}] <strong>${prettyActor(a.actor_name)}</strong> &mdash; ${a.action_summary}</li>`).join("")}</ul>` : "<p><em>No actions logged.</em></p>"}

  <hr style="margin:32px 0;">
  <p style="font-size:12px;color:#888;">A complete CSV backup of customer data is attached. Generated automatically at 5:00 PM PT.</p>
</div>`.trim();

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
      `# quote_estimates (${(quotesAllRes.data ?? []).length})`,
      toCSV(quotesAllRes.data ?? []),
      "",
      `# customer_activity_log (last 24h: ${activity.length})`,
      toCSV(activity),
    ].join("\n");

    const filename = `tcb-backup-${dateStamp}.csv`;
    const boundary = "----=_Part_" + crypto.randomUUID();
    const rawSubject = `Daily Summary ${dateStamp} - ${subs.length} inquiries, ${quoteOutcomes.length} quote outcomes, ${listingsLive.length + listingsCompleted.length} listings, ${transitions.length} movements`;
    const subject = encodeSubject(rawSubject);

    const csvB64 = btoa(unescape(encodeURIComponent(backup)));
    const csvLines = csvB64.match(/.{1,76}/g)?.join("\r\n") ?? csvB64;
    const htmlB64 = btoa(unescape(encodeURIComponent(html)));
    const htmlLines = htmlB64.match(/.{1,76}/g)?.join("\r\n") ?? htmlB64;

    const mime = [
      `From: Texas Cemetery Brokers <${FROM_EMAIL}>`,
      `To: ${TO_EMAILS.join(", ")}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      htmlLines,
      ``,
      `--${boundary}`,
      `Content-Type: text/csv; charset="UTF-8"; name="${filename}"`,
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
      sent_to: TO_EMAILS,
      inquiries: subs.length,
      quote_outcomes: quoteOutcomes.length,
      listings: listingsLive.length + listingsCompleted.length,
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
