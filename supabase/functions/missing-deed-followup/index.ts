// Daily automation: seven days after someone filled out the seller form without
// attaching a deed or proof of purchase, and only if nobody has spoken with them
// since, send a polite reminder asking for a photo or scan of the deed.
import {
  BATCH_SIZE, OUR_EMAIL, PHONE_HREF, PHONE_LABEL, SITE, authorize, brandedEmail, cors, esc,
  firstNameOf, gmailSend, isHumanContact, loadEnv, mimeMessage, personGuards, realThread, respond,
  threadHeaders, type ThreadMessage,
} from "../_shared/autoFollowup.ts";

const JOB = "missing-deed-followup";
const TYPE = "missing_deed_followup";
const WAIT_DAYS = 7;

export function buildBody(firstName: string, cemetery: string | null) {
  const mailto = `mailto:${OUR_EMAIL}?subject=${encodeURIComponent(`My deed${cemetery ? ` - ${cemetery}` : ""}`)}`;
  const html = brandedEmail({
    eyebrow: "One thing we still need",
    preheader: "A photo of your deed or proof of purchase lets us value your property accurately.",
    greeting: `Dear ${firstName},`,
    paragraphs: [
      `Thank you for getting in touch with us about your cemetery property${cemetery ? ` at <strong>${esc(cemetery)}</strong>` : ""}. We have your details on file and we are ready to work on your valuation.`,
      "Before we can put a price together, we just need a copy of your <strong>deed or proof of purchase</strong>. A photo taken on your phone is perfectly fine — it does not need to be a scan, and it does not need to be tidy.",
      "That document tells us exactly which section and space you own and how the property was originally purchased, which is what allows us to give you an accurate figure rather than a rough guess.",
    ],
    callout: {
      label: "How to send it",
      body: "Simply reply to this email with a photo attached. If you cannot find your paperwork, the cemetery office can usually provide a copy of your deed on request — and we are very happy to help you ask them.",
      buttonHref: mailto,
      buttonLabel: "Reply with a photo of the deed",
    },
    closing: `If you would rather talk it through first, or you are not sure what you are looking for, reply to this email or call <a href="${PHONE_HREF}" style="color:#7c3a2e;text-decoration:none;"><strong>${PHONE_LABEL}</strong></a>. There is no obligation at any point, and we are glad to help either way.`,
  });
  const plain = [
    `Dear ${firstName},`, "",
    `Thank you for getting in touch with us about your cemetery property${cemetery ? ` at ${cemetery}` : ""}. We have your details on file and we are ready to work on your valuation.`, "",
    "Before we can put a price together, we just need a copy of your deed or proof of purchase. A photo taken on your phone is perfectly fine — it does not need to be a scan.", "",
    "That document tells us exactly which section and space you own and how the property was originally purchased, which is what allows us to give you an accurate figure rather than a rough guess.", "",
    "Simply reply to this email with a photo attached. If you cannot find your paperwork, the cemetery office can usually provide a copy of your deed on request, and we are happy to help you ask them.", "",
    `If you would rather talk it through, reply to this email or call ${PHONE_LABEL}.`, "",
    "Warm regards,", "Alexander James", "Cemetery Salesperson", "Texas Cemetery Brokers", SITE,
  ].join("\n");
  return { html, plain };
}

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
    const { html, plain } = buildBody("Patricia", "Restland Memorial Park");
    const raw = mimeMessage({ to: previewEmail, subject: "A copy of your deed - Restland Memorial Park", plain, html, replyHeaders: [] });
    const sent = await gmailSend(raw, null, lovableKey, gmailKey);
    if (!sent.ok) return respond({ ok: false, error: `provider-${sent.status}`, details: sent.text.slice(0, 1000) }, sent.status);
    return respond({ ok: true, preview_sent_to: previewEmail });
  }

  const runId = crypto.randomUUID();
  let locked = false;
  let sendAttempts = 0;
  const results: { id: string; status: string; reason?: string }[] = [];
  try {
    if (!dryRun) {
      const { data: claimed, error } = await db.rpc("claim_automation_job", { _job_name: JOB, _run_id: runId, _lease_seconds: 900 });
      if (error) throw error;
      if (!claimed) return respond({ ok: true, skipped: "paused-or-already-running", results });
      locked = true;
    }

    const nowMs = Date.now();
    const waitCutoff = new Date(nowMs - WAIT_DAYS * 86_400_000).toISOString();
    let query = db.from("contact_submissions")
      .select("id,name,email,cemetery,created_at,customer_profile_id,seller_attachments")
      .is("deleted_at", null).is("archived_at", null).is("closed_at", null).is("sold_at", null)
      .is("quote_sent_at", null).is("document_followup_paused_at", null)
      .not("email", "is", null).lte("created_at", waitCutoff)
      .order("created_at", { ascending: false }).limit(500);
    if (onlyId) query = query.eq("id", onlyId);
    const { data: submissions, error } = await query;
    if (error) throw error;
    const guards = await personGuards(db, TYPE);
    const handled = new Set<string>();

    for (const sub of submissions ?? []) {
      const email = String(sub.email ?? "").trim().toLowerCase();
      if (!email.includes("@")) continue;
      // One person, one email — duplicates of the same seller are skipped, and
      // so is anyone whose other submission has already been quoted or closed.
      if (handled.has(email)) { results.push({ id: sub.id, status: "skipped", reason: "duplicate-person" }); continue; }
      if (guards.advanced.has(email)) { results.push({ id: sub.id, status: "skipped", reason: "further-along-elsewhere" }); continue; }
      if (guards.emailed.has(email)) { results.push({ id: sub.id, status: "skipped", reason: "already-sent" }); continue; }

      // Only people who still have nothing on file.
      let hasAttachment = Array.isArray(sub.seller_attachments) && sub.seller_attachments.length > 0;
      if (!hasAttachment && sub.customer_profile_id) {
        const { data: files } = await db.from("customer_files").select("id").eq("customer_profile_id", sub.customer_profile_id).is("deleted_at", null).limit(1);
        hasAttachment = (files ?? []).length > 0;
      }
      if (hasAttachment) { results.push({ id: sub.id, status: "skipped", reason: "already-has-attachment" }); continue; }

      const idempotency = `${TYPE}:${sub.id}`;
      const { data: prior } = await db.from("reminder_log").select("id,sent_at").eq("submission_id", sub.id).eq("reminder_type", TYPE).eq("status", "sent").is("deleted_at", null).order("sent_at", { ascending: false }).limit(1);
      if (prior?.length) { results.push({ id: sub.id, status: "skipped", reason: "already-sent" }); continue; }

      const since = String(sub.created_at);
      const [{ data: notes }, { data: messages }, { data: activity }] = await Promise.all([
        db.from("customer_notes").select("id").eq("submission_id", sub.id).is("deleted_at", null).gt("created_at", since).limit(1),
        db.from("email_messages").select("gmail_thread_id,gmail_message_id,received_at,from_email,body_html").or(`matched_submission_id.eq.${sub.id},from_email.ilike.%${email}%,to_email.ilike.%${email}%`).is("deleted_at", null).order("received_at", { ascending: false }).limit(20),
        db.from("customer_activity_log").select("id").eq("submission_id", sub.id).in("action_type", ["phone_call", "call_logged", "customer_contacted"]).gt("created_at", since).limit(1),
      ]);
      const recentHuman = (messages ?? []).some((m) => m.received_at > since && isHumanContact(m as ThreadMessage, email));
      if ((notes ?? []).length || recentHuman || (activity ?? []).length) { results.push({ id: sub.id, status: "skipped", reason: "recent-contact" }); continue; }

      handled.add(email);
      if (dryRun) { results.push({ id: sub.id, status: "would-send" }); continue; }
      if (sendAttempts >= BATCH_SIZE) break;

      const now = new Date().toISOString();
      const { data: reserved, error: reserveError } = await db.from("reminder_log").insert({ submission_id: sub.id, reminder_type: TYPE, sent_via: "gmail_auto", sent_at: now, attempted_at: now, status: "processing", idempotency_key: idempotency, notes: "Automatic reminder: deed or proof of purchase still needed." }).select("id").maybeSingle();
      if (reserveError?.code === "23505" || !reserved) { results.push({ id: sub.id, status: "skipped", reason: "already-claimed" }); continue; }
      if (reserveError) throw reserveError;
      sendAttempts += 1;

      const subject = `A copy of your deed${sub.cemetery ? ` - ${sub.cemetery}` : ""}`;
      const { html, plain } = buildBody(firstNameOf(sub.name), sub.cemetery);
      const thread = realThread((messages ?? []) as ThreadMessage[]);
      const replyHeaders = await threadHeaders(thread, lovableKey, gmailKey);
      const sent = await gmailSend(mimeMessage({ to: email, subject, plain, html, replyHeaders }), thread?.gmail_thread_id, lovableKey, gmailKey);
      if (!sent.ok) {
        await db.from("reminder_log").update({ status: "failed", error_code: String(sent.status), error_message: sent.text.slice(0, 2000), idempotency_key: [429, 500, 502, 503, 504].includes(sent.status) ? null : idempotency }).eq("id", reserved.id);
        if ([401, 402, 403, 429].includes(sent.status)) {
          await db.from("automation_job_state").update({ status: "paused", pause_reason: `Email provider blocked automatic sends (${sent.status}).`, updated_at: now }).eq("job_name", JOB);
          results.push({ id: sub.id, status: "failed", reason: `provider-${sent.status}` });
          break;
        }
        results.push({ id: sub.id, status: "failed", reason: `provider-${sent.status}` });
        continue;
      }
      const providerId = typeof sent.body.id === "string" ? sent.body.id : `deed-reminder-${sub.id}-${Date.now()}`;
      const providerThread = typeof sent.body.threadId === "string" ? sent.body.threadId : thread?.gmail_thread_id ?? `deed-reminder-${sub.id}`;
      await db.from("email_messages").upsert({ gmail_message_id: providerId, gmail_thread_id: providerThread, from_email: OUR_EMAIL, from_name: "Texas Cemetery Brokers", to_email: email, subject, snippet: "Automatic reminder — deed or proof of purchase still needed.", body_text: plain, body_html: html, received_at: now, matched_submission_id: sub.id, customer_profile_id: sub.customer_profile_id, is_read: true }, { onConflict: "gmail_message_id" });
      await db.from("reminder_log").update({ status: "sent", provider_message_id: providerId, error_code: null, error_message: null }).eq("id", reserved.id);
      await db.from("customer_activity_log").insert({ submission_id: sub.id, customer_profile_id: sub.customer_profile_id, actor_name: "Automatic follow-up", action_type: "auto_followup_sent", action_summary: "Sent the deed reminder.", details: { gmail_message_id: providerId } });
      results.push({ id: sub.id, status: "sent" });
    }
    return respond({ ok: true, dry_run: dryRun, count: results.length, results });
  } catch (error) {
    console.error(JOB, error);
    return respond({ ok: false, error: error instanceof Error ? error.message : String(error), results }, 500);
  } finally {
    if (locked) await db.rpc("release_automation_job", { _job_name: JOB, _run_id: runId, _completed: true });
  }
});
