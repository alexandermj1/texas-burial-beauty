// Seller autopilot — runs every 10 minutes (and on "Run now" from the admin page).
//  1) Sends AI replies whose natural delay has passed (re-checking the file first).
//  2) Wakes records that have a new seller email or whose check-back is due, and decides
//     with NO AI how much to re-read: nothing, a quick catch-up from the AI's own note,
//     or a full review (new files/payments/contracts/paperwork, a lot changed, a suspected problem).
// Guards: owner switch, single-flight lease, small batches, daily review cap, per-seller
// email cap, quiet hours, and a circuit breaker that pauses on 402/403/repeated 429.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { isInternalCall } from "../_shared/internal-auth.ts";
import { recordFingerprint } from "../_shared/recordFingerprint.ts";
import { routeWake, replySendAt, inConversation, isQuietTime, MAX_REMINDERS } from "../_shared/autopilotPolicy.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-automation-secret" };
const JOB = "seller-autopilot";
const URL_ = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(URL_, KEY);
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const MAX_REVIEWS_PER_RUN = 4, MAX_SENDS_PER_RUN = 5, MAX_EMAILS_PER_SELLER_DAY = 3;

async function settings() {
  const { data } = await db.from("ai_agent_settings").select("value").eq("key", "seller_autopilot").maybeSingle();
  const v = (data?.value ?? {}) as any;
  return { mode: (["off", "selected", "all"].includes(v.mode) ? v.mode : "off") as "off" | "selected" | "all", dailyReviews: Math.min(200, Math.max(1, Number(v.daily_reviews) || 40)) };
}
async function pause(reason: string) {
  await db.from("automation_job_state").update({ status: "paused", pause_reason: reason, updated_at: new Date().toISOString() }).eq("job_name", JOB);
}
const isSeller = (s: any) => !/buyer|general|partner/i.test(String(s.customer_kind ?? ""));
const eligible = (s: any, mode: string) => s && !s.deleted_at && !s.archived_at && !s.closed_at && !s.sold_at && !s.ai_paused_at && isSeller(s) && (mode === "all" || s.ai_autopilot);

async function humanOpen(sid: string) {
  const { count } = await db.from("ai_agent_actions").select("id", { count: "exact", head: true }).eq("submission_id", sid).eq("status", "proposed").eq("action_type", "flag_human").is("deleted_at", null);
  return (count ?? 0) > 0;
}
async function emailsToday(sid: string) {
  const since = new Date(Date.now() - 86400_000).toISOString();
  const { count } = await db.from("ai_outbox").select("id", { count: "exact", head: true }).eq("submission_id", sid).eq("status", "sent").gte("sent_at", since);
  return count ?? 0;
}
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");

/** Phase 1 — send held replies that are due, if the file still supports them. */
async function sendDue(mode: string) {
  const out: any[] = [];
  if (isQuietTime(Date.now())) return out;
  const { data: due } = await db.from("ai_outbox").select("*").eq("status", "held").lte("send_at", new Date().toISOString()).order("send_at").limit(MAX_SENDS_PER_RUN);
  for (const o of due ?? []) {
    const cancel = async (why: string) => { await db.from("ai_outbox").update({ status: "cancelled", status_reason: why }).eq("id", o.id); out.push({ id: o.id, cancelled: why }); };
    const { data: act } = await db.from("ai_agent_actions").select("*").eq("id", o.action_id).maybeSingle();
    const { data: sub } = await db.from("contact_submissions").select("*").eq("id", o.submission_id).maybeSingle();
    if (!act || act.status !== "proposed") { await cancel("Suggestion already handled or replaced"); continue; }
    if (!eligible(sub, mode)) { await cancel("Record no longer on autopilot"); continue; }
    const { data: newer } = await db.from("email_messages").select("id,from_email").eq("matched_submission_id", o.submission_id).is("deleted_at", null).gt("received_at", act.created_at).limit(5);
    if ((newer ?? []).some((e) => !/texascemeterybrokers/i.test(e.from_email ?? ""))) { await cancel("Seller wrote again — a fresh reply will be drafted"); continue; }
    if ((newer ?? []).length) { await cancel("Our team already emailed since this was drafted"); continue; }
    if (await humanOpen(o.submission_id)) { await cancel("A person is handling this record"); continue; }
    if (await emailsToday(o.submission_id) >= MAX_EMAILS_PER_SELLER_DAY) { await db.from("ai_outbox").update({ send_at: new Date(Date.now() + 86400_000).toISOString() }).eq("id", o.id); continue; }
    const res = await fetch(`${URL_}/functions/v1/gmail-action`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}`, apikey: KEY },
      body: JSON.stringify({ action: "send", to: sub.email, subject: act.email_subject || "Your cemetery property", body: act.email_body,
        htmlBody: `<div data-tcb-email="ai_agent" style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#2d2a26;">${esc(act.email_body ?? "")}</div>`,
        ...(act.gmail_thread_id ? { threadId: act.gmail_thread_id } : {}), submissionId: sub.id, actorName: "AI agent (autopilot)" }),
    });
    const text = await res.text();
    if (!res.ok || /"error"/.test(text)) {
      await db.from("ai_outbox").update({ status: "failed", status_reason: `Email failed (${res.status}): ${text.slice(0, 200)}` }).eq("id", o.id);
      if ([401, 402, 403, 429].includes(res.status)) await pause(`Email sending blocked (${res.status}).`);
      out.push({ id: o.id, failed: res.status }); continue;
    }
    const now = new Date().toISOString();
    await db.from("ai_outbox").update({ status: "sent", sent_at: now }).eq("id", o.id);
    await db.from("ai_agent_actions").update({ status: "executed", decided_by_name: "AI autopilot", decided_at: now, executed_at: now }).eq("id", act.id);
    await db.from("customer_notes").insert({ submission_id: sub.id, customer_profile_id: sub.customer_profile_id, body: `Emailed ${String(sub.name ?? "the seller").split(" ")[0]}: ${act.reason}`, author_name: "AI agent (autopilot)" });
    // Remember the file as it is now (our email is part of it) so the next visit doesn't treat it as new.
    const { data: mem } = await db.from("ai_record_memory").select("reminder_count,last_route").eq("submission_id", sub.id).maybeSingle();
    const { data: fresh } = await db.from("contact_submissions").select("*").eq("id", sub.id).maybeSingle();
    await db.from("ai_record_memory").update({ fingerprint: await recordFingerprint(db, fresh ?? sub), reminder_count: (mem?.reminder_count ?? 0) + (mem?.last_route === "checkback" ? 1 : 0) }).eq("submission_id", sub.id);
    out.push({ id: o.id, sent: true });
  }
  return out;
}

async function callAgent(body: Record<string, unknown>) {
  const res = await fetch(`${URL_}/functions/v1/seller-agent`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}`, apikey: KEY }, body: JSON.stringify({ action: "autopilot_review", ...body }) });
  return { status: res.status, body: await res.json().catch(() => ({})) as any };
}

/** After an autopilot review: hold its reply with a natural delay when nothing else needs a person first. */
async function queueReply(sub: any, runId: string) {
  const { data: acts } = await db.from("ai_agent_actions").select("id,action_type,email_body,created_at").eq("run_id", runId).eq("status", "proposed");
  const reply = (acts ?? []).find((a) => a.action_type === "reply_email");
  if (!reply) return null;
  const others = (acts ?? []).filter((a) => a.id !== reply.id && a.action_type !== "add_note");
  if (others.length) return { held_for_staff: others.map((a) => a.action_type) };
  const { data: mail } = await db.from("email_messages").select("from_email,received_at").eq("matched_submission_id", sub.id).is("deleted_at", null).order("received_at", { ascending: false }).limit(10);
  const seller = (mail ?? []).find((m) => !/texascemeterybrokers/i.test(m.from_email ?? ""));
  const oursBefore = seller ? (mail ?? []).find((m) => /texascemeterybrokers/i.test(m.from_email ?? "") && m.received_at <= seller.received_at) : null;
  const words = String(reply.email_body ?? "").split(/\s+/).filter(Boolean).length;
  const at = replySendAt({ now: Date.now(), inConversation: inConversation(seller?.received_at ?? null, oursBefore?.received_at ?? null), words, rand: Math.random(), rand2: Math.random() });
  await db.from("ai_outbox").insert({ submission_id: sub.id, action_id: reply.id, send_at: new Date(at).toISOString() });
  return { held_until: new Date(at).toISOString() };
}

/** Phase 2 — wake records with a new seller email or a due check-back. */
async function wake(mode: string, dailyReviews: number) {
  const out: any[] = [];
  const since = new Date(Date.now() - 86400_000).toISOString();
  const { count: today } = await db.from("ai_agent_runs").select("id", { count: "exact", head: true }).like("trigger", "autopilot:%").gte("created_at", since);
  let budget = Math.min(MAX_REVIEWS_PER_RUN, dailyReviews - (today ?? 0));
  if (budget <= 0) return [{ skipped: "Daily review limit reached" }];
  const ids = new Set<string>();
  const { data: dueMem } = await db.from("ai_record_memory").select("submission_id").lte("due_at", new Date().toISOString()).order("due_at").limit(40);
  for (const m of dueMem ?? []) ids.add(m.submission_id);
  const { data: inbound } = await db.from("email_messages").select("matched_submission_id,from_email").not("matched_submission_id", "is", null).gte("received_at", new Date(Date.now() - 3 * 86400_000).toISOString()).is("deleted_at", null).order("received_at", { ascending: false }).limit(200);
  for (const e of inbound ?? []) if (!/texascemeterybrokers/i.test(e.from_email ?? "")) ids.add(e.matched_submission_id!);
  if (mode === "selected") {
    const { data: picked } = await db.from("contact_submissions").select("id").eq("ai_autopilot", true).is("deleted_at", null).limit(200);
    for (const p of picked ?? []) ids.add(p.id);
  }
  let looked = 0;
  for (const sid of ids) {
    if (budget <= 0 || ++looked > 60) break;
    const { data: sub } = await db.from("contact_submissions").select("*").eq("id", sid).maybeSingle();
    if (!eligible(sub, mode)) continue;
    const { count: held } = await db.from("ai_outbox").select("id", { count: "exact", head: true }).eq("submission_id", sid).eq("status", "held");
    const { data: memory } = await db.from("ai_record_memory").select("*").eq("submission_id", sid).maybeSingle();
    const now = await recordFingerprint(db, sub);
    const route = routeWake({ memory: memory as any, now, at: Date.now(), humanOpen: await humanOpen(sid) });
    if (route.kind === "wait" || route.kind === "human") continue;
    if (held && route.kind === "checkback") continue;
    if (held) await db.from("ai_outbox").update({ status: "cancelled", status_reason: "File changed — redrafting" }).eq("submission_id", sid).eq("status", "held");
    if (route.kind === "escalate_reminders") {
      await db.from("customer_notes").insert({ submission_id: sid, customer_profile_id: sub.customer_profile_id, body: `AI autopilot: ${MAX_REMINDERS} reminders sent with no reply about ${memory?.waiting_for ?? "the next step"} — please give ${String(sub.name ?? "them").split(" ")[0]} a call.`, author_name: "AI agent (autopilot)" });
      await db.from("ai_record_memory").update({ due_at: new Date(Date.now() + 7 * 86400_000).toISOString(), last_route: "escalated" }).eq("submission_id", sid);
      out.push({ sid, route: route.kind }); continue;
    }
    budget--;
    const mode0 = route.kind === "checkback" ? "checkback" : route.kind;
    let r = await callAgent({ submission_id: sid, mode: mode0, changed: "changed" in route ? route.changed : [], reason: route.reason });
    if (r.status === 200 && r.body?.escalate && budget > 0) { budget--; r = await callAgent({ submission_id: sid, mode: "full", changed: "changed" in route ? route.changed : [], reason: "Catch-up found something that needs a full review" }); }
    if ([402, 403].includes(r.status)) { await pause(`AI access stopped (${r.status}): ${String(r.body?.error ?? "").slice(0, 200)}`); out.push({ sid, paused: r.status }); break; }
    if (r.status === 429) {
      const { data: st } = await db.from("automation_job_state").select("consecutive_rate_limits").eq("job_name", JOB).maybeSingle();
      const n = (st?.consecutive_rate_limits ?? 0) + 1;
      await db.from("automation_job_state").update({ consecutive_rate_limits: n }).eq("job_name", JOB);
      if (n >= 3) await pause("AI rate limited three runs in a row");
      break;
    }
    await db.from("automation_job_state").update({ consecutive_rate_limits: 0 }).eq("job_name", JOB);
    const q = r.status === 200 && r.body?.run_id ? await queueReply(sub, r.body.run_id) : null;
    out.push({ sid, route: route.kind, reason: route.reason, status: r.status, error: r.body?.error, reply: q });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const { data: job } = await db.from("automation_job_state").select("*").eq("job_name", JOB).maybeSingle();
  if (!job) return json({ error: "Job not set up" }, 500);
  const body = await req.json().catch(() => ({})) as any;
  let allowed = isInternalCall(req) || (!!job.trigger_secret && req.headers.get("x-automation-secret") === job.trigger_secret);
  let adminName: string | null = null;
  if (!allowed || body?.op) {
    const tok = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: u } = tok ? await db.auth.getUser(tok) : { data: { user: null } } as any;
    if (u?.user) { const { data: role } = await db.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle(); allowed = !!role; if (role) adminName = u.user.email ?? "Admin"; }
    if (body?.op && !adminName) return json({ error: "Admins only" }, 403);
  }
  if (!allowed) return json({ error: "Not allowed" }, 403);
  if (body?.op === "status" || body?.op === "set" || body?.op === "resume") {
    if (body.op === "set") {
      const mode = ["off", "selected", "all"].includes(body.mode) ? body.mode : "off";
      const daily = Math.min(200, Math.max(1, Math.round(Number(body.daily_reviews) || 40)));
      await db.from("ai_agent_settings").upsert({ key: "seller_autopilot", value: { mode, daily_reviews: daily }, updated_at: new Date().toISOString(), updated_by_name: adminName });
      if (mode !== "off" && job.pause_reason === "Not switched on yet") await db.from("automation_job_state").update({ status: "active", pause_reason: null }).eq("job_name", JOB);
    }
    if (body.op === "resume") await db.from("automation_job_state").update({ status: "active", pause_reason: null, consecutive_rate_limits: 0 }).eq("job_name", JOB);
    const since = new Date(Date.now() - 86400_000).toISOString();
    const [{ data: st }, { count: reviews }, { count: sent }, { count: held }] = await Promise.all([
      db.from("automation_job_state").select("status,pause_reason,last_completed_at").eq("job_name", JOB).maybeSingle(),
      db.from("ai_agent_runs").select("id", { count: "exact", head: true }).like("trigger", "autopilot:%").gte("created_at", since),
      db.from("ai_outbox").select("id", { count: "exact", head: true }).eq("status", "sent").gte("sent_at", since),
      db.from("ai_outbox").select("id", { count: "exact", head: true }).eq("status", "held"),
    ]);
    return json({ settings: await settings(), state: st, last24h: { reviews, sent, held } });
  }
  const s = await settings();
  if (s.mode === "off") return json({ status: "off" });
  if (job.status === "paused") return json({ status: "paused", reason: job.pause_reason });
  const nowIso = new Date().toISOString();
  const { data: lease } = await db.from("automation_job_state").update({ lease_until: new Date(Date.now() + 8 * 60_000).toISOString(), last_started_at: nowIso, locked_by: crypto.randomUUID() })
    .eq("job_name", JOB).or(`lease_until.is.null,lease_until.lt.${nowIso}`).select("locked_by").maybeSingle();
  if (!lease) return json({ status: "busy" });
  try {
    const sent = await sendDue(s.mode);
    const woke = await wake(s.mode, s.dailyReviews);
    return json({ status: "ok", sent, woke });
  } catch (e) {
    return json({ error: String((e as Error).message) }, 500);
  } finally {
    await db.from("automation_job_state").update({ lease_until: null, last_completed_at: new Date().toISOString() }).eq("job_name", JOB).eq("locked_by", lease.locked_by);
  }
});
