// Daily 5pm (Texas time) team briefing: what the Seller AI, Buyer AI and each
// team member worked on today, what came in, and what is coming up. Written by
// an AI model from the day's saved records and the previous briefing, so each
// day reads as a continuation. Sent from the company Gmail via the connector.
import { corsHeaders } from "npm:@supabase/supabase-js@2.119.0/cors";
import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import { generateMessage } from "npm:@lovable.dev/ai-gateway@0.1.11";
import { isInternalCall } from "../_shared/internal-auth.ts";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const FROM = "texascemeterybrokers@gmail.com";
const TEAM = ["alexandermaclarenjames@gmail.com", "simonjamesphd@gmail.com", "emmamaclaren@gmail.com"];
const TZ = "America/Chicago";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function tzOffsetMin(at: Date) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "shortOffset" }).formatToParts(at).find((x) => x.type === "timeZoneName")?.value ?? "GMT-6";
  const m = p.match(/GMT([+-]\d+)(?::(\d+))?/); return m ? Number(m[1]) * 60 + Math.sign(Number(m[1])) * Number(m[2] ?? 0) : -360;
}
function localDate(at: Date) { return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(at); }
function localHour(at: Date) { return Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }).format(at)); }
function dayBounds(d: string) {
  const guess = new Date(`${d}T12:00:00Z`); const off = tzOffsetMin(guess);
  const start = new Date(Date.parse(`${d}T00:00:00Z`) - off * 60000);
  return { start: start.toISOString(), end: new Date(start.getTime() + 86400000).toISOString() };
}
const t = (v: unknown, n = 220) => String(v ?? "").replace(/\s+/g, " ").replace(/https?:\/\/\S+/g, "[link]").trim().slice(0, n);
const time = (v: string) => new Date(v).toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
const OURS = /texascemeterybrokers|bayercemeterybrokers|bayerbrokers/i;

async function gather(day: string) {
  const { start, end } = dayBounds(day);
  const [subsAll, act, emails, actions, buyerDrafts, notes, pays, flags, memory, prev] = await Promise.all([
    db.from("contact_submissions").select("id,name,source,cemetery,created_at,archived_at").limit(10000),
    db.from("customer_activity_log").select("submission_id,actor_name,action_type,action_summary,created_at").is("deleted_at", null).gte("created_at", start).lt("created_at", end).order("created_at").limit(1500),
    db.from("email_messages").select("matched_submission_id,from_email,from_name,to_email,subject,snippet,received_at").is("deleted_at", null).gte("received_at", start).lt("received_at", end).order("received_at").limit(800),
    db.from("ai_agent_actions").select("submission_id,action_type,status,reason,email_subject,decided_by_name,executed_at,created_at,payload").is("deleted_at", null).or(`and(executed_at.gte.${start},executed_at.lt.${end}),and(created_at.gte.${start},created_at.lt.${end})`).limit(800),
    db.from("buyer_ai_drafts").select("submission_id,status,subject,reason,decided_by_name,updated_at").is("deleted_at", null).gte("updated_at", start).lt("updated_at", end).limit(300),
    db.from("customer_notes").select("submission_id,author_name,body,created_at").is("deleted_at", null).gte("created_at", start).lt("created_at", end).limit(300),
    db.from("payment_transactions").select("submission_id,kind,description,amount_cents,status,environment,paid_at,recipient_name").is("deleted_at", null).gte("paid_at", start).lt("paid_at", end).limit(100),
    db.from("ai_agent_actions").select("submission_id,payload,reason,created_at").eq("action_type", "flag_human").eq("status", "proposed").is("deleted_at", null).limit(400),
    db.from("ai_record_memory").select("submission_id,waiting_for,next_if_silent,due_at").gte("due_at", end).lt("due_at", new Date(Date.parse(end) + 3 * 86400000).toISOString()).limit(200),
    db.from("daily_briefings").select("briefing_date,summary_text").lt("briefing_date", day).order("briefing_date", { ascending: false }).limit(1),
  ]);
  const names: Record<string, any> = {}; (subsAll.data ?? []).forEach((s: any) => names[s.id] = s);
  const who = (id?: string | null) => id && names[id] ? `${names[id].name}${names[id].cemetery ? ` (${t(names[id].cemetery, 50)})` : ""}` : "unmatched";
  const L: string[] = [];
  const newSubs = (subsAll.data ?? []).filter((s: any) => s.created_at >= start && s.created_at < end);
  L.push(`## New enquiries today (${newSubs.length})`); newSubs.forEach((s: any) => L.push(`- ${s.name} · ${s.source} · ${t(s.cemetery, 60)}`));
  const inbound = (emails.data ?? []).filter((e: any) => !OURS.test(e.from_email ?? ""));
  L.push(`## Customer emails received (${inbound.length})`); inbound.slice(0, 120).forEach((e: any) => L.push(`- ${time(e.received_at)} ${who(e.matched_submission_id)} — "${t(e.subject, 80)}": ${t(e.snippet, 160)}`));
  L.push(`## Team & automation activity log`);
  const grouped: Record<string, string[]> = {};
  (act.data ?? []).forEach((a: any) => { const k = a.actor_name || "System"; (grouped[k] ??= []).push(`${time(a.created_at)} ${a.action_type} · ${who(a.submission_id)} · ${t(a.action_summary, 160)}`); });
  for (const [k, rows] of Object.entries(grouped)) { L.push(`### ${k} (${rows.length})`); rows.slice(0, 60).forEach((r) => L.push(`- ${r}`)); }
  L.push(`## Seller AI actions`);
  (actions.data ?? []).forEach((a: any) => L.push(`- ${a.status} ${a.action_type} · ${who(a.submission_id)} · ${a.decided_by_name ?? "AI"} · ${t(a.email_subject ?? a.payload?.task ?? a.reason, 170)}`));
  L.push(`## Buyer AI drafts/replies`); (buyerDrafts.data ?? []).forEach((d: any) => L.push(`- ${d.status} · ${who(d.submission_id)} · ${t(d.subject, 80)} · ${t(d.reason, 120)}`));
  L.push(`## Staff notes`); (notes.data ?? []).forEach((n: any) => L.push(`- ${n.author_name}: ${who(n.submission_id)} — ${t(n.body, 200)}`));
  L.push(`## Payments`); (pays.data ?? []).forEach((p: any) => L.push(`- ${p.status} ${p.environment} ${p.kind} $${(p.amount_cents ?? 0) / 100} · ${who(p.submission_id)} · ${t(p.description, 80)}`));
  const openFlags = (flags.data ?? []).filter((f: any) => !names[f.submission_id]?.archived_at);
  const quoteFlags = openFlags.filter((f: any) => /quote needed/i.test(f.payload?.task ?? ""));
  L.push(`## Open staff-needed tasks (${openFlags.length}; ${quoteFlags.length} are routine quote-needed)`);
  openFlags.filter((f: any) => !quoteFlags.includes(f)).slice(0, 40).forEach((f: any) => L.push(`- [${f.payload?.priority ?? "normal"}] ${who(f.submission_id)} — ${t(f.payload?.task ?? f.reason, 170)}`));
  L.push(`## AI check-ins scheduled in the next 3 days`); (memory.data ?? []).slice(0, 40).forEach((m: any) => L.push(`- ${who(m.submission_id)} — waiting for: ${t(m.waiting_for, 120)}; if silent: ${t(m.next_if_silent, 100)}`));
  const previous = prev.data?.[0];
  return { text: L.join("\n").slice(0, 90000), previous, stats: { new_enquiries: newSubs.length, inbound_emails: inbound.length, activity: (act.data ?? []).length, ai_actions: (actions.data ?? []).length, open_tasks: openFlags.length } };
}

const SYSTEM = `You write the end-of-day internal briefing email for Texas Cemetery Brokers (a cemetery plot brokerage). Readers: Alexander (owner), Simon, Emma. Team members include Cici and Susie (staff), Simon James and Alexander Maclaren James (owners); "Seller AI"/"AI autopilot"/"AI agent" is the seller assistant, "Buyer AI" handles buyers, "Automatic follow-up" is scheduled reminders. Customers' own actions (e.g. confirming ownership, uploading files) appear in the log under the customer's name.
Use ONLY the facts supplied. Never invent events, prices, names or outcomes. If a section has nothing, say "Nothing today." Plain, warm, concise company English. Use customer names so people can find records.
Where the previous briefing mentioned something and today's data shows progress on the same person (e.g. they sent documents we asked for), say so explicitly ("Carol sent the documents referenced yesterday").
Output ONLY an HTML fragment (no <html>/<body>, no styles, no scripts) using <h2>, <h3>, <p>, <ul>, <li>, <strong>. Sections in this order:
<h2>At a glance</h2> 3-6 bullets: the most important things today, good and bad.
<h2>Needs attention</h2> high-importance items, problems, errors, unhappy customers, unanswered urgent emails.
<h2>Progress since yesterday</h2> follow-ups on yesterday's briefing.
<h2>What came in</h2> new sellers, new buyers, customer emails/uploads — and how each was dealt with.
<h2>Seller AI</h2> what it reviewed, emails sent, actions taken, flags raised.
<h2>Buyer AI</h2> replies and drafts.
<h2>Team</h2> one <h3> per person who did something (Cici, Simon, Alexander, Susie...) with bullets of what they did.
<h2>Coming up</h2> scheduled check-ins, open staff tasks (summarise routine quote-needed tasks as a count), things to watch.
Finally, after the HTML, on a new line write "===CARRY===" followed by 5-12 short plain-text lines of the key open threads (names + what we are waiting for), which will be given to tomorrow's briefing.`;

function render(day: string, body: string, practice: boolean) {
  const nice = new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  const styled = body.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/ on\w+="[^"]*"/gi, "")
    .replace(/<h2>/g, '<h2 style="font-family:Georgia,serif;color:#457358;font-size:19px;margin:26px 0 8px;border-bottom:1px solid #E4DBCD;padding-bottom:6px;">')
    .replace(/<h3>/g, '<h3 style="color:#C97B5E;font-size:15px;margin:14px 0 4px;">').replace(/<li>/g, '<li style="margin:4px 0;line-height:1.5;">').replace(/<p>/g, '<p style="line-height:1.55;">');
  return `<div style="background:#ffffff;padding:16px;"><div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;color:#2E251F;">
<div style="background:#FAF8F5;border-radius:10px;padding:18px 20px;border:1px solid #E4DBCD;"><div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#7E7167;">Texas Cemetery Brokers · Daily briefing${practice ? " · practice copy" : ""}</div>
<div style="font-family:Georgia,serif;font-size:24px;margin-top:4px;">${nice}</div></div>${styled}
<p style="font-size:12px;color:#7E7167;margin-top:28px;">Written automatically at 5pm Texas time from today's records. Check the admin dashboard before acting on anything important.</p></div></div>`;
}

async function sendGmail(to: string[], subject: string, html: string) {
  const b64 = (s: string) => { const by = new TextEncoder().encode(s); let bin = ""; by.forEach((b) => bin += String.fromCharCode(b)); return btoa(bin); };
  const mime = [`From: Texas Cemetery Brokers <${FROM}>`, `To: ${to.join(", ")}`, `Subject: =?UTF-8?B?${b64(subject)}?=`, "MIME-Version: 1.0", 'Content-Type: text/html; charset="UTF-8"', "Content-Transfer-Encoding: base64", "", b64(html).replace(/(.{76})/g, "$1\r\n")].join("\r\n");
  const raw = b64(mime).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const r = await fetch(`${GATEWAY_URL}/users/me/messages/send`, { method: "POST", headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`, "X-Connection-Api-Key": Deno.env.get("GOOGLE_MAIL_API_KEY")!, "Content-Type": "application/json" }, body: JSON.stringify({ raw }) });
  if (!r.ok) throw new Error(`Gmail send failed ${r.status}: ${(await r.text()).slice(0, 300)}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const body = await req.json().catch(() => ({})) as { date?: string; to?: string[]; force?: boolean };
  const { data: job } = await db.from("automation_job_state").select("trigger_secret").eq("job_name", "daily-briefing").maybeSingle();
  const scheduled = !!job?.trigger_secret && req.headers.get("x-automation-secret") === job.trigger_secret;
  if (!scheduled && !isInternalCall(req)) return json({ error: "Not allowed" }, 403);
  const now = new Date();
  // Cron fires at 22:00 and 23:00 UTC; only the run that lands on 5pm Texas time sends.
  if (scheduled && !body.force && localHour(now) !== 17) return json({ skipped: "not 5pm in Texas" });
  const day = body.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : localDate(now);
  const practice = !!body.to?.length;
  const to = practice ? body.to!.filter((e) => TEAM.includes(e)) : TEAM;
  if (!to.length) return json({ error: "Recipients must be team addresses" }, 400);
  if (!practice) {
    const { data: done } = await db.from("daily_briefings").select("id").eq("briefing_date", day).eq("is_practice", false).limit(1);
    if (done?.length && !body.force) return json({ skipped: "already sent" });
  }
  try {
    const g = await gather(day);
    const input = `Briefing date: ${day}\n\nPREVIOUS BRIEFING CARRY-OVER (${g.previous?.briefing_date ?? "none"}):\n${g.previous?.summary_text ?? "None — this is the first briefing."}\n\nTODAY'S RECORDS:\n${g.text}`;
    const res: any = await generateMessage({ model: "anthropic/claude-sonnet-5", system: SYSTEM, max_tokens: 12000, messages: [{ role: "user", content: input }] } as any);
    const out = (res.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
    const [htmlPart, carry = ""] = out.split("===CARRY===");
    const html = render(day, htmlPart.replace(/```html|```/g, "").trim(), practice);
    const nice = new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
    await sendGmail(to, `Daily briefing — ${nice}${practice ? " (practice)" : ""}`, html);
    await db.from("daily_briefings").insert({ briefing_date: day, recipients: to, is_practice: practice, summary_text: (carry.trim() || htmlPart.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).slice(0, 6000), html, stats: g.stats });
    return json({ ok: true, day, to, stats: g.stats });
  } catch (e) {
    console.error(e); return json({ ok: false, error: String((e as Error)?.message ?? e) }, 500);
  }
});
