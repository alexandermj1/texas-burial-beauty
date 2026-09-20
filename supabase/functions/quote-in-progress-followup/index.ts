// Weekday-morning automation: three business days after a seller sent us
// their paperwork, if we
// have not sent their sales price yet and nobody has spoken with them since,
// email a warm holding note saying we are coordinating with the cemetery.
import {
  BATCH_SIZE, OUR_EMAIL, PHONE_HREF, PHONE_LABEL, authorize, brandedEmail, cors, esc,
  firstNameOf, gmailSend, isHumanContact, loadEnv, mimeMessage, ownershipDocCheck, personGuards, realThread, respond,
  threadHeaders, type ThreadMessage,
} from "../_shared/autoFollowup.ts";

const JOB = "quote-in-progress-followup";
const TYPE = "quote_in_progress_followup";
const WAIT_BUSINESS_DAYS = 3;

// Whole business days (Mon–Fri) elapsed between two moments — weekends do
// not count towards the three-day wait.
export function businessDaysElapsed(fromIso: string, toMs: number): number {
  let count = 0;
  const cursor = new Date(fromIso);
  cursor.setHours(0, 0, 0, 0);
  while (cursor.getTime() + 86_400_000 <= toMs) {
    cursor.setTime(cursor.getTime() + 86_400_000);
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

export function buildBody(firstName: string, cemetery: string | null) {
  const mailto = `mailto:${OUR_EMAIL}?subject=${encodeURIComponent(`Question about my property${cemetery ? ` - ${cemetery}` : ""}`)}`;
  const html = brandedEmail({
    eyebrow: "Your valuation is under way",
    preheader: "We are preparing your sales price and confirming details with the cemetery.",
    greeting: `Dear ${firstName},`,
    paragraphs: [
      `Thank you again for sending your paperwork through. I wanted to let you know personally that we are working on your valuation now${cemetery ? ` for your property at <strong>${esc(cemetery)}</strong>` : ""}.`,
      "Our team is in contact with the cemetery to confirm the current details on the property — the section and space, the transfer requirements, and their present pricing. We would rather take a little longer and give you a number we can stand behind than rush one out.",
      "There is nothing you need to do at this stage. As soon as everything is confirmed, we will email you a <strong>proposed minimum sales price</strong> for your review, together with a clear breakdown of the figures. Nothing is final until you have seen it and chosen to accept it.",
    ],
    panel: cemetery ? { label: "Property", value: cemetery, note: "We are confirming the current details and pricing directly with this cemetery." } : undefined,
    callout: {
      label: "Anything you would like to add?",
      body: "If you have any further paperwork, or you remember a detail about the property that may help us, simply reply to this email and it will come straight to us.",
      buttonHref: mailto,
      buttonLabel: "Reply with more details",
    },
    closing: `If you have any questions in the meantime, or would prefer to talk it through, reply to this email or call <a href="${PHONE_HREF}" style="color:#7c3a2e;text-decoration:none;"><strong>${PHONE_LABEL}</strong></a>. We are always happy to help, with no pressure either way.`,
  });
  const plain = [
    `Dear ${firstName},`, "",
    `Thank you again for sending your paperwork through. I wanted to let you know that we are working on your valuation now${cemetery ? ` for your property at ${cemetery}` : ""}.`, "",
    "Our team is in contact with the cemetery to confirm the current details on the property — the section and space, the transfer requirements, and their present pricing. We would rather take a little longer and give you a number we can stand behind than rush one out.", "",
    "There is nothing you need to do at this stage. As soon as everything is confirmed, we will email you a proposed minimum sales price for your review, with a clear breakdown of the figures. Nothing is final until you have seen it and chosen to accept it.", "",
    `If you have any questions in the meantime, reply to this email or call ${PHONE_LABEL}.`, "",
    "Warm regards,", "Alexander James", "Cemetery Salesperson", "Texas Cemetery Brokers",
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
    const raw = mimeMessage({ to: previewEmail, subject: "We are preparing your valuation - Restland Memorial Park", plain, html, replyHeaders: [] });
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
    // Three business days can span at most seven calendar days; the query
    // over-fetches and the per-person check below enforces the real rule.
    const waitCutoff = new Date(nowMs - 7 * 86_400_000).toISOString();
    let query = db.from("contact_submissions")
      .select("id,name,email,cemetery,created_at,customer_profile_id,seller_attachments")
      .is("deleted_at", null).is("archived_at", null).is("closed_at", null).is("sold_at", null)
      .is("quote_sent_at", null).is("document_followup_paused_at", null)
      .not("email", "is", null).lte("created_at", waitCutoff)
      .order("created_at", { ascending: true }).limit(500);
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

      // Three days after we received their paperwork, not counting weekends.
      if (businessDaysElapsed(String(sub.created_at), nowMs) < WAIT_BUSINESS_DAYS) { results.push({ id: sub.id, status: "skipped", reason: "within-three-business-days" }); continue; }

      // Eligible only when they actually sent us something to value.
      let hasAttachment = Array.isArray(sub.seller_attachments) && sub.seller_attachments.length > 0;
      if (!hasAttachment && sub.customer_profile_id) {
        const { data: files } = await db.from("customer_files").select("id").eq("customer_profile_id", sub.customer_profile_id).is("deleted_at", null).limit(1);
        hasAttachment = (files ?? []).length > 0;
      }
      if (!hasAttachment) { results.push({ id: sub.id, status: "skipped", reason: "no-attachment" }); continue; }

      // And only when the AI reader has confirmed one of those files is
      // actually a deed / certificate of ownership — not an ID, a letter or a
      // photo. Anything unread or unrecognised waits rather than being emailed.
      const ownership = await ownershipDocCheck(db, sub.customer_profile_id);
      if (!ownership.ok) { results.push({ id: sub.id, status: "skipped", reason: ownership.reason }); continue; }

      const idempotency = `${TYPE}:${sub.id}`;
      const { data: prior } = await db.from("reminder_log").select("id,sent_at").eq("submission_id", sub.id).eq("reminder_type", TYPE).eq("status", "sent").is("deleted_at", null).order("sent_at", { ascending: false }).limit(1);
      if (prior?.length) { results.push({ id: sub.id, status: "skipped", reason: "already-sent" }); continue; }

      // Never land mid-conversation: any human email, note or logged call since
      // they submitted means a person is already looking after them.
      const since = String(sub.created_at);
      const [{ data: notes }, { data: messages }, { data: activity }] = await Promise.all([
        db.from("customer_notes").select("id").eq("submission_id", sub.id).is("deleted_at", null).gt("created_at", since).limit(1),
        db.from("email_messages").select("gmail_thread_id,gmail_message_id,received_at,from_email,body_html").or(`matched_submission_id.eq.${sub.id},from_email.ilike.%${email}%,to_email.ilike.%${email}%`).is("deleted_at", null).order("received_at", { ascending: false }).limit(20),
        db.from("customer_activity_log").select("id").eq("submission_id", sub.id).in("action_type", ["phone_call", "call_logged", "customer_contacted"]).gt("created_at", since).limit(1),
      ]);
      const recentHuman = (messages ?? []).some((m) => m.received_at > since && isHumanContact(m as ThreadMessage, email));
      if ((notes ?? []).length || recentHuman || (activity ?? []).length) { results.push({ id: sub.id, status: "skipped", reason: "recent-contact" }); continue; }

      handled.add(email);
      if (dryRun) { results.push({ id: sub.id, status: "would-send", reason: ownership.docType }); continue; }
      if (sendAttempts >= BATCH_SIZE) break;

      const now = new Date().toISOString();
      const { data: reserved, error: reserveError } = await db.from("reminder_log").insert({ submission_id: sub.id, reminder_type: TYPE, sent_via: "gmail_auto", sent_at: now, attempted_at: now, status: "processing", idempotency_key: idempotency, notes: "Automatic note: valuation in progress with the cemetery." }).select("id").maybeSingle();
      if (reserveError?.code === "23505" || !reserved) { results.push({ id: sub.id, status: "skipped", reason: "already-claimed" }); continue; }
      if (reserveError) throw reserveError;
      sendAttempts += 1;

      const subject = `We are preparing your valuation${sub.cemetery ? ` - ${sub.cemetery}` : ""}`;
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
      const providerId = typeof sent.body.id === "string" ? sent.body.id : `quote-progress-${sub.id}-${Date.now()}`;
      const providerThread = typeof sent.body.threadId === "string" ? sent.body.threadId : thread?.gmail_thread_id ?? `quote-progress-${sub.id}`;
      await db.from("email_messages").upsert({ gmail_message_id: providerId, gmail_thread_id: providerThread, from_email: OUR_EMAIL, from_name: "Texas Cemetery Brokers", to_email: email, subject, snippet: "Automatic note — valuation in progress with the cemetery.", body_text: plain, body_html: html, received_at: now, matched_submission_id: sub.id, customer_profile_id: sub.customer_profile_id, is_read: true }, { onConflict: "gmail_message_id" });
      await db.from("reminder_log").update({ status: "sent", provider_message_id: providerId, error_code: null, error_message: null }).eq("id", reserved.id);
      await db.from("customer_activity_log").insert({ submission_id: sub.id, customer_profile_id: sub.customer_profile_id, actor_name: "Automatic follow-up", action_type: "auto_followup_sent", action_summary: "Sent the valuation-in-progress note.", details: { gmail_message_id: providerId } });
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
