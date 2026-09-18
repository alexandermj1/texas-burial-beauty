import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const JOB = "document-request-followup";
const TYPE = "document_request_auto_followup";
const SITE = "https://www.texascemeterybrokers.com";
const GMAIL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const OUR_EMAIL = "info@texascemeterybrokers.com";
const DONE = new Set(["received", "notarized", "complete", "not_needed", "not_required", "waived"]);
const HIDDEN = new Set(["REVIEW", "NOTE", "LA"]);

type Missing = { label: string; person_name: string | null };
type ThreadMessage = { gmail_thread_id: string | null; gmail_message_id: string; received_at: string };
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const itemText = (item: Missing) => item.person_name ? `${item.label} — ${item.person_name}` : item.label;
const b64url = (value: string) => {
  let binary = "";
  new TextEncoder().encode(value).forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const realThread = (messages: ThreadMessage[]) => messages.find((message) => {
  const thread = message.gmail_thread_id;
  return thread && !thread.startsWith("packet-") && !thread.startsWith("ownership-") && !thread.startsWith("local-");
});

export function buildReminderHtml(firstName: string, cemetery: string | null, items: Missing[], link: string) {
  const rows = items.map((item) => `<tr><td style="padding:9px 0;border-bottom:1px solid #eee7dc;font:14px/1.45 Arial,sans-serif;color:#1f2a37"><span style="color:#9a7b4f;padding-right:9px">•</span>${esc(itemText(item))}</td></tr>`).join("");
  return `<!doctype html><html><body data-tcb-email="auto_followup" style="margin:0;background:#f5f1ea;color:#1f2a37"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(31,42,55,.08)"><tr><td style="background:#1f2a37;color:#fff;padding:32px 40px;text-align:center"><div style="font:11px Arial,sans-serif;letter-spacing:4px;text-transform:uppercase;color:#d9c7a3">Texas Cemetery Brokers</div><div style="font:22px Georgia,serif;margin-top:10px">A gentle document reminder</div></td></tr><tr><td style="padding:32px 40px;font:15px/1.7 Georgia,serif"><p style="margin:0 0 16px">Dear ${esc(firstName)},</p><p style="margin:0 0 18px">We hope you are well. We are getting your file ready so we can move quickly when we find the right buyer${cemetery ? ` for your property at ${esc(cemetery)}` : ""}.</p><p style="margin:0 0 12px">When convenient, could you please help us with the following outstanding ${items.length === 1 ? "item" : "items"}?</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-top:1px solid #eee7dc">${rows}</table><table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 22px"><tr><td style="background:#1f2a37;border-radius:8px"><a href="${esc(link)}" style="display:inline-block;padding:15px 34px;color:#fff;text-decoration:none;font:16px Georgia,serif">Open your document page →</a></td></tr></table><p style="margin:0;font:13px/1.6 Arial,sans-serif;color:#4a5568">If you have already sent something, or you have spoken with us about it, please reply to this email or call <strong>(214) 230-4740</strong>. We will update your file straight away.</p><p style="margin:22px 0 0;font:13px/1.6 Arial,sans-serif;color:#4a5568">Warm regards,<br><strong>Texas Cemetery Brokers</strong></p></td></tr><tr><td style="background:#1f2a37;padding:22px 40px;text-align:center"><div style="font:11px Arial,sans-serif;letter-spacing:4px;text-transform:uppercase;color:#d9c7a3">Texas Cemetery Brokers</div><div style="font:12px Arial,sans-serif;color:#a9b4c2;margin-top:8px">(214) 230-4740 · info@texascemeterybrokers.com · texascemeterybrokers.com</div></td></tr></table></td></tr></table></body></html>`;
}

const buildPlain = (first: string, cemetery: string | null, items: Missing[], link: string) => [
  `Dear ${first},`, "", `We hope you are well. We are getting your file ready so we can move quickly when we find the right buyer${cemetery ? ` for your property at ${cemetery}` : ""}.`, "",
  "When convenient, could you please help us with the following outstanding items?", ...items.map((item) => `• ${itemText(item)}`), "", `Open your document page: ${link}`, "",
  "If you have already sent something, or you have spoken with us about it, please reply or call (214) 230-4740. We will update your file straight away.", "", "Warm regards,", "Texas Cemetery Brokers",
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
  const runId = crypto.randomUUID();
  let locked = false;
  const results: { id: string; status: string; reason?: string; items?: string[] }[] = [];
  try {
    if (!dryRun) {
      const { data: claimed, error } = await db.rpc("claim_automation_job", { _job_name: JOB, _run_id: runId, _lease_seconds: 900 });
      if (error) throw error;
      if (!claimed) return respond({ ok: true, skipped: "paused-or-already-running", results });
      locked = true;
    }
    const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
    let query = db.from("contact_submissions").select("id,name,email,cemetery,documents_requested_at,customer_profile_id,document_followup_paused_at")
      .is("deleted_at", null).is("archived_at", null).is("closed_at", null).is("sold_at", null).is("documents_completed_at", null)
      .is("document_followup_paused_at", null).not("documents_requested_at", "is", null).lte("documents_requested_at", cutoff).not("email", "is", null)
      .order("documents_requested_at", { ascending: true }).limit(25);
    if (onlyId) query = query.eq("id", onlyId);
    const { data: submissions, error } = await query;
    if (error) throw error;

    for (const sub of submissions ?? []) {
      const email = String(sub.email ?? "").trim().toLowerCase();
      if (!email.includes("@")) continue;
      const { data: docs, error: docsError } = await db.from("submission_documents")
        .select("doc_code,label,person_name,status,required_state,manual_override,file_url,file_urls")
        .eq("submission_id", sub.id).is("deleted_at", null).order("sort_order", { ascending: true });
      if (docsError) throw docsError;
      const missing: Missing[] = (docs ?? []).filter((doc) => {
        const state = String(doc.manual_override ?? doc.status ?? doc.required_state ?? "").toLowerCase();
        const files = (Array.isArray(doc.file_urls) ? doc.file_urls.length : 0) + (doc.file_url ? 1 : 0);
        return !HIDDEN.has(String(doc.doc_code ?? "")) && !DONE.has(state) && files === 0;
      }).map((doc) => ({ label: doc.label, person_name: doc.person_name }));
      if (!missing.length) { results.push({ id: sub.id, status: "skipped", reason: "nothing-outstanding" }); continue; }

      const { data: prior } = await db.from("reminder_log").select("sent_at").eq("submission_id", sub.id).eq("reminder_type", TYPE).eq("status", "sent").is("deleted_at", null).order("sent_at", { ascending: false }).limit(1);
      const lastReminder = prior?.[0]?.sent_at ?? null;
      if (lastReminder && lastReminder > cutoff) { results.push({ id: sub.id, status: "skipped", reason: "reminded-recently" }); continue; }
      // A conversation should suppress a reminder for the current quiet week,
      // not forever. For a newly sent request, the request time is the anchor;
      // for older files, only contact in the last seven days blocks this run.
      const since = [sub.documents_requested_at, lastReminder, cutoff].filter(Boolean).sort().at(-1) as string;
      const [{ data: notes }, { data: messages }, { data: activity }] = await Promise.all([
        db.from("customer_notes").select("id").eq("submission_id", sub.id).is("deleted_at", null).gt("created_at", since).limit(1),
        db.from("email_messages").select("gmail_thread_id,gmail_message_id,received_at").or(`matched_submission_id.eq.${sub.id},from_email.ilike.%${email}%,to_email.ilike.%${email}%`).is("deleted_at", null).order("received_at", { ascending: false }).limit(20),
        db.from("customer_activity_log").select("id").eq("submission_id", sub.id).in("action_type", ["phone_call", "call_logged", "customer_contacted"]).gt("created_at", since).limit(1),
      ]);
      const recentEmail = (messages ?? []).some((message) => message.received_at > since);
      if ((notes ?? []).length || recentEmail || (activity ?? []).length) { results.push({ id: sub.id, status: "skipped", reason: "recent-contact" }); continue; }

      const idempotency = `${TYPE}:${sub.id}:${lastReminder ?? sub.documents_requested_at}`;
      if (dryRun) { results.push({ id: sub.id, status: "would-send", items: missing.map(itemText) }); continue; }
      const now = new Date().toISOString();
      const { data: reserved, error: reserveError } = await db.from("reminder_log").insert({ submission_id: sub.id, reminder_type: TYPE, sent_via: "gmail_auto", sent_at: now, attempted_at: now, status: "processing", idempotency_key: idempotency, missing_items: missing, notes: `Automatic follow-up for ${missing.length} outstanding item(s).` }).select("id").maybeSingle();
      if (reserveError?.code === "23505" || !reserved) { results.push({ id: sub.id, status: "skipped", reason: "already-claimed" }); continue; }
      if (reserveError) throw reserveError;

      const first = String(sub.name ?? "").trim().split(/\s+/)[0] || "there";
      const link = `${SITE}/documents?s=${sub.id}`;
      const subject = `A gentle reminder about your documents${sub.cemetery ? ` — ${sub.cemetery}` : ""}`;
      const html = buildReminderHtml(first, sub.cemetery, missing, link);
      const plain = buildPlain(first, sub.cemetery, missing, link);
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
      const raw = [`From: Texas Cemetery Brokers <${OUR_EMAIL}>`, `To: ${email}`, `Subject: ${subject}`, ...replyHeaders, "MIME-Version: 1.0", 'Content-Type: multipart/alternative; boundary="tcb-followup"', "", "--tcb-followup", 'Content-Type: text/plain; charset="UTF-8"', "", plain, "--tcb-followup", 'Content-Type: text/html; charset="UTF-8"', "", html, "--tcb-followup--"].join("\r\n");
      const sentResponse = await fetch(`${GMAIL}/users/me/messages/send`, { method: "POST", headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": gmailKey, "Content-Type": "application/json" }, body: JSON.stringify({ raw: b64url(raw), ...(thread?.gmail_thread_id ? { threadId: thread.gmail_thread_id } : {}) }) });
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
      const providerId = typeof sent.id === "string" ? sent.id : `auto-followup-${sub.id}-${Date.now()}`;
      const providerThread = typeof sent.threadId === "string" ? sent.threadId : thread?.gmail_thread_id ?? `auto-followup-${sub.id}`;
      await db.from("email_messages").upsert({ gmail_message_id: providerId, gmail_thread_id: providerThread, from_email: OUR_EMAIL, from_name: "Texas Cemetery Brokers", to_email: email, subject, snippet: `Automatic document follow-up — ${missing.length} outstanding.`, body_text: plain, body_html: html, received_at: now, matched_submission_id: sub.id, customer_profile_id: sub.customer_profile_id, is_read: true }, { onConflict: "gmail_message_id" });
      await db.from("reminder_log").update({ status: "sent", provider_message_id: providerId, error_code: null, error_message: null }).eq("id", reserved.id);
      await db.from("customer_activity_log").insert({ submission_id: sub.id, customer_profile_id: sub.customer_profile_id, actor_name: "Automatic follow-up", action_type: "auto_followup_sent", action_summary: `Sent a document follow-up for ${missing.length} outstanding item(s).`, details: { missing_items: missing, gmail_message_id: providerId } });
      results.push({ id: sub.id, status: "sent", items: missing.map(itemText) });
    }
    return respond({ ok: true, dry_run: dryRun, count: results.length, results });
  } catch (error) {
    console.error("document-request-followup", error);
    return respond({ ok: false, error: error instanceof Error ? error.message : String(error), results }, 500);
  } finally {
    if (locked) await db.rpc("release_automation_job", { _job_name: JOB, _run_id: runId, _completed: true });
  }
});