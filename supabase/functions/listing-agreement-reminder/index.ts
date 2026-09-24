// Weekday automation: one gentle reminder to sellers who were sent their
// listing agreement but have not signed it.
//
// Safeguards (all must pass):
//  - Sellers only (seller_quote source, customer_kind seller or blank).
//  - Agreement still unsigned, not void, with a live signing link.
//  - Sent at least one day ago.
//  - NO contact of any kind since the agreement went out: no email from the
//    seller (e.g. "I can't sign" / "I'll sign later"), no email written by a
//    person here, no note, no logged call. Any of those means a person is
//    already handling them, so the reminder is skipped for good.
//  - Only ever one reminder per person.
// After signing, the signing page carries them straight into the family tree.
import {
  BATCH_SIZE, OUR_EMAIL, PHONE_HREF, PHONE_LABEL, SITE, authorize, brandedEmail, cors, esc,
  firstNameOf, gmailSend, isHumanContact, loadEnv, mimeMessage, realThread, respond,
  threadHeaders, type ThreadMessage,
} from "../_shared/autoFollowup.ts";

const JOB = "listing-agreement-reminder";
const TYPE = "listing_agreement_reminder";
const MIN_WAIT_MS = 20 * 3_600_000;
// The agreement email itself is logged a moment after it is sent — ignore
// anything in that window so it does not count as a conversation.
const SEND_GRACE_MS = 30 * 60_000;

export function buildBody(firstName: string, cemetery: string | null, link: string) {
  const html = brandedEmail({
    eyebrow: "Your listing agreement",
    preheader: "Your agreement is ready to sign online — it takes about five minutes.",
    greeting: `Dear ${firstName},`,
    paragraphs: [
      `I wanted to follow up on the listing agreement we sent over${cemetery ? ` for your property at <strong>${esc(cemetery)}</strong>` : ""}. It is still waiting for your signature, and it only takes about five minutes to complete online.`,
      "The agreement simply lets us market your property and find a buyer on your behalf. You approve every offer before anything is final.",
      "Once it is signed, you will be taken straight to a few short questions about the ownership of the property, so we can prepare exactly the right paperwork for you and nothing more.",
    ],
    panel: cemetery ? { label: "Property", value: cemetery } : undefined,
    callout: {
      label: "Ready when you are",
      body: "The link below opens your agreement. Fill in your details, add your initials to each section, sign, and you are done.",
      buttonHref: link,
      buttonLabel: "Review & sign your agreement",
    },
    closing: `If something is not working, or you would rather go through it together, just reply to this email or call <a href="${PHONE_HREF}" style="color:#7c3a2e;text-decoration:none;"><strong>${PHONE_LABEL}</strong></a>. If you have already signed a paper copy, please ignore this note.`,
  });
  const plain = [
    `Dear ${firstName},`, "",
    `I wanted to follow up on the listing agreement we sent over${cemetery ? ` for your property at ${cemetery}` : ""}. It is still waiting for your signature, and it only takes about five minutes to complete online.`, "",
    "The agreement simply lets us market your property and find a buyer on your behalf. You approve every offer before anything is final.", "",
    "Once it is signed, you will be taken straight to a few short questions about the ownership of the property.", "",
    `Review and sign your agreement: ${link}`, "",
    `If something is not working, reply to this email or call ${PHONE_LABEL}. If you have already signed a paper copy, please ignore this note.`, "",
    "Warm regards,", "Alexander James", "Cemetery Salesperson", "Texas Cemetery Brokers",
  ].join("\n");
  return { html, plain };
}

const isWeekdayInTexas = (d = new Date()) => {
  const day = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "short" }).format(d);
  return day !== "Sat" && day !== "Sun";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const env = loadEnv();
  if (!env) return respond({ error: "Email automation is not configured" }, 500);
  const { db, lovableKey, gmailKey } = env;

  const input = await req.json().catch(() => ({}));
  const dryRun = input?.dry_run === true;
  const onlyId = typeof input?.submission_id === "string" ? input.submission_id : null;
  const previewEmail = typeof input?.preview_email === "string" && input.preview_email.includes("@") ? input.preview_email.trim().toLowerCase() : null;
  if (!(await authorize(db, req, JOB, dryRun || Boolean(previewEmail)))) return respond({ error: "Unauthorized" }, 401);

  if (previewEmail) {
    const { html, plain } = buildBody("Patricia", "Restland Memorial Park", `${SITE}/sign/example`);
    const raw = mimeMessage({ to: previewEmail, subject: "Your listing agreement is ready to sign - Restland Memorial Park", plain, html, replyHeaders: [] });
    const sent = await gmailSend(raw, null, lovableKey, gmailKey);
    if (!sent.ok) return respond({ ok: false, error: `provider-${sent.status}`, details: sent.text.slice(0, 1000) }, sent.status);
    return respond({ ok: true, preview_sent_to: previewEmail });
  }

  if (!dryRun && !isWeekdayInTexas()) return respond({ ok: true, skipped: "weekend" });

  const runId = crypto.randomUUID();
  let locked = false;
  let sendAttempts = 0;
  const results: { id: string; name?: string; status: string; reason?: string }[] = [];
  try {
    if (!dryRun) {
      const { data: claimed, error } = await db.rpc("claim_automation_job", { _job_name: JOB, _run_id: runId, _lease_seconds: 900 });
      if (error) throw error;
      if (!claimed) return respond({ ok: true, skipped: "paused-or-already-running", results });
      locked = true;
    }

    const nowMs = Date.now();
    let cq = db.from("contracts")
      .select("id,submission_id,status,sent_at,created_at,sign_token,sign_token_expires_at,signed_at")
      .eq("kind", "listing_agreement").is("signed_at", null).is("deleted_at", null)
      .in("status", ["sent", "viewed"]).not("sign_token", "is", null).limit(500);
    if (onlyId) cq = cq.eq("submission_id", onlyId);
    const { data: contracts, error: cErr } = await cq;
    if (cErr) throw cErr;

    const ids = [...new Set((contracts ?? []).map((c) => c.submission_id as string))];
    const { data: subs } = ids.length
      ? await db.from("contact_submissions")
        .select("id,name,email,cemetery,source,customer_kind,customer_profile_id,la_signed_at,archived_at,closed_at,sold_at,deleted_at,document_followup_paused_at")
        .in("id", ids)
      : { data: [] as any[] };
    const subById = new Map((subs ?? []).map((s: any) => [s.id, s]));

    // Anyone who already received this reminder (on any of their submissions).
    const { data: logs } = await db.from("reminder_log").select("submission_id").eq("reminder_type", TYPE).in("status", ["sent", "processing"]).is("deleted_at", null).limit(5000);
    const remindedSubs = new Set((logs ?? []).map((l) => l.submission_id as string));
    const remindedEmails = new Set<string>();
    for (const id of remindedSubs) { const s: any = subById.get(id); if (s?.email) remindedEmails.add(String(s.email).trim().toLowerCase()); }
    const handled = new Set<string>();

    for (const c of contracts ?? []) {
      const sub: any = subById.get(c.submission_id as string);
      if (!sub) continue;
      const name = sub.name ?? undefined;
      const skip = (reason: string) => results.push({ id: sub.id, name, status: "skipped", reason });
      const email = String(sub.email ?? "").trim().toLowerCase();
      if (!email.includes("@")) { skip("no-email"); continue; }
      if (sub.deleted_at || sub.archived_at || sub.closed_at || sub.sold_at) { skip("closed-or-archived"); continue; }
      if (sub.la_signed_at) { skip("already-signed"); continue; }
      if (sub.document_followup_paused_at) { skip("reminders-paused"); continue; }
      // Sellers only — buyers and general enquiries never get this.
      if (sub.source !== "seller_quote") { skip("not-a-seller"); continue; }
      if (sub.customer_kind && sub.customer_kind !== "seller") { skip("not-a-seller"); continue; }
      if (handled.has(email)) { skip("duplicate-person"); continue; }
      if (remindedSubs.has(sub.id) || remindedEmails.has(email)) { skip("already-sent"); continue; }
      if (c.sign_token_expires_at && Date.parse(c.sign_token_expires_at as string) < nowMs) { skip("signing-link-expired"); continue; }

      const sentIso = String(c.sent_at ?? c.created_at);
      const sentMs = Date.parse(sentIso);
      if (nowMs - sentMs < MIN_WAIT_MS) { skip("sent-too-recently"); continue; }

      // Any contact since the agreement went out means a person is handling it.
      const since = new Date(sentMs + SEND_GRACE_MS).toISOString();
      const [{ data: notes }, { data: messages }, { data: activity }] = await Promise.all([
        db.from("customer_notes").select("id").or(`submission_id.eq.${sub.id}${sub.customer_profile_id ? `,customer_profile_id.eq.${sub.customer_profile_id}` : ""}`).is("deleted_at", null).gt("created_at", since).limit(1),
        db.from("email_messages").select("gmail_thread_id,gmail_message_id,received_at,from_email,body_html").or(`matched_submission_id.eq.${sub.id},from_email.ilike.%${email}%,to_email.ilike.%${email}%`).is("deleted_at", null).order("received_at", { ascending: false }).limit(30),
        db.from("customer_activity_log").select("id").eq("submission_id", sub.id).in("action_type", ["phone_call", "call_logged", "customer_contacted"]).gt("created_at", since).limit(1),
      ]);
      const sellerWrote = (messages ?? []).some((m) => m.received_at > since && String(m.from_email ?? "").toLowerCase().includes(email));
      const weWrote = (messages ?? []).some((m) => m.received_at > since && isHumanContact(m as ThreadMessage, email));
      if (sellerWrote) { skip("seller-emailed-since"); continue; }
      if (weWrote) { skip("we-emailed-since"); continue; }
      if ((notes ?? []).length) { skip("note-since"); continue; }
      if ((activity ?? []).length) { skip("call-logged-since"); continue; }

      handled.add(email);
      if (dryRun) { results.push({ id: sub.id, name, status: "would-send" }); continue; }
      if (sendAttempts >= BATCH_SIZE) break;

      const now = new Date().toISOString();
      const idempotency = `${TYPE}:${sub.id}`;
      const { data: reserved, error: reserveError } = await db.from("reminder_log").insert({ submission_id: sub.id, reminder_type: TYPE, sent_via: "gmail_auto", sent_at: now, attempted_at: now, status: "processing", idempotency_key: idempotency, notes: "Automatic reminder: listing agreement awaiting signature." }).select("id").maybeSingle();
      if (reserveError?.code === "23505" || !reserved) { skip("already-claimed"); continue; }
      if (reserveError) throw reserveError;
      sendAttempts += 1;

      const link = `${SITE}/sign/${c.sign_token}`;
      const subject = `Your listing agreement is ready to sign${sub.cemetery ? ` - ${sub.cemetery}` : ""}`;
      const { html, plain } = buildBody(firstNameOf(sub.name), sub.cemetery, link);
      const thread = realThread((messages ?? []) as ThreadMessage[]);
      const replyHeaders = await threadHeaders(thread, lovableKey, gmailKey);
      const sent = await gmailSend(mimeMessage({ to: email, subject, plain, html, replyHeaders }), thread?.gmail_thread_id, lovableKey, gmailKey);
      if (!sent.ok) {
        await db.from("reminder_log").update({ status: "failed", error_code: String(sent.status), error_message: sent.text.slice(0, 2000), idempotency_key: [429, 500, 502, 503, 504].includes(sent.status) ? null : idempotency }).eq("id", reserved.id);
        if ([401, 402, 403, 429].includes(sent.status)) {
          await db.from("automation_job_state").update({ status: "paused", pause_reason: `Email provider blocked automatic sends (${sent.status}).`, updated_at: now }).eq("job_name", JOB);
          results.push({ id: sub.id, name, status: "failed", reason: `provider-${sent.status}` });
          break;
        }
        results.push({ id: sub.id, name, status: "failed", reason: `provider-${sent.status}` });
        continue;
      }
      const providerId = typeof sent.body.id === "string" ? sent.body.id : `la-reminder-${sub.id}-${Date.now()}`;
      const providerThread = typeof sent.body.threadId === "string" ? sent.body.threadId : thread?.gmail_thread_id ?? `la-reminder-${sub.id}`;
      await db.from("email_messages").upsert({ gmail_message_id: providerId, gmail_thread_id: providerThread, from_email: OUR_EMAIL, from_name: "Texas Cemetery Brokers", to_email: email, subject, snippet: "Automatic reminder — listing agreement awaiting signature.", body_text: plain, body_html: html, received_at: now, matched_submission_id: sub.id, customer_profile_id: sub.customer_profile_id, is_read: true }, { onConflict: "gmail_message_id" });
      await db.from("reminder_log").update({ status: "sent", provider_message_id: providerId, error_code: null, error_message: null }).eq("id", reserved.id);
      await db.from("customer_activity_log").insert({ submission_id: sub.id, customer_profile_id: sub.customer_profile_id, actor_name: "Automatic follow-up", action_type: "auto_followup_sent", action_summary: "Sent the listing agreement signature reminder.", details: { gmail_message_id: providerId } });
      results.push({ id: sub.id, name, status: "sent" });
    }
    return respond({ ok: true, dry_run: dryRun, count: results.length, results });
  } catch (error) {
    console.error(JOB, error);
    return respond({ ok: false, error: error instanceof Error ? error.message : String(error), results }, 500);
  } finally {
    if (locked) await db.rpc("release_automation_job", { _job_name: JOB, _run_id: runId, _completed: true });
  }
});
