// Shared plumbing for the automatic seller follow-up emails.
// Every automatic email uses the same branded shell, the same Gmail threading,
// the same reminder_log idempotency and the same "don't land mid-conversation"
// suppression rule, so the seller never receives a robotic-feeling message.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.49.4";

export const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
export const SITE = "https://www.texascemeterybrokers.com";
export const GMAIL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
export const OUR_EMAIL = "info@texascemeterybrokers.com";
export const PHONE_HREF = "tel:+12142304740";
export const PHONE_LABEL = "(214) 230-4740";
export const BATCH_SIZE = 25;

export const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

export const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export const firstNameOf = (name: unknown) => String(name ?? "").trim().split(/\s+/)[0] || "there";

export const b64url = (value: string) => {
  let binary = "";
  new TextEncoder().encode(value).forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export type ThreadMessage = {
  gmail_thread_id: string | null;
  gmail_message_id: string;
  received_at: string;
  from_email?: string | null;
  body_html?: string | null;
};

// Gmail conversations only: locally-minted ids (packets, ownership links) are
// not real threads and must not be passed back to Gmail.
export const realThread = (messages: ThreadMessage[]) => messages.find((message) => {
  const thread = message.gmail_thread_id;
  return thread && !thread.startsWith("packet-") && !thread.startsWith("ownership-") && !thread.startsWith("local-");
});

// A message counts as real contact when the seller wrote to us, or when a person
// here wrote to them. Our own automatic emails carry the auto marker and are
// ignored, otherwise one automatic email would silence every later one.
export const isHumanContact = (message: ThreadMessage, sellerEmail: string) => {
  const from = String(message.from_email ?? "").trim().toLowerCase();
  if (from.includes(sellerEmail)) return true;
  const html = String(message.body_html ?? "");
  return !/data-tcb-email="auto/i.test(html) && !/X-TCB-Auto/i.test(html);
};

export const brandedEmail = (opts: {
  eyebrow: string;
  preheader: string;
  greeting: string;
  paragraphs: string[];
  panel?: { label: string; value: string; note?: string };
  callout?: { label: string; body: string; buttonHref?: string; buttonLabel?: string };
  closing: string;
}) => {
  const paragraphs = opts.paragraphs.map((p) => `<p style="margin:0 0 16px;">${p}</p>`).join("");
  const panel = opts.panel
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;border:1px solid #ead9c9;border-radius:8px;background:#faf6f0;overflow:hidden;"><tr><td style="padding:14px 16px;"><div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:.22em;color:#a08a76;text-transform:uppercase;margin-bottom:4px;">${esc(opts.panel.label)}</div><div style="font-size:16px;color:#2d2a26;font-weight:600;">${esc(opts.panel.value)}</div>${opts.panel.note ? `<div style="font-family:Arial,sans-serif;font-size:12.5px;line-height:1.6;color:#65594f;margin-top:5px;">${esc(opts.panel.note)}</div>` : ""}</td></tr></table>`
    : "";
  const callout = opts.callout
    ? `<div style="margin:0 0 24px;padding:18px 20px;border-left:4px solid #7c3a2e;background:#faf6f0;"><div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:.18em;color:#7c3a2e;text-transform:uppercase;margin-bottom:7px;">${esc(opts.callout.label)}</div><div style="font-size:15px;line-height:1.65;color:#2d2a26;">${opts.callout.body}</div>${opts.callout.buttonHref ? `<div style="margin-top:14px;"><a href="${esc(opts.callout.buttonHref)}" style="display:inline-block;padding:13px 22px;background:#7c3a2e;color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">${esc(opts.callout.buttonLabel ?? "Reply to this email")}</a></div>` : ""}</div>`
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Texas Cemetery Brokers</title></head><body data-tcb-email="auto_followup" style="margin:0;padding:0;background:#f7f3ee;font-family:Georgia,'Times New Roman',serif;color:#1f2937;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ee;padding:32px 16px;"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #ead9c9;border-radius:14px;overflow:hidden;"><tr><td style="padding:28px 32px;border-bottom:1px solid #f1e6da;text-align:center;"><div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:.18em;color:#7c3a2e;font-weight:600;">TEXAS CEMETERY BROKERS</div><div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:.28em;color:#a08a76;margin-top:6px;text-transform:uppercase;">Serving all of Texas</div></td></tr><tr><td style="padding:32px 40px;font-size:15px;line-height:1.7;color:#2d2a26;"><div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:.22em;color:#7c3a2e;text-transform:uppercase;margin:0 0 14px;">${esc(opts.eyebrow)}</div><p style="margin:0 0 16px;">${esc(opts.greeting)}</p>${paragraphs}${panel}${callout}<p style="margin:0 0 18px;font-family:Arial,sans-serif;font-size:13px;line-height:1.7;color:#65594f;">${opts.closing}</p><p style="margin:0;font-size:14px;line-height:1.7;color:#2d2a26;">Warm regards,<br><strong>Alexander James</strong><br><span style="font-family:Arial,sans-serif;font-size:12px;color:#8a7766;">Cemetery Salesperson<br>Texas Cemetery Brokers</span></p></td></tr><tr><td style="padding:20px 32px;border-top:1px solid #f1e6da;text-align:center;font-family:Arial,sans-serif;font-size:12px;color:#8a7766;"><a href="${SITE}" style="color:#7c3a2e;text-decoration:none;">www.texascemeterybrokers.com</a><span style="color:#c8b8aa;"> &nbsp;·&nbsp; </span><a href="${PHONE_HREF}" style="color:#7c3a2e;text-decoration:none;">${PHONE_LABEL}</a></td></tr></table></td></tr></table></body></html>`;
};

export const mimeMessage = (opts: { to: string; subject: string; plain: string; html: string; replyHeaders: string[] }) =>
  [
    `From: Texas Cemetery Brokers <${OUR_EMAIL}>`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    ...opts.replyHeaders,
    "X-TCB-Auto: followup",
    "MIME-Version: 1.0",
    'Content-Type: multipart/alternative; boundary="tcb-auto"',
    "", "--tcb-auto", 'Content-Type: text/plain; charset="UTF-8"', "Content-Transfer-Encoding: 8bit", "", opts.plain,
    "--tcb-auto", 'Content-Type: text/html; charset="UTF-8"', "Content-Transfer-Encoding: 8bit", "", opts.html,
    "--tcb-auto--",
  ].join("\r\n");

export const threadHeaders = async (thread: ThreadMessage | undefined, lovableKey: string, gmailKey: string) => {
  if (!thread) return [] as string[];
  const metadata = await fetch(`${GMAIL}/users/me/messages/${thread.gmail_message_id}?format=metadata&metadataHeaders=Message-Id&metadataHeaders=References`, {
    headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": gmailKey },
  });
  if (!metadata.ok) return [];
  const body = await metadata.json();
  const headers = (body.payload?.headers ?? []) as { name: string; value: string }[];
  const messageId = headers.find((h) => h.name.toLowerCase() === "message-id")?.value;
  const refs = headers.find((h) => h.name.toLowerCase() === "references")?.value;
  return messageId ? [`In-Reply-To: ${messageId}`, `References: ${refs ? `${refs} ` : ""}${messageId}`] : [];
};

export const gmailSend = async (raw: string, threadId: string | null | undefined, lovableKey: string, gmailKey: string) => {
  const send = (id?: string | null) => fetch(`${GMAIL}/users/me/messages/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": gmailKey, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: b64url(raw), ...(id ? { threadId: id } : {}) }),
  });
  let response = await send(threadId);
  // A stale conversation id makes Gmail answer 404 — send as a new message instead.
  if (!response.ok && response.status === 404 && threadId) response = await send();
  const text = await response.text();
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(text); } catch { /* provider text retained by the caller */ }
  return { ok: response.ok, status: response.status, text, body: parsed };
};

export type Env = { db: SupabaseClient; lovableKey: string; gmailKey: string };

export const loadEnv = (): Env | null => {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const gmailKey = Deno.env.get("GOOGLE_MAIL_API_KEY_1") ?? Deno.env.get("GOOGLE_MAIL_API_KEY");
  if (!url || !serviceKey || !lovableKey || !gmailKey) return null;
  return { db: createClient(url, serviceKey), lovableKey, gmailKey };
};

// Only the scheduler (shared secret) may send. Staff may run dry-runs and
// branded previews of the template.
export const authorize = async (db: SupabaseClient, req: Request, job: string, allowStaff: boolean) => {
  const suppliedSecret = req.headers.get("x-automation-secret");
  const { data: jobAuth } = await db.from("automation_job_state").select("trigger_secret").eq("job_name", job).maybeSingle();
  if (suppliedSecret && jobAuth?.trigger_secret && suppliedSecret === jobAuth.trigger_secret) return true;
  if (!allowStaff) return false;
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return false;
  const { data: authData } = await db.auth.getUser(authHeader.slice(7));
  if (!authData.user) return false;
  const { data: role } = await db.from("user_roles").select("role").eq("user_id", authData.user.id).in("role", ["admin", "staff"]).limit(1).maybeSingle();
  return Boolean(role);
};

// One person, one email. Sellers often submit the form several times, so the
// pipeline treats one email address as one person. These guards mirror that:
// nobody is written to twice, and nobody is written to when any of their other
// submissions has already moved past this point.
export type PersonGuards = {
  advanced: Set<string>;   // emails that already have a quote / acceptance / sale somewhere
  emailed: Set<string>;    // emails that already received this particular automatic email
  emailOf: Map<string, string>;
};

export const personGuards = async (db: SupabaseClient, type: string): Promise<PersonGuards> => {
  const advanced = new Set<string>();
  const emailed = new Set<string>();
  const emailOf = new Map<string, string>();

  const { data: all } = await db.from("contact_submissions")
    .select("id,email,quote_sent_at,quote_response,closed_at,sold_at,archived_at")
    .is("deleted_at", null).limit(5000);
  for (const row of all ?? []) {
    const email = String(row.email ?? "").trim().toLowerCase();
    if (!email.includes("@")) continue;
    emailOf.set(row.id as string, email);
    if (row.quote_sent_at || row.quote_response === "accepted" || row.closed_at || row.sold_at || row.archived_at) advanced.add(email);
  }

  const { data: logs } = await db.from("reminder_log")
    .select("submission_id").eq("reminder_type", type).in("status", ["sent", "processing"])
    .is("deleted_at", null).limit(5000);
  for (const log of logs ?? []) {
    const email = emailOf.get(log.submission_id as string);
    if (email) emailed.add(email);
  }
  return { advanced, emailed, emailOf };
};
