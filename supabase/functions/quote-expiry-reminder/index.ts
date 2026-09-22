import { createClient } from "npm:@supabase/supabase-js@2.49.4";

// Daily automation: seven days after a minimum authorized sales price is sent
// (and while it is still unanswered), email the seller a polite reminder that
// it expires in three days. Offers are valid for ten days from the sent date.
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const JOB = "quote-expiry-reminder";
const TYPE = "quote_expiry_reminder";
const SITE = "https://www.texascemeterybrokers.com";
const GMAIL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const OUR_EMAIL = "info@texascemeterybrokers.com";
const QUOTE_VALID_DAYS = 10;
const REMIND_AFTER_DAYS = 7;
const BATCH_SIZE = 25;

type ThreadMessage = { gmail_thread_id: string | null; gmail_message_id: string; received_at: string };
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const money = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }) : null;
};
// The sales-price email quotes the headline INCLUSIVE of the cemetery transfer
// fee: per space = stored net + fee, all spaces = net x count + fee (the fee is
// charged once). quote_amount is stored PER SPACE and EXCLUDES the fee, so the
// reminder must rebuild the same two numbers rather than printing it raw.
const quoteLines = (netPerSpace: number, transferFee: number, plotCount: number) => {
  if (!(netPerSpace > 0)) return null;
  const fee = transferFee > 0 ? transferFee : 0;
  const count = Math.max(1, plotCount || 1);
  const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const perSpace = netPerSpace + fee;
  const total = netPerSpace * count + fee;
  return {
    headline: count > 1 ? `${usd(total)} total for all ${count} spaces` : usd(perSpace),
    detail: [
      count > 1 ? `${usd(netPerSpace)} per space before the one-time cemetery transfer fee` : null,
      fee > 0 ? `includes the cemetery's ${usd(fee)} transfer fee, charged once${count > 1 ? " across the whole transfer — not once per space" : ""}` : null,
    ].filter(Boolean).join(" — "),
  };
};
const dayFmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "America/Chicago" });
const b64url = (value: string) => {
  let binary = "";
  new TextEncoder().encode(value).forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const realThread = (messages: ThreadMessage[]) => messages.find((message) => {
  const thread = message.gmail_thread_id;
  return thread && !thread.startsWith("packet-") && !thread.startsWith("ownership-") && !thread.startsWith("local-");
});

export function buildQuoteReminderHtml(firstName: string, cemetery: string | null, quote: { headline: string; detail: string } | null, expiresOn: string, replyTo: string) {
  const mailto = `mailto:${replyTo}?subject=${encodeURIComponent(`Question about my quote${cemetery ? ` - ${cemetery}` : ""}`)}`;
  const priceQuestionMailto = `mailto:${replyTo}?subject=${encodeURIComponent(`This number looks too high or too low${cemetery ? ` - ${cemetery}` : ""}`)}`;
  const amountRow = quote
    ? `<tr><td style="padding:14px 16px;border-bottom:1px solid #f1e6da;"><div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:.22em;color:#a08a76;text-transform:uppercase;margin-bottom:4px;">Minimum authorized sales price</div><div style="font-size:22px;color:#7c3a2e;font-weight:600;">${esc(quote.headline)}</div>${quote.detail ? `<div style="font-family:Arial,sans-serif;font-size:12.5px;line-height:1.6;color:#65594f;margin-top:5px;">${esc(quote.detail)}</div>` : ""}</td></tr>`
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Texas Cemetery Brokers</title></head><body data-tcb-email="auto_followup" style="margin:0;padding:0;background:#f7f3ee;font-family:Georgia,'Times New Roman',serif;color:#1f2937;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your minimum authorized sales price expires in three days.</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ee;padding:32px 16px;"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #ead9c9;border-radius:14px;overflow:hidden;"><tr><td style="padding:28px 32px;border-bottom:1px solid #f1e6da;text-align:center;"><div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:.18em;color:#7c3a2e;font-weight:600;">TEXAS CEMETERY BROKERS</div><div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:.28em;color:#a08a76;margin-top:6px;text-transform:uppercase;">Serving all of Texas</div></td></tr><tr><td style="padding:32px 40px;font-size:15px;line-height:1.7;color:#2d2a26;"><div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:.22em;color:#7c3a2e;text-transform:uppercase;margin:0 0 14px;">Sales price reminder</div><p style="margin:0 0 16px;">Dear ${esc(firstName)},</p><p style="margin:0 0 18px;">I hope you are well. Just a gentle note that the minimum authorized sales price we prepared for you${cemetery ? ` for your property at ${esc(cemetery)}` : ""} remains open for <strong>three more days</strong>, until <strong>${esc(expiresOn)}</strong>.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;border:1px solid #ead9c9;border-radius:8px;background:#faf6f0;overflow:hidden;">${amountRow}<tr><td style="padding:14px 16px;"><div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:.22em;color:#a08a76;text-transform:uppercase;margin-bottom:4px;">Valid until</div><div style="font-size:15px;color:#2d2a26;font-weight:600;">${esc(expiresOn)}</div></td></tr></table><div style="margin:0 0 22px;padding:18px 20px;border:1px solid #ead9c9;border-radius:8px;background:#ffffff;text-align:center;"><div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:.18em;color:#7c3a2e;text-transform:uppercase;margin-bottom:10px;">Not sure about this figure?</div><a href="${esc(priceQuestionMailto)}" style="display:inline-block;padding:13px 22px;background:#7c3a2e;color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;margin-bottom:10px;">Ask us about this number</a><div style="font-size:14px;line-height:1.65;color:#65594f;">Please don't hesitate to speak to our staff. We can make mistakes or miss something, and we're happy to review it with you — no pressure either way.</div></div><div style="margin:0 0 24px;padding:18px 20px;border-left:4px solid #7c3a2e;background:#faf6f0;"><div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:.18em;color:#7c3a2e;text-transform:uppercase;margin-bottom:7px;">Ready to proceed?</div><div style="font-size:15px;line-height:1.65;color:#2d2a26;">Please go back to your <strong>original sales price email</strong> in this conversation and use the acceptance option there. That ensures your acceptance is recorded correctly.</div></div><p style="margin:0 0 20px;">Once accepted, we will prepare your agreement straight away. The whole process takes only a few minutes.</p><p style="margin:0 0 18px;font-family:Arial,sans-serif;font-size:13px;line-height:1.7;color:#65594f;">If you would like to speak with us, have any questions about the amount, or would like us to explain any part of the process, simply <a href="${esc(mailto)}" style="color:#7c3a2e;text-decoration:none;"><strong>reply to this email</strong></a> or call <a href="tel:+12142304740" style="color:#7c3a2e;text-decoration:none;"><strong>(214) 230-4740</strong></a>. We are always happy to help, with no pressure either way.</p><p style="margin:0;font-size:14px;line-height:1.7;color:#2d2a26;">Warm regards,<br><strong>Alexander James</strong><br><span style="font-family:Arial,sans-serif;font-size:12px;color:#8a7766;">Cemetery Salesperson<br>Texas Cemetery Brokers</span></p></td></tr><tr><td style="padding:20px 32px;border-top:1px solid #f1e6da;text-align:center;font-family:Arial,sans-serif;font-size:12px;color:#8a7766;"><a href="${SITE}" style="color:#7c3a2e;text-decoration:none;">www.texascemeterybrokers.com</a><span style="color:#c8b8aa;"> &nbsp;·&nbsp; </span><a href="tel:+12142304740" style="color:#7c3a2e;text-decoration:none;">(214) 230-4740</a></td></tr></table></td></tr></table></body></html>`;
}

const buildPlain = (first: string, cemetery: string | null, quote: { headline: string; detail: string } | null, expiresOn: string) => [
  `Dear ${first},`, "",
  `I hope you are well. Just a gentle note that the minimum authorized sales price we prepared for you${cemetery ? ` for your property at ${cemetery}` : ""} remains open for three more days, until ${expiresOn}.`,
  ...(quote ? ["", `Minimum authorized sales price: ${quote.headline}${quote.detail ? ` (${quote.detail})` : ""}`] : []), "",
  "If this number looks too high or too low, please don't hesitate to speak to our staff. We can make mistakes or miss something, and we're happy to review it with you — no pressure either way.", "",
  "To accept, please go back to the original sales price email in this conversation and use the acceptance option there. This ensures your acceptance is recorded correctly.", "",
  "Once accepted, we will prepare your agreement straight away.", "",
  "If you would like to speak with us, have questions about the amount, or would like us to explain any part of the process, reply to this email or call (214) 230-4740. We are always happy to help, with no pressure either way.", "",
  "Warm regards,", "Alexander James", "Cemetery Salesperson", "Texas Cemetery Brokers",
].join("\n");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const gmailKey = Deno.env.get("GOOGLE_MAIL_API_KEY_1") ?? Deno.env.get("GOOGLE_MAIL_API_KEY");
  if (!url || !serviceKey || !lovableKey || !gmailKey) return respond({ error: "Email automation is not configured" }, 500);

  const db = createClient(url, serviceKey);
  const input = await req.json().catch(() => ({}));
  const dryRun = input?.dry_run === true;
  const onlyId = typeof input?.submission_id === "string" ? input.submission_id : null;
  const previewEmail = typeof input?.preview_email === "string" && input.preview_email.includes("@") ? input.preview_email.trim().toLowerCase() : null;
  const authHeader = req.headers.get("authorization") ?? "";
  const suppliedSecret = req.headers.get("x-automation-secret");
  const { data: jobAuth } = await db.from("automation_job_state").select("trigger_secret").eq("job_name", JOB).maybeSingle();
  let isStaff = false;
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    const { data: authData } = await db.auth.getUser(authHeader.slice(7));
    if (authData.user) {
      const { data: role } = await db.from("user_roles").select("role").eq("user_id", authData.user.id).in("role", ["admin", "staff"]).limit(1).maybeSingle();
      isStaff = Boolean(role);
    }
  }
  const validScheduleSecret = Boolean(suppliedSecret && jobAuth?.trigger_secret && suppliedSecret === jobAuth.trigger_secret);
  const authorized = validScheduleSecret || ((dryRun || previewEmail) && isStaff);
  if (!authorized) return respond({ error: "Unauthorized" }, 401);

  // One-off branded preview for the owner: sends a single sample email.
  if (previewEmail) {
    const sampleExpiry = dayFmt(new Date(Date.now() + 3 * 86_400_000).toISOString());
    const sampleQuote = quoteLines(4_000, 800, 2);
    const html = buildQuoteReminderHtml("Patricia", "Restland Memorial Park", sampleQuote, sampleExpiry, OUR_EMAIL);
    const plain = buildPlain("Patricia", "Restland Memorial Park", sampleQuote, sampleExpiry);
    const raw = [`From: Texas Cemetery Brokers <${OUR_EMAIL}>`, `To: ${previewEmail}`, "Subject: Your minimum authorized sales price expires in 3 days - Restland Memorial Park", "MIME-Version: 1.0", 'Content-Type: multipart/alternative; boundary="tcb-quote"', "", "--tcb-quote", 'Content-Type: text/plain; charset="UTF-8"', "Content-Transfer-Encoding: 8bit", "", plain, "--tcb-quote", 'Content-Type: text/html; charset="UTF-8"', "Content-Transfer-Encoding: 8bit", "", html, "--tcb-quote--"].join("\r\n");
    const sentResponse = await fetch(`${GMAIL}/users/me/messages/send`, { method: "POST", headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": gmailKey, "Content-Type": "application/json" }, body: JSON.stringify({ raw: b64url(raw) }) });
    const responseText = await sentResponse.text();
    if (!sentResponse.ok) return respond({ ok: false, error: `provider-${sentResponse.status}`, details: responseText.slice(0, 1000) }, sentResponse.status);
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
    const remindBefore = new Date(nowMs - REMIND_AFTER_DAYS * 86_400_000).toISOString();
    const quietCutoff = new Date(nowMs - 7 * 86_400_000).toISOString();
    let query = db.from("contact_submissions").select("id,name,email,cemetery,quote_amount,quote_net_amount,transfer_fee_amount,plot_count,spaces,quote_sent_at,quote_expires_at,customer_profile_id")
      .is("deleted_at", null).is("archived_at", null).is("closed_at", null).is("sold_at", null)
      .is("quote_response", null).is("accepted_quote_amount", null).is("quote_responded_at", null)
      .is("document_followup_paused_at", null)
      .not("quote_sent_at", "is", null).lte("quote_sent_at", remindBefore).not("email", "is", null)
      .order("quote_sent_at", { ascending: true }).limit(500);
    if (onlyId) query = query.eq("id", onlyId);
    const { data: submissions, error } = await query;
    if (error) throw error;

    for (const sub of submissions ?? []) {
      const email = String(sub.email ?? "").trim().toLowerCase();
      if (!email.includes("@")) continue;
      const quoteSentAt = String(sub.quote_sent_at);
      // Older sales prices have no stored expiry, and some stored dates have already
      // lapsed. Those people still deserve the reminder, so we give them a fresh
      // three-day window from today and save it back so the record stays truthful.
      const storedExpiry = sub.quote_expires_at ? String(sub.quote_expires_at) : null;
      const storedIsLive = !!storedExpiry && new Date(storedExpiry).getTime() > nowMs;
      const expiresAt = storedIsLive ? (storedExpiry as string) : new Date(nowMs + 3 * 86_400_000).toISOString();
      const needsExpiryWriteback = !storedIsLive;

      // One reminder per quote: the sent timestamp is the idempotency anchor,
      // so a revised quote (new quote_sent_at) may be reminded once again.
      const idempotency = `${TYPE}:${sub.id}:${quoteSentAt}`;
      const { data: prior } = await db.from("reminder_log").select("id,sent_at").eq("submission_id", sub.id).eq("reminder_type", TYPE).eq("status", "sent").is("deleted_at", null).order("sent_at", { ascending: false }).limit(5);
      const lastReminder = prior?.[0]?.sent_at ?? null;
      if (lastReminder && lastReminder >= quoteSentAt) { results.push({ id: sub.id, status: "skipped", reason: "already-reminded" }); continue; }

      // Suppress when there has been any contact since the quote went out or
      // in the last quiet week — they may have replied or spoken with us.
      const since = [quoteSentAt, lastReminder, quietCutoff].filter(Boolean).sort().at(-1) as string;
      const [{ data: notes }, { data: messages }, { data: activity }] = await Promise.all([
        db.from("customer_notes").select("id").eq("submission_id", sub.id).is("deleted_at", null).gt("created_at", since).limit(1),
        db.from("email_messages").select("gmail_thread_id,gmail_message_id,received_at").or(`matched_submission_id.eq.${sub.id},from_email.ilike.%${email}%,to_email.ilike.%${email}%`).is("deleted_at", null).order("received_at", { ascending: false }).limit(20),
        db.from("customer_activity_log").select("id").eq("submission_id", sub.id).in("action_type", ["phone_call", "call_logged", "customer_contacted"]).gt("created_at", since).limit(1),
      ]);
      const recentEmail = (messages ?? []).some((message) => message.received_at > since);
      if ((notes ?? []).length || recentEmail || (activity ?? []).length) { results.push({ id: sub.id, status: "skipped", reason: "recent-contact" }); continue; }

      if (dryRun) { results.push({ id: sub.id, status: "would-send" }); continue; }
      if (sendAttempts >= BATCH_SIZE) break;
      const now = new Date().toISOString();
      const { data: reserved, error: reserveError } = await db.from("reminder_log").insert({ submission_id: sub.id, reminder_type: TYPE, sent_via: "gmail_auto", sent_at: now, attempted_at: now, status: "processing", idempotency_key: idempotency, notes: "Automatic quote-expiry reminder (3 days left)." }).select("id").maybeSingle();
      if (reserveError?.code === "23505" || !reserved) { results.push({ id: sub.id, status: "skipped", reason: "already-claimed" }); continue; }
      if (reserveError) throw reserveError;
      sendAttempts += 1;

      const first = String(sub.name ?? "").trim().split(/\s+/)[0] || "there";
      // quote_amount is the final number saved and shown in the sent sales-price email.
      // quote_net_amount is retained only as a fallback for older records.
      const netPerSpace = Number(sub.quote_amount) || Number(sub.quote_net_amount) || 0;
      const quote = quoteLines(netPerSpace, Number(sub.transfer_fee_amount) || 0, Math.max(1, Number(sub.plot_count ?? sub.spaces) || 1));
      const expiresOn = dayFmt(expiresAt);
      const subject = `Your minimum authorized sales price expires in 3 days${sub.cemetery ? ` - ${sub.cemetery}` : ""}`;
      const html = buildQuoteReminderHtml(first, sub.cemetery, quote, expiresOn, OUR_EMAIL);
      const plain = buildPlain(first, sub.cemetery, quote, expiresOn);
      const thread = realThread((messages ?? []) as ThreadMessage[]);
      let replyHeaders: string[] = [];
      if (thread) {
        const metadata = await fetch(`${GMAIL}/users/me/messages/${thread.gmail_message_id}?format=metadata&metadataHeaders=Message-Id&metadataHeaders=References`, { headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": gmailKey } });
        if (metadata.ok) {
          const body = await metadata.json();
          const headers = (body.payload?.headers ?? []) as { name: string; value: string }[];
          const messageId = headers.find((h) => h.name.toLowerCase() === "message-id")?.value;
          const refs = headers.find((h) => h.name.toLowerCase() === "references")?.value;
          if (messageId) replyHeaders = [`In-Reply-To: ${messageId}`, `References: ${refs ? `${refs} ` : ""}${messageId}`];
        }
      }
      const raw = [`From: Texas Cemetery Brokers <${OUR_EMAIL}>`, `To: ${email}`, `Subject: ${subject}`, ...replyHeaders, "MIME-Version: 1.0", 'Content-Type: multipart/alternative; boundary="tcb-quote"', "", "--tcb-quote", 'Content-Type: text/plain; charset="UTF-8"', "Content-Transfer-Encoding: 8bit", "", plain, "--tcb-quote", 'Content-Type: text/html; charset="UTF-8"', "Content-Transfer-Encoding: 8bit", "", html, "--tcb-quote--"].join("\r\n");
      const send = (threadId?: string) => fetch(`${GMAIL}/users/me/messages/send`, { method: "POST", headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": gmailKey, "Content-Type": "application/json" }, body: JSON.stringify({ raw: b64url(raw), ...(threadId ? { threadId } : {}) }) });
      let sentResponse = await send(thread?.gmail_thread_id);
      // A stale conversation id makes Gmail answer 404 — send as a new message instead.
      if (!sentResponse.ok && sentResponse.status === 404 && thread?.gmail_thread_id) sentResponse = await send();
      const responseText = await sentResponse.text();
      let sent: Record<string, unknown> = {};
      try { sent = JSON.parse(responseText); } catch { /* provider text is retained below */ }
      if (!sentResponse.ok) {
        await db.from("reminder_log").update({ status: "failed", error_code: String(sentResponse.status), error_message: responseText.slice(0, 2000), idempotency_key: [429, 500, 502, 503, 504].includes(sentResponse.status) ? null : idempotency }).eq("id", reserved.id);
        if ([401, 402, 403, 429].includes(sentResponse.status)) await db.from("automation_job_state").update({ status: "paused", pause_reason: `Email provider blocked automatic sends (${sentResponse.status}).`, updated_at: now }).eq("job_name", JOB);
        results.push({ id: sub.id, status: "failed", reason: `provider-${sentResponse.status}` });
        if ([401, 402, 403, 429].includes(sentResponse.status)) break;
        continue;
      }
      const providerId = typeof sent.id === "string" ? sent.id : `quote-reminder-${sub.id}-${Date.now()}`;
      const providerThread = typeof sent.threadId === "string" ? sent.threadId : thread?.gmail_thread_id ?? `quote-reminder-${sub.id}`;
      await db.from("email_messages").upsert({ gmail_message_id: providerId, gmail_thread_id: providerThread, from_email: OUR_EMAIL, from_name: "Texas Cemetery Brokers", to_email: email, subject, snippet: "Automatic quote-expiry reminder — 3 days left.", body_text: plain, body_html: html, received_at: now, matched_submission_id: sub.id, customer_profile_id: sub.customer_profile_id, is_read: true }, { onConflict: "gmail_message_id" });
      await db.from("reminder_log").update({ status: "sent", provider_message_id: providerId, error_code: null, error_message: null }).eq("id", reserved.id);
      await db.from("customer_activity_log").insert({ submission_id: sub.id, customer_profile_id: sub.customer_profile_id, actor_name: "Automatic follow-up", action_type: "auto_followup_sent", action_summary: "Sent a quote-expiry reminder (3 days left).", details: { quote_sent_at: quoteSentAt, expires_at: expiresAt, gmail_message_id: providerId } });
      if (needsExpiryWriteback) await db.from("contact_submissions").update({ quote_expires_at: expiresAt }).eq("id", sub.id);
      results.push({ id: sub.id, status: "sent" });
    }
    return respond({ ok: true, dry_run: dryRun, count: results.length, results });
  } catch (error) {
    console.error("quote-expiry-reminder", error);
    return respond({ ok: false, error: error instanceof Error ? error.message : String(error), results }, 500);
  } finally {
    if (locked) await db.rpc("release_automation_job", { _job_name: JOB, _run_id: runId, _completed: true });
  }
});
