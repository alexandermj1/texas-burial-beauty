// Seller autopilot — runs every 10 minutes (and on "Run now" from the admin page).
//  1) Sends AI replies whose natural delay has passed (re-checking the file first).
//  2) Wakes records that have a new seller email or whose check-back is due, and decides
//     with NO AI how much to re-read: nothing, a quick catch-up from the AI's own note,
//     or a full review (new files/payments/contracts/paperwork, a lot changed, a suspected problem).
// Guards: owner switch, single-flight lease, small batches, daily review cap, per-seller
// email cap, quiet hours, and a circuit breaker that pauses on 402/403/repeated 429.
import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import { isInternalCall } from "../_shared/internal-auth.ts";
import { recordFingerprint } from "../_shared/recordFingerprint.ts";
import { routeWake, replySendAt, inConversation, isQuietTime, MAX_REMINDERS } from "../_shared/autopilotPolicy.ts";
import { sellerWakeCandidates, sellerMailOutgoing } from "../_shared/sellerWakeCandidates.ts";
import { sellerQuoteBacklog } from "../_shared/sellerQuoteBacklog.ts";
import { humanAttentionEnabled, parseHumanAttention } from "../_shared/humanAttention.ts";
import { legacySuggestionsNeedReview, replacedAutomationBlocker } from "../_shared/sellerBacklog.ts";
import { shouldAttemptCreditRecovery } from "../_shared/autopilotRecovery.ts";
import { labelRun } from "../_shared/aiRunLabel.ts";
import { GatewayError, generateResponse } from "npm:@lovable.dev/ai-gateway@0.1.11";

import { corsHeaders as sdkCorsHeaders } from "npm:@supabase/supabase-js@2.119.0/cors";
const corsHeaders = { ...sdkCorsHeaders, "Access-Control-Allow-Headers": `${sdkCorsHeaders["Access-Control-Allow-Headers"]}, x-automation-secret` };
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

/** A minimal, record-free gateway request proves that billing access is restored before any seller work resumes. */
async function creditAccessRestored(): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    await generateResponse(labelRun({ model: "openai/gpt-6-astra" as const, input: "Reply OK." }, "Seller AI — checking restored credit access"), { maxRetries: 0 });
    return { ok: true };
  } catch (e) {
    if (e instanceof GatewayError) return { ok: false, status: e.httpStatus, error: e.message.slice(0, 200) };
    return { ok: false, error: String((e as Error).message).slice(0, 200) };
  }
}

const isSeller = (s: any) => !/buyer|general|partner/i.test(String(s.customer_kind ?? ""));
const eligible = (s: any, mode: string) => s && !s.deleted_at && !s.archived_at && !s.closed_at && !s.sold_at && !s.ai_paused_at && isSeller(s) && (mode === "all" || s.ai_autopilot);

/** Put the record at the top of the staff list with a clear task (autopilot then leaves it alone). */
async function flagHuman(sub: any, task: string, reason = "The AI autopilot stopped here so a person can take over.", priority: "urgent" | "high" | "normal" = "high") {
  const attention = { priority, importance: priority === "urgent" ? 90 : priority === "high" ? 70 : 50, category: "human_task", task, reason, evidence: "AI notes and suggestions on this record" };
  await db.from("ai_agent_actions").insert({ submission_id: sub.id, action_type: "flag_human", status: "proposed", reason: task, note_body: `Needs a person (${priority} priority): ${task}\n${reason}`, confidence: 1, payload: { source: "autopilot", human_attention: attention } });
  await db.from("customer_notes").insert({ submission_id: sub.id, customer_profile_id: sub.customer_profile_id, body: `AI autopilot asked for a person: ${task}`, author_name: "AI agent (autopilot)" });
}

/** Steps the autopilot may carry out itself — each finishes entirely on the server with the staff code.
 *  Anything else (Documents-panel steps, opening dialogs) is handed to a person with instructions. */
export const AUTO_RUN = new Set(["change_cemetery", "reply_email", "add_note", "update_fields", "update_document_items", "fix_document_request", "resend_quote_free_listing", "update_quote_spaces", "increase_quote_ten_percent", "extend_quote_deadline", "resend_expired_quote", "send_quote", "resend_email", "set_stage", "resend_contract_link", "change_listing_option", "send_document_request", "send_listing_agreement", "resend_signing_link", "resend_family_tree", "send_family_tree"]);
const STEP_LABEL = (t: string) => t.replace(/_/g, " ");

async function execute(actionId: string) {
  const res = await fetch(`${URL_}/functions/v1/seller-agent`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}`, apikey: KEY }, body: JSON.stringify({ action: "execute", action_id: actionId, autopilot: true }) });
  const body = await res.json().catch(() => ({})) as any;
  return { ok: res.ok && !body?.error, status: res.status, error: String(body?.error ?? (res.ok ? "" : res.status)) };
}

async function humanOpen(sid: string) {
  const { count } = await db.from("ai_agent_actions").select("id", { count: "exact", head: true }).eq("submission_id", sid).eq("status", "proposed").eq("action_type", "flag_human").is("deleted_at", null);
  return (count ?? 0) > 0;
}
async function emailsToday(sid: string) {
  const since = new Date(Date.now() - 86400_000).toISOString();
  const { count } = await db.from("ai_outbox").select("id", { count: "exact", head: true }).eq("submission_id", sid).eq("status", "sent").gte("sent_at", since);
  return count ?? 0;
}

/** Phase 1 — send held replies that are due, if the file still supports them. */
async function sendDue(mode: string) {
  const out: any[] = [];
  // A run that died mid-send leaves its row "sending": never retry it blindly — hand it to a person.
  const { data: stuck } = await db.from("ai_outbox").select("id,submission_id").eq("status", "sending").lt("send_at", new Date(Date.now() - 20 * 60_000).toISOString()).limit(10);
  for (const st of stuck ?? []) {
    await db.from("ai_outbox").update({ status: "failed", status_reason: "Interrupted while sending — check what reached the seller" }).eq("id", st.id);
    const { data: sub } = await db.from("contact_submissions").select("id,customer_profile_id").eq("id", st.submission_id).maybeSingle();
    if (sub) await flagHuman(sub, "An automatic AI step was interrupted part-way. Check the emails and notes to see what reached the seller, then finish it.", "The autopilot never repeats a step it can't confirm.");
  }
  if (isQuietTime(Date.now())) return out;
  const { data: due } = await db.from("ai_outbox").select("*").eq("status", "held").lte("send_at", new Date().toISOString()).order("send_at").limit(MAX_SENDS_PER_RUN);
  for (const o of due ?? []) {
    const cancel = async (why: string) => { await db.from("ai_outbox").update({ status: "cancelled", status_reason: why }).eq("id", o.id); out.push({ id: o.id, cancelled: why }); };
    const { data: act } = await db.from("ai_agent_actions").select("*").eq("id", o.action_id).maybeSingle();
    const { data: sub } = await db.from("contact_submissions").select("*").eq("id", o.submission_id).maybeSingle();
    if (!act || act.status !== "proposed") { await cancel("Suggestion already handled or replaced"); continue; }
    if (!eligible(sub, mode)) { await cancel("Record no longer on autopilot"); continue; }
    const { data: newer } = await db.from("email_messages").select("id,from_email").eq("matched_submission_id", o.submission_id).is("deleted_at", null).gt("received_at", act.created_at);
    if ((newer ?? []).some((e) => !sellerMailOutgoing(e.from_email))) {
      await cancel("Seller wrote again — a fresh reply will be drafted");
      await db.from("ai_record_memory").update({ fingerprint: null, due_at: new Date().toISOString() }).eq("submission_id", o.submission_id);
      continue;
    }
    if ((newer ?? []).length) { await cancel("Our team already emailed since this was drafted"); continue; }
    if (await humanOpen(o.submission_id)) { await cancel("A person is handling this record"); continue; }
    if (await emailsToday(o.submission_id) >= MAX_EMAILS_PER_SELLER_DAY) { await db.from("ai_outbox").update({ send_at: new Date(Date.now() + 86400_000).toISOString() }).eq("id", o.id); continue; }
    // Claim the row first so an overlapping run can never send it twice.
    const { data: claimed } = await db.from("ai_outbox").update({ status: "sending", send_at: new Date().toISOString() }).eq("id", o.id).eq("status", "held").select("id").maybeSingle();
    if (!claimed) continue;
    // Carry out the whole review in order: record/document changes, then notes, then the reply last.
    const { data: siblings } = await db.from("ai_agent_actions").select("id,action_type,status,created_at").eq("run_id", act.run_id).eq("status", "proposed").is("deleted_at", null).order("created_at");
    const rank = (t: string) => t === "reply_email" ? 2 : t === "add_note" ? 1 : 0;
    const steps = (siblings ?? []).filter((x) => AUTO_RUN.has(x.action_type)).sort((x, y) => rank(x.action_type) - rank(y.action_type));
    const done: string[] = [];
    let failed: string | null = null;
    for (const st of steps) {
      const r = await execute(st.id);
      if (!r.ok) { failed = `${STEP_LABEL(st.action_type)}: ${r.error.slice(0, 200)}`; break; }
      done.push(st.action_type);
    }
    if (failed) {
      await db.from("ai_outbox").update({ status: "failed", status_reason: `Stopped at ${failed}${done.length ? ` (already done: ${done.map(STEP_LABEL).join(", ")})` : ""}` }).eq("id", o.id);
      await flagHuman(sub, `The AI couldn't finish its planned steps (${failed}). Please check the record and finish or correct it${done.includes("reply_email") ? "" : " — no reply has been sent to the seller yet"}.`, "An automatic step failed, so the autopilot stopped before doing anything further.");
      out.push({ id: o.id, failed }); continue;
    }
    const now = new Date().toISOString();
    await db.from("ai_outbox").update({ status: "sent", sent_at: now, status_reason: done.map(STEP_LABEL).join(", ") || null }).eq("id", o.id);
    // Remember the file as it is now (our email is part of it) so the next visit doesn't treat it as new.
    const { data: mem } = await db.from("ai_record_memory").select("reminder_count,last_route,fingerprint").eq("submission_id", sub.id).maybeSingle();
    const { data: fresh } = await db.from("contact_submissions").select("*").eq("id", sub.id).maybeSingle();
    const after = await recordFingerprint(db, fresh ?? sub);
    // Acknowledge our sent mail only; never swallow concurrent seller/evidence changes.
    await db.from("ai_record_memory").update({ fingerprint: mem?.fingerprint ? { ...mem.fingerprint, our_email: after.our_email } : null, reminder_count: (mem?.reminder_count ?? 0) + (mem?.last_route === "checkback" ? 1 : 0) }).eq("submission_id", sub.id);
    out.push({ id: o.id, sent: true });
  }
  return out;
}

async function callAgent(body: Record<string, unknown>) {
  const res = await fetch(`${URL_}/functions/v1/seller-agent`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}`, apikey: KEY }, body: JSON.stringify({ action: "autopilot_review", ...body }) });
  return { status: res.status, body: await res.json().catch(() => ({})) as any };
}

/** After an autopilot review: hold the review's steps with a natural delay, or hand them to a person. */
async function queueReply(sub: any, runId: string) {
  const { data: acts } = await db.from("ai_agent_actions").select("id,action_type,email_body,created_at").eq("run_id", runId).eq("status", "proposed").order("created_at");
  const list = acts ?? [];
  if (!list.length || list.some((a) => a.action_type === "flag_human")) return list.length ? { handed_to_person: true } : null;
  const manual = list.filter((a) => !AUTO_RUN.has(a.action_type));
  if (manual.length) {
    const names = manual.map((a) => STEP_LABEL(a.action_type)).join(", ");
    await flagHuman(sub, `Approve the AI's ${names} on this record (it needs the Family tree & documents panel), then approve the rest of its suggestions.`, `The AI planned ${list.map((a) => STEP_LABEL(a.action_type)).join(", ")}; part of it can only be finished on screen, so nothing has been sent to the seller yet.`, "normal");
    return { held_for_staff: names };
  }
  const reply = list.find((a) => a.action_type === "reply_email");
  const primary = reply ?? list.find((a) => a.action_type !== "add_note");
  if (!primary) { for (const n of list) await execute(n.id); return { notes_only: list.length }; }
  const { data: mail } = await db.from("email_messages").select("from_email,received_at").eq("matched_submission_id", sub.id).is("deleted_at", null).order("received_at", { ascending: false }).limit(10);
  const seller = (mail ?? []).find((m) => !/texascemeterybrokers/i.test(m.from_email ?? ""));
  const oursBefore = seller ? (mail ?? []).find((m) => /texascemeterybrokers/i.test(m.from_email ?? "") && m.received_at <= seller.received_at) : null;
  const words = String(reply?.email_body ?? "").split(/\s+/).filter(Boolean).length;
  const at = replySendAt({ now: Date.now(), inConversation: inConversation(seller?.received_at ?? null, oursBefore?.received_at ?? null), words, rand: Math.random(), rand2: Math.random() });
  await db.from("ai_outbox").insert({ submission_id: sub.id, action_id: primary.id, send_at: new Date(at).toISOString() });
  return { held_until: new Date(at).toISOString() };
}

/** Phase 2 — wake records with a new seller email or a due check-back. */
async function wake(mode: string, dailyReviews: number, quoteTasksOnly = false) {
  const out: any[] = [];
  const since = new Date(Date.now() - 86400_000).toISOString();
  const { count: today } = await db.from("ai_agent_runs").select("id", { count: "exact", head: true }).like("trigger", "autopilot:%").gte("created_at", since);
  let budget = Math.min(MAX_REVIEWS_PER_RUN, dailyReviews - (today ?? 0));
  budget = Math.max(0, budget); // Quote-task surfacing costs no inference and must still run at the cap.
  const readPages = async (table: string, fields: string, key = "id") => {
    const rows: any[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db.from(table).select(fields).order(key).range(offset, offset + 499);
      if (error) throw new Error(`Could not read ${table} for seller wake: ${error.message}`);
      rows.push(...(data ?? []));
      if ((data ?? []).length < 500) return rows;
    }
  };
  // Light metadata only: no three-day/global-message cap can hide an unanswered seller.
  const [allSubs, allMail, memories, proposals, automaticRuns, profiles, files, documents, attentionSetting] = await Promise.all([
    readPages("contact_submissions", "id,name,email,created_at,customer_kind,source,customer_profile_id,cemetery,section,lawn,seller_attachments,quote_sent_at,quote_response,la_signed_at,documents_requested_at,documents_completed_at,deleted_at,archived_at,closed_at,sold_at,ai_paused_at,ai_autopilot,reply_dismissed_at,ownership_answers"),
    readPages("email_messages", "id,matched_submission_id,from_email,to_email,received_at,deleted_at"),
    readPages("ai_record_memory", "submission_id,due_at", "submission_id"),
    readPages("ai_agent_actions", "id,submission_id,action_type,status,deleted_at,reason,payload,run_id"),
    readPages("ai_agent_runs", "id,trigger"),
    readPages("customer_profiles", "id,primary_email,alt_emails,deleted_at"),
    readPages("customer_files", "id,customer_profile_id,deleted_at"),
    readPages("submission_documents", "id,submission_id,file_url,file_urls,deleted_at"),
    db.from("ai_agent_settings").select("value").eq("key", "human_attention_queue").maybeSingle(),
  ]);
  const active = allSubs.filter(s => eligible(s, mode));
  const activeIds = new Set(active.map(s => s.id));
  // Staff work is not the same as an unanswered email. Surface the attachment/quote
  // stage even when we already acknowledged it, without spending an AI review.
  if (humanAttentionEnabled(attentionSetting.data?.value)) {
    const quoteRows = sellerQuoteBacklog(allSubs, profiles.filter(p => !p.deleted_at), files.filter(f => !f.deleted_at), documents.filter(d => !d.deleted_at)).filter(s => activeIds.has(s.id));
    for (const sub of quoteRows) {
      const existing = proposals.filter(p => p.submission_id === sub.id && p.action_type === "flag_human" && p.status === "proposed" && !p.deleted_at);
      if (existing.some(p => parseHumanAttention(p.payload?.human_attention) && /quote|valuation/i.test(p.payload?.human_attention?.task ?? "") && !replacedAutomationBlocker(p))) continue;
      const task = `Quote needed: Cici, review the attachments for ${sub.name || "this seller"}${sub.cemetery ? ` at ${sub.cemetery}` : ""}, check the deed and prepare their valuation. If the deed is missing or unreadable, request a clear copy first.`;
      await flagHuman(sub, task, "No quote has been sent. Our acknowledgement does not finish the valuation; this remains staff work even when our email is the latest reply.");
      out.push({ sid: sub.id, quote_task: true });
    }
  }
  if (quoteTasksOnly) return out;
  if (budget <= 0) return [...out, { skipped: "Daily review limit reached; quote tasks still checked" }];
  const due = memories.filter(m => activeIds.has(m.submission_id) && m.due_at && Date.parse(m.due_at) <= Date.now()).sort((a,b) => a.due_at.localeCompare(b.due_at)).map(m => m.submission_id);
  const openProposals = proposals.filter(p => p.status === "proposed" && !p.deleted_at);
  const ids = [...new Set([...sellerWakeCandidates(active, allMail.filter(e => !e.deleted_at), due, new Set(memories.map(m => m.submission_id))), ...openProposals.map(p => p.submission_id).filter(id => activeIds.has(id))])];
  const autoIds = new Set(automaticRuns.filter(r => String(r.trigger).startsWith("autopilot:")).map(r => r.id));
  for (const sid of ids) {
    if (budget <= 0) break;
    const { data: sub } = await db.from("contact_submissions").select("*").eq("id", sid).maybeSingle();
    if (!eligible(sub, mode)) continue;
    const { count: held } = await db.from("ai_outbox").select("id", { count: "exact", head: true }).eq("submission_id", sid).eq("status", "held");
    const { data: memory } = await db.from("ai_record_memory").select("*").eq("submission_id", sid).maybeSingle();
    if (memory?.last_route === "error" && Date.parse(memory.updated_at) > Date.now() - 2 * 3600_000) continue; // back off after a failed review
    const proposed = openProposals.filter(p => p.submission_id === sid);
    const retired = proposed.filter(replacedAutomationBlocker);
    if (retired.length) {
      const { error } = await db.from("ai_agent_actions").update({ status: "superseded", decision_reason: "Owner requested a fresh autonomous review; this approval-only blocker is obsolete." }).in("id", retired.map(p => p.id)).eq("status", "proposed");
      if (error) throw error;
    }
    const legacy = legacySuggestionsNeedReview(proposed, autoIds, !!held) || retired.length > 0;
    const now = await recordFingerprint(db, sub);
    const blocked = await humanOpen(sid);
    const route = legacy && !blocked ? { kind: "full" as const, changed: [], reason: "Reassess abandoned manual suggestions under owner-enabled autonomy; never send an old draft without reviewing it again" } : routeWake({ memory: memory as any, now, at: Date.now(), humanOpen: blocked });
    if (route.kind === "wait" || route.kind === "human") continue;
    if (held && route.kind === "checkback") continue;
    if (held) await db.from("ai_outbox").update({ status: "cancelled", status_reason: "File changed — redrafting" }).eq("submission_id", sid).eq("status", "held");
    if (route.kind === "escalate_reminders") {
      await flagHuman(sub, `${MAX_REMINDERS} reminders sent with no reply about ${memory?.waiting_for ?? "the next step"} — please give ${String(sub.name ?? "them").split(" ")[0]} a call.`);
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
    if (r.status !== 200) {
      // Always leave a next step: retry later, and after repeated failures hand it to a person.
      const fails = ((memory as any)?.history ?? []).filter((h: any) => h.error).length + 1;
      await db.from("ai_record_memory").upsert({ submission_id: sid, summary: memory?.summary ?? "", fingerprint: memory?.fingerprint ?? null, last_route: "error", due_at: new Date(Date.now() + 2 * 3600_000).toISOString(), updated_at: new Date().toISOString(),
        history: [...(((memory as any)?.history ?? []) as any[]), { at: new Date().toISOString(), error: String(r.body?.error ?? r.status).slice(0, 200) }].slice(-10) });
      if (fails >= 3) await flagHuman(sub, `The AI couldn't finish reviewing this file ${fails} times (${String(r.body?.error ?? r.status).slice(0, 120)}) — please check it.`);
    }
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
  let canControl = false;
  if (!allowed || body?.op) {
    const tok = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: u } = tok ? await db.auth.getUser(tok) : { data: { user: null } } as any;
    if (u?.user) {
      const { data: roles } = await db.from("user_roles").select("role").eq("user_id", u.user.id);
      const rs = (roles ?? []).map((r: any) => r.role);
      allowed = rs.includes("admin"); if (allowed) adminName = u.user.email ?? "Admin";
      // Staff accounts (e.g. Cici) can watch results but never control the autopilot.
      canControl = allowed && !rs.includes("staff");
    }
    if (body?.op && !adminName) return json({ error: "Admins only" }, 403);
    if (["set", "resume", "pause_record", "scan_quote_tasks"].includes(body?.op) && !canControl) return json({ error: "Only the owners can control the Seller AI" }, 403);
  }
  if (!allowed) return json({ error: "Not allowed" }, 403);
  if (body?.op === "scan_quote_tasks") {
    const config = await settings();
    if (config.mode === "off") return json({ status: "skipped", reason: "Seller AI is off" });
    return json({ status: "ok", tasks: await wake(config.mode, config.dailyReviews, true) });
  }
  if (body?.op === "pause_record") {
    const sid = String(body.submission_id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(sid)) return json({ error: "Bad record" }, 400);
    await db.from("contact_submissions").update({ ai_paused_at: body.paused ? new Date().toISOString() : null }).eq("id", sid);
    if (body.paused) await db.from("ai_outbox").update({ status: "cancelled", status_reason: `Paused by ${adminName}` }).eq("submission_id", sid).eq("status", "held");
    return json({ ok: true, paused: !!body.paused });
  }
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
    const { data: log } = await db.from("ai_outbox").select("id,submission_id,status,status_reason,send_at,sent_at,created_at,action_id").order("created_at", { ascending: false }).limit(40);
    const sids = [...new Set((log ?? []).map((l) => l.submission_id))], aids = (log ?? []).map((l) => l.action_id);
    const [{ data: names }, { data: acts }, { data: lastRun }] = await Promise.all([
      sids.length ? db.from("contact_submissions").select("id,name,email").in("id", sids) : Promise.resolve({ data: [] as any[] }),
      aids.length ? db.from("ai_agent_actions").select("id,action_type,email_subject,reason").in("id", aids) : Promise.resolve({ data: [] as any[] }),
      db.from("ai_agent_runs").select("created_at,submission_id,stage_summary").like("trigger", "autopilot:%").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const nm = new Map((names ?? []).map((n: any) => [n.id, n.name || n.email]));
    const am = new Map((acts ?? []).map((a: any) => [a.id, a]));
    const entries = (log ?? []).map((l) => ({ ...l, seller: nm.get(l.submission_id) ?? "Seller", subject: (am.get(l.action_id) as any)?.email_subject ?? null, what: (am.get(l.action_id) as any)?.reason ?? null, kind: (am.get(l.action_id) as any)?.action_type ?? null }));
    const lastSent = entries.find((e) => e.status === "sent")?.sent_at ?? null;
    // Running console: what's coming up next and what the AI recently did.
    const nowIso2 = new Date().toISOString();
    const [{ data: upMem }, { data: recentRuns }, { data: recentFlags }] = await Promise.all([
      db.from("ai_record_memory").select("submission_id,due_at,waiting_for,next_if_silent,last_route").gte("due_at", nowIso2).order("due_at").limit(25),
      db.from("ai_agent_runs").select("id,created_at,status,submission_id,stage_summary").like("trigger", "autopilot:%").order("created_at", { ascending: false }).limit(30),
      db.from("ai_agent_actions").select("created_at,submission_id,reason").eq("action_type", "flag_human").order("created_at", { ascending: false }).limit(15),
    ]);
    const more = [...new Set([...(upMem ?? []), ...(recentRuns ?? []), ...(recentFlags ?? [])].map((r: any) => r.submission_id).filter((x: string) => x && !nm.has(x)))];
    if (more.length) { const { data: n2 } = await db.from("contact_submissions").select("id,name,email,archived_at,ai_paused_at").in("id", more); for (const n of n2 ?? []) nm.set(n.id, n.name || n.email); }
    const nameOf = (id: string) => nm.get(id) ?? "Seller";
    const upcoming = [
      ...entries.filter((e) => e.status === "held").map((e) => ({ at: e.send_at, submission_id: e.submission_id, seller: e.seller, kind: "send", text: `Send reply${e.subject ? `: “${e.subject}”` : ""}` })),
      ...(upMem ?? []).map((m: any) => ({ at: m.due_at, submission_id: m.submission_id, seller: nameOf(m.submission_id), kind: "check", text: `Check back${m.waiting_for ? ` — waiting for ${m.waiting_for}` : ""}${m.next_if_silent ? `; if silent: ${m.next_if_silent}` : ""}` })),
    ].sort((a, b) => String(a.at).localeCompare(String(b.at))).slice(0, 30);
    const activity = [
      ...(recentRuns ?? []).map((r: any) => ({ at: r.created_at, submission_id: r.submission_id, seller: nameOf(r.submission_id), kind: r.status === "done" ? "review" : r.status === "running" ? "running" : "error", text: r.status === "running" ? "Reviewing the record now" : r.stage_summary ? `Reviewed — ${r.stage_summary}` : `Review ${r.status}` })),
      ...entries.filter((e) => e.status === "sent" || e.status === "cancelled" || e.status === "failed").map((e) => ({ at: e.sent_at ?? e.created_at, submission_id: e.submission_id, seller: e.seller, kind: e.status === "sent" ? "sent" : e.status === "failed" ? "error" : "cancelled", text: e.status === "sent" ? `Emailed${e.subject ? ` “${e.subject}”` : ""}` : `Reply not sent — ${e.status_reason ?? e.status}` })),
      ...(recentFlags ?? []).map((f: any) => ({ at: f.created_at, submission_id: f.submission_id, seller: nameOf(f.submission_id), kind: "flag", text: `Asked staff: ${String(f.reason ?? "").slice(0, 160)}` })),
    ].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 60);
    return json({ settings: await settings(), state: st, last24h: { reviews, sent, held }, log: entries, last_sent_at: lastSent, last_review: lastRun ?? null, upcoming, activity, can_control: canControl });
  }
  const s = await settings();
  if (s.mode === "off") return json({ status: "off" });
  let recovered = false;
  if (job.status === "paused") {
    if (!shouldAttemptCreditRecovery(job)) return json({ status: "paused", reason: job.pause_reason });
    const check = await creditAccessRestored();
    if (!check.ok) return json({ status: "paused", reason: job.pause_reason, credit_recovery: "Waiting for AI access; will check again on the next scheduled sweep" });
    const { error } = await db.from("automation_job_state").update({ status: "active", pause_reason: null, consecutive_rate_limits: 0, updated_at: new Date().toISOString() }).eq("job_name", JOB).eq("status", "paused");
    if (error) return json({ error: error.message }, 500);
    recovered = true;
  }
  const nowIso = new Date().toISOString();
  const { data: lease } = await db.from("automation_job_state").update({ lease_until: new Date(Date.now() + 8 * 60_000).toISOString(), last_started_at: nowIso, locked_by: crypto.randomUUID() })
    .eq("job_name", JOB).or(`lease_until.is.null,lease_until.lt.${nowIso}`).select("locked_by").maybeSingle();
  if (!lease) return json({ status: "busy" });
  try {
    const sent = await sendDue(s.mode);
    const woke = await wake(s.mode, s.dailyReviews);
    return json({ status: "ok", recovered, sent, woke });
  } catch (e) {
    return json({ error: String((e as Error).message) }, 500);
  } finally {
    await db.from("automation_job_state").update({ lease_until: null, last_completed_at: new Date().toISOString() }).eq("job_name", JOB).eq("locked_by", lease.locked_by);
  }
});
